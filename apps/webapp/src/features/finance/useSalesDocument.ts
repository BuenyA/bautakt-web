import { eurosToMinor, overpaidMinor } from '@bautakt/finance';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  SALES_DOCUMENT_BUYER_SELECT,
  type SalesDocumentBuyerFields,
  salesDocumentBuyerLabel,
} from './salesDocumentBuyer';
import { renderPreview } from './useLivePreview';

export type DocumentLine = {
  id: string;
  title: string;
  description: string;
  kind: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  net_amount: number;
  tax_rate_percent: number;
  sort_order: number;
  order_id: string | null;
  source_type: 'time_entry' | 'order_material' | null;
  source_id: string | null;
  /** Abschlagsrechnung, die eine Abzugszeile (`partial_credit`) verrechnet. */
  credited_document_id: string | null;
};

export type DocumentPayment = {
  id: string;
  amount: number;
  skonto_amount: number;
  paid_at: string;
  method: string;
  note: string;
};

export type DunningNotice = {
  id: string;
  level: number;
  notice_date: string;
  sent_at: string | null;
  fee_amount: number;
  interest_amount: number;
};

export type SalesDocumentDetail = {
  id: string;
  type: string;
  status: string;
  document_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  service_date: string | null;
  currency: string;
  net_total: number;
  vat_total: number;
  gross_total: number;
  /** Freigegebene Gutschriften zu dieser Rechnung (Brutto, positiv). */
  credited_total: number;
  intro_text: string;
  footer_text: string;
  notes: string;
  buyer_reference: string;
  /** E-Mail des Käufers, beim Festschreiben vom Kunden übernommen; sonst leer. */
  buyer_email: string | null;
  payment_term_days: number | null;
  skonto_days: number | null;
  skonto_percent: number | null;
  tax_mode: string;
  customer_id: string | null;
  /** E-Rechnung gewählt (Standard). `false`: PDF ohne Factur-X-XML. */
  e_invoice: boolean;
  /** `zugferd` (Standard) oder `xrechnung`; nur bei `e_invoice` wirksam. */
  einvoice_format: string;
  /** Archiv-Original; bei Entwürfen immer leer. */
  storage_path: string | null;
  content_hash: string | null;
  customer_label: string;
  lines: DocumentLine[];
  payments: DocumentPayment[];
  dunning: DunningNotice[];
  /** Letzter Eintrag im Versandprotokoll (`finance_send_log`), sonst leer. */
  sent_at: string | null;
  /** Ursprungsbeleg eines Stornos oder einer Gutschrift. */
  parent: LinkedDocument | null;
  /** Belege, die auf diesen verweisen (Storno, Gutschrift). */
  children: LinkedDocument[];
};

export type LinkedDocument = { id: string; document_number: string | null; type: string };

type PayableDocument = Pick<SalesDocumentDetail, 'payments' | 'gross_total' | 'credited_total'>;

/** Forderung nach Gutschriften in Cent: Brutto minus gutgeschriebener Betrag. */
export function chargeableMinorOf(
  document: Pick<SalesDocumentDetail, 'gross_total' | 'credited_total'>,
): number {
  return eurosToMinor(document.gross_total) - eurosToMinor(document.credited_total);
}

/** Bereits gezahlt inkl. Skonto, in Cent. */
export function paidMinorOf(document: Pick<SalesDocumentDetail, 'payments'>): number {
  return document.payments.reduce(
    (sum, payment) => sum + eurosToMinor(payment.amount) + eurosToMinor(payment.skonto_amount),
    0,
  );
}

/**
 * Noch einziehbare Forderung in Cent.
 *
 * Nie negativ: der Button „Zahlung erfassen“ haengt daran. Liegt die
 * Zahlungssumme ueber dem Brutto, ist der Rest hier 0 — der Ueberschuss steht
 * in `overpaidMinorOf`. Der Trigger `update_document_payment_status` setzt
 * beides auf `paid`; die Oberflaeche muss den Unterschied selbst zeigen.
 */
export function openMinorOf(document: PayableDocument): number {
  return Math.max(0, chargeableMinorOf(document) - paidMinorOf(document));
}

/** Ueberschuss in Cent, wenn Zahlungen (inkl. Skonto) das Brutto uebersteigen. */
export function overpaidMinorOf(document: PayableDocument): number {
  return overpaidMinor(chargeableMinorOf(document), paidMinorOf(document));
}

/**
 * Ein Beleg samt Positionen, Zahlungen und Mahnungen.
 *
 * Vier Tabellen in einer Abfrage ueber die Fremdschluessel — das spart drei
 * Roundtrips und haelt Positionen und Summen auf demselben Stand.
 */
