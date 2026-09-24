import {
  documentTotals,
  minorToEuros,
  multiplyMoney,
  percentOf,
  toMinorUnits,
} from '@bautakt/finance';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/** Belegarten, die der Editor anlegen kann. */
export type EditableDocumentType = 'quote' | 'invoice';

/** Positionsarten laut Datenbank-Constraint. */
export const LINE_KINDS = ['labor', 'material', 'other', 'text'] as const;
export type LineKind = (typeof LINE_KINDS)[number];

export type EditorLine = {
  /** Nur im Formular, nicht in der Datenbank. */
  key: string;
  title: string;
  description: string;
  kind: LineKind;
  /** Rohtext aus dem Feld — umgerechnet wird erst beim Speichern. */
  quantity: string;
  unit: string;
  unitPrice: string;
  discountPercent: string;
  taxRatePercent: string;
};

export type EditorState = {
  type: EditableDocumentType;
  customerId: string | null;
  issueDate: string;
  serviceDate: string;
  dueDate: string;
  introText: string;
  footerText: string;
  notes: string;
  lines: EditorLine[];
};

/** Deutsche Zahl („1.234,56") als Zahl; Unlesbares wird 0. */
export function parseNumber(value: string): number {
  const normalized = value.trim().replace(/\s/g, '');
  if (!normalized) return 0;
  const parsed = Number(
    normalized.includes(',') ? normalized.replace(/\./g, '').replace(',', '.') : normalized,
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Nettobetrag einer Position in Cent.
 *
 * Menge mal Einzelpreis, dann der Rabatt — in dieser Reihenfolge und einmal
 * gerundet. Ein Rabatt je Einheit gerechnet weicht bei krummen Mengen um Cent
 * ab, und die Summe der Positionen ergaebe dann nicht mehr den Beleg.
 */
export function lineNetMinor(line: EditorLine): number {
  const gross = multiplyMoney(
    toMinorUnits(parseNumber(line.unitPrice)),
    parseNumber(line.quantity),
  );
  const discount = percentOf(gross, parseNumber(line.discountPercent));
  return gross - discount;
}

/** Summen des Belegs aus den Positionen — dieselbe Regel wie in der App. */
export function editorTotals(lines: EditorLine[]) {
  return documentTotals(
    lines
      // Textzeilen tragen keinen Betrag: sie gliedern den Beleg.
      .filter((line) => line.kind !== 'text')
      .map((line) => ({
        netMinor: lineNetMinor(line),
        taxRatePercent: parseNumber(line.taxRatePercent),
      })),
  );
}

export function emptyLine(taxRatePercent = '19'): EditorLine {
  return {
    key: crypto.randomUUID(),
    title: '',
    description: '',
    kind: 'labor',
    quantity: '1',
    unit: 'Std.',
    unitPrice: '',
    discountPercent: '0',
    taxRatePercent,
  };
}

/**
 * Entwurf speichern — anlegen oder ueberschreiben.
 *
 * ⚠️ Nur Entwuerfe. Ein festgeschriebener Beleg ist durch
 * `enforce_sales_document_immutability` in der Datenbank gesperrt; der Editor
 * bietet ihn deshalb gar nicht erst zum Bearbeiten an.
 *
 * Die Positionen werden beim Speichern ersetzt statt einzeln abgeglichen: eine
 * Positionsliste ist kurz, und ein Abgleich brauchte stabile Zeilen-Ids, die
 * das Formular nicht hat. Beleg und Positionen haengen am selben
 * `document_id` — die Zeilen verschwinden mit dem Beleg.
 */
export function useSaveDraft(documentId?: string) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (state: EditorState): Promise<string> => {
      const totals = editorTotals(state.lines);

      const header = {
        company_id: companyId!,
        type: state.type,
        status: 'draft',
        customer_id: state.customerId,
        issue_date: state.issueDate || null,
        service_date: state.serviceDate || null,
        due_date: state.dueDate || null,
        intro_text: state.introText,
        footer_text: state.footerText,
        notes: state.notes,
        net_total: minorToEuros(totals.netMinor),
        vat_total: minorToEuros(totals.vatMinor),
        gross_total: minorToEuros(totals.grossMinor),
      };

      let id = documentId;

      if (id) {
        const { error } = await supabase
          .from('sales_documents')
          .update(header)
          .eq('id', id)
          .eq('company_id', companyId!);
        if (error) throw error;

        const { error: deleteError } = await supabase
          .from('sales_document_lines')
          .delete()
          .eq('document_id', id)
          .eq('company_id', companyId!);
        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase
          .from('sales_documents')
          .insert(header)
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      }

      const lines = state.lines
        .filter((line) => line.title.trim() || line.description.trim())
        .map((line, index) => ({
          company_id: companyId!,
          document_id: id!,
          sort_order: index,
          kind: line.kind,
          title: line.title.trim(),
          description: line.description.trim(),
          quantity: parseNumber(line.quantity),
          unit: line.unit.trim(),
          unit_price: parseNumber(line.unitPrice),
          discount_percent: parseNumber(line.discountPercent),
          tax_rate_percent: line.kind === 'text' ? 0 : parseNumber(line.taxRatePercent),
          net_amount: line.kind === 'text' ? 0 : minorToEuros(lineNetMinor(line)),
        }));

      if (lines.length > 0) {
        const { error } = await supabase.from('sales_document_lines').insert(lines);
        if (error) throw error;
      }

      return id!;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-document', companyId, id] });
    },
  });
}
