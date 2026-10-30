import {
  documentTotals,
  formatIsoDateDe,
  formatMoney,
  minorToEuros,
  multiplyMoney,
  percentOf,
  type TaxMode,
  taxModeChargesVat,
  toMinorUnits,
} from '@bautakt/finance';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { netMinutes } from '@/features/times/timeTotals';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

import type { TermFields } from './customerTerms';

/**
 * Rechnungsarten, die der Editor anlegen kann. Gutschrift kommt mit #78.
 * Stornos entstehen nur über `cancel_sales_document`, nie im Editor.
 */
export const INVOICE_EDITOR_TYPES = ['invoice', 'partial_invoice', 'final_invoice'] as const;
export type InvoiceEditorType = (typeof INVOICE_EDITOR_TYPES)[number];

/**
 * Belegarten, die der Editor anlegen kann. Die Gutschrift entsteht nur aus
 * einer Rechnung („Gutschrift erstellen“), nie über die Typauswahl.
 */
export type EditableDocumentType = 'quote' | InvoiceEditorType | 'credit_note';

export function isInvoiceEditorType(type: string): type is InvoiceEditorType {
  return (INVOICE_EDITOR_TYPES as readonly string[]).includes(type);
}

/** Format der E-Rechnung; ZUGFeRD ist der Standard (#184). */
export const E_INVOICE_FORMATS = ['zugferd', 'xrechnung'] as const;
export type EInvoiceFormat = (typeof E_INVOICE_FORMATS)[number];

export function toEInvoiceFormat(value: string | null | undefined): EInvoiceFormat {
  return value === 'xrechnung' ? 'xrechnung' : 'zugferd';
}

/** Rechnungsartig: Pflicht-Leistungsdatum, E-Rechnung, Käuferreferenz. */
export function isInvoiceDocument(type: string): boolean {
  return isInvoiceEditorType(type) || type === 'credit_note';
}

/**
 * Höchstlänge der Käuferreferenz (BT-10), wie in der App
 * (`BUYER_REFERENCE_MAX_LENGTH`). Die Leitweg-ID ist deutlich kürzer.
 */
export const BUYER_REFERENCE_MAX_LENGTH = 80;

/**
 * Vorzeichen, mit dem Beträge in der Datenbank stehen. Eine Gutschrift liegt
 * negiert vor, wie Storno und die Gutschrift der App; im Formular wird sie
 * positiv getippt. Der Renderer schreibt sie im XML (381) wieder positiv.
 */
export function storedSign(type: string): 1 | -1 {
  return type === 'credit_note' ? -1 : 1;
}

/**
 * Positionsarten, die der Nutzer wählen kann. `partial_credit` (Abzug eines
 * Abschlags) setzt nur die Schlussrechnung über `loadPartialCredits`.
 */
export const LINE_KINDS = ['labor', 'material', 'other', 'discount', 'text'] as const;
export type LineKind = (typeof LINE_KINDS)[number] | 'partial_credit';

/** Herkunft einer Position: Zeit oder Material eines Auftrags. */
export type LineSource = { type: 'time_entry' | 'order_material'; id: string } | null;

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
  /**
   * Zeit oder Material, aus dem die Position stammt. Bleibt beim Speichern
   * erhalten: Erst darüber markiert `finalize_sales_document` die Quelle als
   * abgerechnet.
   */
  source: LineSource;
  /** Abschlagsrechnung, die diese Abzugszeile verrechnet (nur `partial_credit`). */
  creditedDocumentId: string | null;
};