export function useSalesDocument(id: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['sales-document', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async (): Promise<SalesDocumentDetail | null> => {
      const { data, error } = await supabase
        .from('sales_documents')
        .select(
          `id, type, status, document_number, issue_date, due_date, service_date, currency,
           net_total, vat_total, gross_total, credited_total, intro_text, footer_text, notes,
           buyer_reference, buyer_email, parent_document_id,
           payment_term_days, skonto_days, skonto_percent, tax_mode, customer_id,
           storage_path, content_hash, e_invoice, einvoice_format,
           ${SALES_DOCUMENT_BUYER_SELECT},
           sales_document_lines(id, title, description, kind, quantity, unit, unit_price,
             discount_percent, net_amount, tax_rate_percent, sort_order, order_id,
             source_type, source_id, credited_document_id),
           payments(id, amount, skonto_amount, paid_at, method, note),
           dunning_notices(id, level, notice_date, sent_at, fee_amount, interest_amount),
           finance_send_log(created_at),
           parent:parent_document_id(id, document_number, type),
           children:sales_documents!parent_document_id(id, document_number, type)`,
        )
        .eq('company_id', companyId!)
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as Record<string, unknown> &
        SalesDocumentBuyerFields & {
          sales_document_lines: DocumentLine[];
          payments: DocumentPayment[];
          dunning_notices: DunningNotice[];
          finance_send_log: { created_at: string }[] | null;
          parent: LinkedDocument | null;
          children: LinkedDocument[] | null;
        };

      const label = salesDocumentBuyerLabel(row);

      return {
        ...(row as unknown as SalesDocumentDetail),
        customer_label: label ?? '',
        lines: [...(row.sales_document_lines ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        payments: [...(row.payments ?? [])].sort((a, b) => a.paid_at.localeCompare(b.paid_at)),
        dunning: [...(row.dunning_notices ?? [])].sort((a, b) => a.level - b.level),
        sent_at:
          (row.finance_send_log ?? [])
            .map((entry) => entry.created_at)
            .sort()
            .at(-1) ?? null,
        parent: row.parent ?? null,
        children: row.children ?? [],
      };
    },
  });
}

/**
 * Archiv-Original erzeugen: PDF/A-3b, bei Rechnungen mit factur-x.xml.
 *
 * `finance-document-render` schreibt das Original genau einmal und setzt
 * `storage_path`/`content_hash`. Ein 409 heisst, dass ein anderer Aufruf
 * gerade dasselbe Original schreibt; dessen Ergebnis gilt, das ist kein Fehler.
 */
async function renderArchive(documentId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('finance-document-render', {
    body: { document_id: documentId, mode: 'archive' },
  });
  if (!error) return;
  const status = (error as { context?: { status?: number } }).context?.status;
  if (status === 409) return;
  throw error;
}

/**
 * Beleg festschreiben.
 *
 * Die Nummer vergibt `finalize_sales_document` in der Datenbank, nicht der
 * Client: nur dort ist der Nummernkreis luekenlos und gegen zwei gleichzeitige
 * Aufrufe geschuetzt. Die Funktion prueft ausserdem die Pflichtangaben und
 * macht den Beleg unveraenderlich.
 *
 * Direkt danach entsteht das Archiv-Original. Scheitert nur dieser zweite
 * Schritt, ist der Beleg trotzdem festgeschrieben (`archived: false`); die
 * Detailseite bietet das Nachholen an.
 */
export function useFinalizeDocument(documentId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();

  return useMutation({
    // Der Editor kennt die Id erst nach dem Speichern und reicht sie je Aufruf.
    mutationFn: async (savedId?: string) => {
      const target = savedId ?? documentId!;
      const { data, error } = await supabase.rpc('finalize_sales_document', {
        p_document_id: target,
      });
      if (error) throw error;
      // Die vergebene Nummer kommt aus der Freigabe selbst, für den Toast.
      const documentNumber = data?.document_number ?? '';
      try {
        await renderArchive(target);
        return { archived: true, documentNumber };
      } catch {
        return { archived: false, documentNumber };
      }
    },
    onSuccess: async (_, savedId) => {
      await queryClient.invalidateQueries({
        queryKey: ['sales-document', membership?.companyId, savedId ?? documentId],
      });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', membership?.companyId] });
    },
  });
}

/** Archiv-Original nachholen, wenn es beim Festschreiben nicht entstanden ist. */
export function useArchiveDocument(documentId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();

  return useMutation({
    mutationFn: () => renderArchive(documentId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['sales-document', membership?.companyId, documentId],
      });
    },
  });
}

/**
 * Rechnung stornieren über die RPC `cancel_sales_document` (#153), dieselbe
 * wie in der App: Stornobeleg mit negierten Positionen, festgeschrieben im
 * Nummernkreis ST, Original auf „storniert“ — in einer Transaktion. Danach
 * entsteht wie beim Freigeben das Archiv-Original des Stornobelegs.
 */
export function useCancelDocument(documentId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cancel_sales_document', {
        p_document_id: documentId!,
      });
      if (error) throw error;
      const documentNumber = data.document_number ?? '';
      try {
        await renderArchive(data.id);
        return { id: data.id, archived: true, documentNumber };
      } catch {
        return { id: data.id, archived: false, documentNumber };
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['sales-document', membership?.companyId, documentId],
      });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', membership?.companyId] });
    },
  });
}

/**
 * Beleg als versendet markieren, wie „Beleg teilen“ in der App
 * (`markFinanceDocumentShared`): Eintrag im Versandprotokoll und Status
 * `sent`. Den Status setzen nur `issued` und `overdue` — ein (teil)bezahlter
 * Beleg bleibt, was er ist, bekommt aber den Protokolleintrag.
 *
 * Erst das Protokoll, dann der Status: scheitert das Protokoll, bleibt der
 * Beleg unverändert und der Nutzer sieht den Fehler.
 */
export function useMarkSent(documentId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (document: Pick<SalesDocumentDetail, 'type' | 'document_number'>) => {
      const { error: logError } = await supabase.from('finance_send_log').insert({
        company_id: companyId!,
        document_id: documentId!,
        channel: 'other',
        intent: `mark_sent:${document.type}:${document.document_number ?? documentId}`,
        created_by: user?.id ?? null,
      });
      if (logError) throw logError;

      const { error } = await supabase
        .from('sales_documents')
        .update({ status: 'sent', modified_at: new Date().toISOString() })
        .eq('company_id', companyId!)
        .eq('id', documentId!)
        .in('status', ['issued', 'overdue']);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales-document', companyId, documentId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
    },
  });
}

/**
 * PDF-Vorschau eines Entwurfs samt Hinweisen der Render-Function (fehlende
 * Pflichtangaben). Nicht im Cache halten: Der Entwurf kann sich im Editor
 * jederzeit geändert haben.
 */
export function useDraftPreview(documentId: string | null | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['draft-preview', companyId, documentId],
    enabled: Boolean(companyId && documentId),
    staleTime: 0,
    gcTime: 0,
    queryFn: () => renderPreview(documentId!),
  });
}

/** Kurz: die URL geht sofort an den Browser. */
const ARCHIVE_URL_TTL_SECONDS = 300;

/** Signierte URL auf das Archiv-Original. */
/**
 * Archiv-Original als Bytes für die eingebettete Ansicht (#152). Die Datei
 * ändert sich nach dem Festschreiben nie mehr — einmal geladen, bleibt sie im
 * Cache. queryKey beginnt mit dem Mandanten.
 */
export function useArchivedPdf(storagePath: string | null | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['archived-pdf', companyId, storagePath],
    enabled: Boolean(companyId && storagePath),
    staleTime: Infinity,
    queryFn: async (): Promise<Uint8Array> => {
      const { data, error } = await supabase.storage
        .from('finance-documents')
        .download(storagePath!);
      if (error || !data) throw error ?? new Error('ARCHIVE_MISSING');
      return new Uint8Array(await data.arrayBuffer());
    },
  });
}

export async function archivedPdfUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('finance-documents')
    .createSignedUrl(storagePath, ARCHIVE_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) throw error ?? new Error('SIGNED_URL_MISSING');
  return data.signedUrl;
}

/**
 * Entwurf löschen.
 *
 * Nur Entwürfe: festgeschriebene Belege sperrt die Datenbank
 * (`trg_sales_documents_block_delete`), sie lassen sich nur stornieren. Der
 * Statusfilter steht trotzdem hier, damit ein zwischenzeitlich festgeschriebener
 * Beleg nicht erst am Trigger scheitert. Positionen gehen per Kaskade mit.
 *
 * RLS filtert verweigerte Zeilen still weg; ohne zurückgegebene Zeile gilt das
 * Löschen deshalb als gescheitert.
 */
export function useDeleteDraft(documentId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('sales_documents')
        .delete()
        .eq('company_id', companyId!)
        .eq('id', documentId!)
        .eq('status', 'draft')
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('DRAFT_NOT_DELETED');
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['sales-document', companyId, documentId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
    },
  });
}

export type NewPayment = {
  amountMajor: number;
  skontoMajor: number;
  paidAtIso: string;
  method: string;
  note: string;
};

/** Zahlungseingang buchen. Der Belegstatus folgt ueber einen Trigger nach. */
export function useAddPayment(documentId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (payment: NewPayment) => {
      const { error } = await supabase.from('payments').insert({
        company_id: companyId!,
        document_id: documentId!,
        amount: payment.amountMajor,
        skonto_amount: payment.skontoMajor,
        paid_at: payment.paidAtIso,
        method: payment.method,
        note: payment.note,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['sales-document', companyId, documentId],
      });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['payments', companyId] });
    },
  });
}