export type EditorState = TermFields & {
  type: EditableDocumentType;
  /** Ursprungsrechnung einer Gutschrift (`parent_document_id`), sonst leer. */
  parentDocumentId: string | null;
  customerId: string | null;
  /** Auftrag des Belegs; landet in `order_id` jeder Position. */
  orderId: string | null;
  taxMode: TaxMode;
  issueDate: string;
  serviceDate: string;
  dueDate: string;
  introText: string;
  footerText: string;
  notes: string;
  /** E-Rechnung (Factur-X im PDF). Standard an; nur bei Rechnungsarten wählbar. */
  eInvoice: boolean;
  /** Format der E-Rechnung: fast immer ZUGFeRD, XRechnung für Behörden (#184). */
  eInvoiceFormat: EInvoiceFormat;
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

/** Leeres Feld bleibt null — der Renderer faellt dann auf Kunde bzw. Betrieb zurueck. */
function optionalNumber(value: string): number | null {
  return value.trim() ? parseNumber(value) : null;
}

/**
 * Nettobetrag einer Position in Cent.
 *
 * Menge mal Einzelpreis, dann der Rabatt — in dieser Reihenfolge und einmal
 * gerundet. Ein Rabatt je Einheit gerechnet weicht bei krummen Mengen um Cent
 * ab, und die Summe der Positionen ergaebe dann nicht mehr den Beleg.
 *
 * Ein Nachlass (`discount`) mindert den Beleg immer, egal ob der Preis mit
 * oder ohne Minus getippt wurde.
 */
export function lineNetMinor(line: EditorLine): number {
  const gross = multiplyMoney(
    toMinorUnits(parseNumber(line.unitPrice)),
    parseNumber(line.quantity),
  );
  const discount = percentOf(gross, parseNumber(line.discountPercent));
  return isDeduction(line.kind) ? -Math.abs(gross - discount) : gross - discount;
}

/** Nachlass und Abschlagsabzug stehen negativ in der Datenbank, im Feld ohne Minus. */
export function isDeduction(kind: string): boolean {
  return kind === 'discount' || kind === 'partial_credit';
}

/** Steuersatz, mit dem die Position rechnet: außer bei `standard` immer 0 %. */
export function effectiveTaxRate(line: EditorLine, taxMode: TaxMode): number {
  if (line.kind === 'text' || !taxModeChargesVat(taxMode)) return 0;
  return parseNumber(line.taxRatePercent);
}

/** Summen des Belegs aus den Positionen — dieselbe Regel wie in der App. */
export function editorTotals(lines: EditorLine[], taxMode: TaxMode) {
  return documentTotals(
    lines
      // Textzeilen tragen keinen Betrag: sie gliedern den Beleg.
      .filter((line) => line.kind !== 'text')
      .map((line) => ({
        netMinor: lineNetMinor(line),
        taxRatePercent: effectiveTaxRate(line, taxMode),
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
    source: null,
    creditedDocumentId: null,
  };
}

/** Eine Zeile ohne Titel und Beschreibung speichert der Editor nicht. */
export function isBlankLine(line: EditorLine): boolean {
  return !line.title.trim() && !line.description.trim();
}

function moneyText(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/** Zahl für ein Eingabefeld: deutsches Komma, höchstens vier Nachkommastellen. */
function quantityText(value: number): string {
  return String(Math.round(value * 10000) / 10000).replace('.', ',');
}

function finiteNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type OrderTimeRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number;
  note: string;
  billing_rate: unknown;
  employments: {
    display_first_name: string | null;
    display_last_name: string | null;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

type OrderMaterialRow = {
  id: string;
  custom_title: string | null;
  quantity: unknown;
  unit: string;
  unit_cost: unknown;
  unit_price: unknown;
  notes: string;
  articles: { title: string } | { title: string }[] | null;
};

/**
 * Positionen aus einem Auftrag: abgeschlossene, abrechenbare und noch nicht
 * abgerechnete Zeiten und Material — dieselbe Auswahl und dieselben Titel wie
 * `generateLinesFromOrderSources` in der App. Stundensatz ist der beim
 * Erfassen festgehaltene `billing_rate`, Materialpreis der Verkaufspreis,
 * sonst der Einkaufspreis.
 */
export async function loadOrderLines(
  companyId: string,
  orderId: string,
  taxRatePercent: string,
): Promise<EditorLine[]> {
  const [times, materials] = await Promise.all([
    supabase
      .from('time_entries')
      .select(
        'id, started_at, ended_at, break_minutes, note, billing_rate, employments ( display_first_name, display_last_name, profiles ( first_name, last_name ) )',
      )
      .eq('company_id', companyId)
      .eq('order_id', orderId)
      .eq('is_billable', true)
      .is('billed_document_id', null)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: true }),
    supabase
      .from('order_materials')
      .select('id, custom_title, quantity, unit, unit_cost, unit_price, notes, articles(title)')
      .eq('company_id', companyId)
      .eq('order_id', orderId)
      .eq('is_billable', true)
      .is('billed_document_id', null)
      .order('used_at', { ascending: true }),
  ]);
  if (times.error) throw times.error;
  if (materials.error) throw materials.error;

  const lines: EditorLine[] = [];

  for (const row of (times.data ?? []) as unknown as OrderTimeRow[]) {
    const minutes = netMinutes(row);
    if (minutes <= 0) continue;
    const name = row.employments ? employmentDisplayName(row.employments) : '';
    const date = row.started_at.slice(0, 10);
    lines.push({
      ...emptyLine(taxRatePercent),
      title: name ? `Arbeitszeit ${name} (${date})` : `Arbeitszeit (${date})`,
      description: row.note.trim(),
      kind: 'labor',
      quantity: quantityText(minutes / 60),
      unit: 'Std.',
      unitPrice: moneyText(finiteNumber(row.billing_rate)),
      source: { type: 'time_entry', id: row.id },
    });
  }

  for (const row of (materials.data ?? []) as unknown as OrderMaterialRow[]) {
    const article = Array.isArray(row.articles) ? row.articles[0] : row.articles;
    lines.push({
      ...emptyLine(taxRatePercent),
      title: row.custom_title?.trim() || article?.title.trim() || 'Material',
      description: row.notes.trim(),
      kind: 'material',
      quantity: quantityText(finiteNumber(row.quantity)),
      unit: row.unit || 'Stk.',
      unitPrice: moneyText(finiteNumber(row.unit_price ?? row.unit_cost)),
      source: { type: 'order_material', id: row.id },
    });
  }

  return lines;
}

type PartialInvoiceRow = {
  id: string;
  document_number: string | null;
  issue_date: string | null;
  sales_document_lines: { kind: string; net_amount: unknown; tax_rate_percent: unknown }[];
};

/**
 * Abzugszeilen der Schlussrechnung (§ 14 Abs. 5 UStG): je ausgestellter, nicht
 * stornierter Abschlagsrechnung des Auftrags eine Zeile je Steuersatz, mit
 * Nummer, Datum, Netto und USt. Abschläge, die schon ein anderer, nicht
 * stornierter Beleg verrechnet, fehlen; die Datenbank lehnt sie ohnehin ab.
 */
export async function loadPartialCredits(
  companyId: string,
  orderId: string,
  documentId: string | null,
): Promise<EditorLine[]> {
  // Ein Abschlag gehört zum Auftrag, wenn eine seiner Positionen daran hängt.
  const linked = await supabase
    .from('sales_document_lines')
    .select('document_id')
    .eq('company_id', companyId)
    .eq('order_id', orderId);
  if (linked.error) throw linked.error;
  const candidateIds = [...new Set((linked.data ?? []).map((row) => row.document_id))];
  if (candidateIds.length === 0) return [];

  const [partials, credited] = await Promise.all([
    supabase
      .from('sales_documents')
      .select(
        'id, document_number, issue_date, sales_document_lines(kind, net_amount, tax_rate_percent)',
      )
      .eq('company_id', companyId)
      .eq('type', 'partial_invoice')
      .not('status', 'in', '(draft,cancelled)')
      .in('id', candidateIds)
      .order('issue_date', { ascending: true }),
    supabase
      .from('sales_document_lines')
      .select('document_id, credited_document_id, sales_documents!inner(status)')
      .eq('company_id', companyId)
      .in('credited_document_id', candidateIds)
      .neq('sales_documents.status', 'cancelled'),
  ]);
  if (partials.error) throw partials.error;
  if (credited.error) throw credited.error;

  const taken = new Set(
    (credited.data ?? [])
      .filter((row) => row.document_id !== documentId)
      .map((row) => row.credited_document_id),
  );

  const lines: EditorLine[] = [];
  for (const partial of (partials.data ?? []) as unknown as PartialInvoiceRow[]) {
    if (taken.has(partial.id)) continue;
    const netByRate = new Map<number, number>();
    for (const line of partial.sales_document_lines) {
      if (line.kind === 'text') continue;
      const rate = finiteNumber(line.tax_rate_percent);
      netByRate.set(rate, (netByRate.get(rate) ?? 0) + toMinorUnits(finiteNumber(line.net_amount)));
    }
    const label = `Abzüglich Abschlag ${partial.document_number ?? ''} vom ${formatIsoDateDe(partial.issue_date)}`;
    for (const [rate, netMinor] of netByRate) {
      if (netMinor === 0) continue;
      lines.push({
        ...emptyLine(String(rate)),
        title: netByRate.size > 1 ? `${label} (${rate} %)` : label,
        description: `Netto ${formatMoney(netMinor)} · USt ${formatMoney(percentOf(netMinor, rate))}`,
        kind: 'partial_credit',
        quantity: '1',
        unit: 'Psch',
        unitPrice: moneyText(Math.abs(netMinor) / 100),
        creditedDocumentId: partial.id,
      });
    }
  }
  return lines;
}

/**
 * Was der Editor vom Betrieb braucht: Kleinunternehmer stellen ohne
 * Umsatzsteuer aus (§ 19 UStG), das Land wählt den Wortlaut der Hinweise.
 * Einleitung und Schlusstext der Rechnungsvorlage (Unternehmen →
 * Rechnungsvorlage) belegen neue Belege vor, wie in der App.
 */
export function useCompanyTaxProfile() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['company-tax-profile', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<{
      isSmallBusiness: boolean;
      country: string;
      introText: string;
      footerText: string;
    }> => {
      const { data, error } = await supabase
        .from('companies')
        .select('is_small_business, country, invoice_intro_text, invoice_footer_text')
        .eq('id', companyId!)
        .single();
      if (error) throw error;
      return {
        isSmallBusiness: Boolean(data.is_small_business),
        country: data.country ?? 'DE',
        introText: data.invoice_intro_text ?? '',
        footerText: data.invoice_footer_text ?? '',
      };
    },
  });
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
 * das Formular nicht hat. Kopf und Positionen schreibt
 * `save_sales_document_draft` in einer Transaktion.
 */
/**
 * Kopf und Positionen eines Entwurfs, genau so, wie `useSaveDraft` sie
 * speichert. Die Vorschau schickt dieselben Zeilen ungespeichert an
 * `finance-document-render` — so ist das PDF der Vorschau dasselbe wie das
 * nach dem Speichern.
 */
export function buildDraftRows(state: EditorState, companyId: string) {
  const totals = editorTotals(state.lines, state.taxMode);
  const sign = storedSign(state.type);
  const savedLines = state.lines.filter((line) => !isBlankLine(line));
  const shareOf = (kind: LineKind) =>
    minorToEuros(
      sign *
        savedLines
          .filter((line) => line.kind === kind)
          .reduce((sum, line) => sum + lineNetMinor(line), 0),
    );

  const header = {
    company_id: companyId,
    type: state.type,
    status: 'draft',
    customer_id: state.customerId,
    parent_document_id: state.parentDocumentId,
    tax_mode: state.taxMode,
    // Leer bleibt null. Heute setzt erst finalize_sales_document
    // (coalesce(issue_date, CURRENT_DATE)), nicht das Speichern.
    issue_date: state.issueDate || null,
    service_date: state.serviceDate || null,
    due_date: state.dueDate || null,
    intro_text: state.introText,
    footer_text: state.footerText,
    notes: state.notes,
    buyer_reference: state.buyerReference.trim(),
    payment_term_days: optionalNumber(state.paymentTermDays),
    skonto_percent: optionalNumber(state.skontoPercent),
    skonto_days: optionalNumber(state.skontoDays),
    net_total: minorToEuros(sign * totals.netMinor),
    vat_total: minorToEuros(sign * totals.vatMinor),
    gross_total: minorToEuros(sign * totals.grossMinor),
    labor_share: shareOf('labor'),
    material_share: shareOf('material'),
    // Angebote haben nie ein XML; die Spalte bleibt dort beim Standard.
    e_invoice: isInvoiceDocument(state.type) ? state.eInvoice : true,
    einvoice_format:
      isInvoiceDocument(state.type) && state.eInvoice ? state.eInvoiceFormat : 'zugferd',
  };

  const lines = savedLines.map((line, index) => {
    const unitPrice = parseNumber(line.unitPrice);
    const netMinor = line.kind === 'text' ? 0 : sign * lineNetMinor(line);
    return {
      company_id: companyId,
      order_id: state.orderId,
      sort_order: index,
      kind: line.kind,
      title: line.title.trim(),
      description: line.description.trim(),
      quantity: parseNumber(line.quantity),
      unit: line.unit.trim(),
      unit_price: sign * (isDeduction(line.kind) ? -Math.abs(unitPrice) : unitPrice),
      discount_percent: parseNumber(line.discountPercent),
      // Der Renderer liest die Steuerart je Position aus `tax_category`.
      // Stünde hier `standard`, käme eine § 13b-Rechnung mit 19 % aufs PDF.
      tax_category: state.taxMode,
      tax_rate_percent: effectiveTaxRate(line, state.taxMode),
      net_amount: minorToEuros(netMinor),
      labor_share: line.kind === 'labor' ? minorToEuros(netMinor) : 0,
      source_type: line.source?.type ?? null,
      source_id: line.source?.id ?? null,
      credited_document_id: line.kind === 'partial_credit' ? line.creditedDocumentId : null,
    };
  });

  return { header, lines };
}

export type DraftRows = ReturnType<typeof buildDraftRows>;

export function useSaveDraft() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    // `documentId` je Aufruf statt je Hook: das erste Speichern legt den
    // Entwurf an, jedes weitere überschreibt genau diesen.
    mutationFn: async ({
      state,
      documentId,
    }: {
      state: EditorState;
      documentId: string | null;
    }): Promise<string> => {
      const { header, lines } = buildDraftRows(state, companyId!);

      // Eine Transaktion (bautakt-web#158): bricht das Speichern ab, bleibt
      // der vorherige Stand vollständig erhalten.
      const { data, error } = await supabase.rpc('save_sales_document_draft', {
        p_document_id: documentId,
        p_header: header,
        p_lines: lines,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-document', companyId, id] });
    },
  });
}
