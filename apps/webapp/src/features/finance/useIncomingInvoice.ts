import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import type { IncomingInvoiceStatus } from './incomingInvoiceForm';
import {
  type ParseOutcome,
  parseOutcome,
  type StoredFile,
  storedFile,
  type StoreErrorKey,
  storeErrorKey,
  type UploadKind,
} from './incomingInvoiceUpload';
import type {
  IncomingInvoiceEvent,
  IncomingReviewDecision,
  IncomingReviewStatus,
} from './incomingReview';
import {
  type IncomingTaxMode,
  taxKind,
  type TaxLine,
  type TaxLinePayload,
} from './incomingTaxLines';

export type IncomingInvoiceRow = {
  id: string;
  status: IncomingInvoiceStatus;
  supplier_id: string | null;
  vendor_name: string;
  vendor_vat_id: string;
  vendor_iban: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  net_total: number;
  vat_total: number;
  gross_total: number;
  currency: string;
  order_id: string | null;
  cost_category_id: string | null;
  notes: string;
  source_format: string;
  storage_path: string | null;
  /** SHA-256 des Originals (Hex), gesetzt von `finance-inbound-store`. */
  content_hash: string | null;
  /** Prüfstand neben dem Zahlstand (#164); ändert sich nur per RPC. */
  review_status: IncomingReviewStatus;
};

/** Felder, die das Formular schreibt. `storage_path`/`content_hash` setzt nur der Server (#161). */
export type IncomingInvoiceWrite = {
  status: IncomingInvoiceStatus;
  supplier_id: string | null;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  net_total: number;
  vat_total: number;
  gross_total: number;
  order_id: string | null;
  cost_category_id: string | null;
  notes: string;
  /** Nur, wenn die Felder aus einer E-Rechnung vorgeschlagen wurden. */
  vendor_vat_id?: string;
  source_format?: 'manual' | 'zugferd' | 'xrechnung';
};

export function useIncomingInvoice(id: string | null) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['incoming-invoice', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async (): Promise<IncomingInvoiceRow> => {
      const { data, error } = await supabase
        .from('incoming_invoices')
        .select(
          'id, status, supplier_id, vendor_name, vendor_vat_id, vendor_iban, invoice_number, invoice_date, due_date, net_total, vat_total, gross_total, currency, order_id, cost_category_id, notes, source_format, storage_path, content_hash, review_status',
        )
        .eq('company_id', companyId!)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as IncomingInvoiceRow;
    },
  });
}

/**
 * Das abgelegte Original (PDF, XML oder Foto) unverändert aus dem Archiv. Lesen
 * dürfen es, wer die Finanzen sieht oder Gemeinkosten verwaltet (Storage-Policy
 * auf `finance-documents`).
 */
export async function downloadIncomingOriginal(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from('finance-documents').download(storagePath);
  if (error || !data) throw error ?? new Error('ORIGINAL_MISSING');
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Liste und offene Belege neu laden. Ein gelöschter Beleg fliegt aus dem Cache,
 * statt neu geladen zu werden: Sonst liefe seine Abfrage in den Fehler und die
 * Wiederholungen hielten das Löschen mehrere Sekunden auf.
 */
function useInvalidateIncoming() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return async (deletedId?: string) => {
    if (deletedId) {
      queryClient.removeQueries({ queryKey: ['incoming-invoice', companyId, deletedId] });
      queryClient.removeQueries({ queryKey: ['incoming-tax-lines', companyId, deletedId] });
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['incoming-invoices-list', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['incoming-invoice', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['incoming-tax-lines', companyId] }),
    ]);
  };
}

/**
 * Steueraufteilung einer Rechnung (#168), höchster Satz zuerst. Zeilen mit
 * einer Art, die das Formular nicht kennt, kommen trotzdem mit.
 */
export function useIncomingTaxLines(invoiceId: string | null) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['incoming-tax-lines', companyId, invoiceId],
    enabled: Boolean(companyId && invoiceId),
    queryFn: async (): Promise<TaxLine[]> => {
      const { data, error } = await supabase
        .from('incoming_invoice_tax_lines')
        .select('tax_mode, tax_rate_percent, net_amount, vat_amount')
        .eq('company_id', companyId!)
        .eq('invoice_id', invoiceId!)
        .order('tax_rate_percent', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        kind: taxKind(row.tax_mode as IncomingTaxMode, Number(row.tax_rate_percent)),
        netMinor: Math.round(Number(row.net_amount) * 100),
        vatMinor: Math.round(Number(row.vat_amount) * 100),
      }));
    },
  });
}

/**
 * Speichern scheiterte, nachdem die Rechnung schon als Entwurf angelegt war.
 * `id` gehört ins Formular, sonst legt der nächste Versuch eine zweite an.
 */
export class IncomingSaveError extends Error {
  readonly id: string;
  /** Code des eigentlichen Fehlers (z. B. 42501), für `readableDbError`. */
  readonly code: string;
  constructor(id: string, cause: unknown) {
    const source = (cause ?? {}) as { message?: unknown; code?: unknown };
    super(typeof source.message === 'string' ? source.message : 'INCOMING_INVOICE_NOT_SAVED', {
      cause,
    });
    this.id = id;
    this.code = typeof source.code === 'string' ? source.code : '';
  }
}

/**
 * Anlegen oder ändern. Ein erfasster Beleg ändert nur noch den Status
 * (`onlyStatus`); was sonst im Formular steht, wird dann nicht gesendet.
 * 0 geänderte Zeilen ist ein Fehler, kein stiller Erfolg.
 *
 * Mit Steueraufteilung (#168) in drei Schritten, weil die Zeilen nur im
 * Entwurf geschrieben werden dürfen: Kopf als Entwurf, Zeilen
 * (`set_incoming_invoice_tax_lines`, ersetzt alle in einem Schritt), dann der
 * Status. Erst der letzte Schritt erfasst; dort prüft die Datenbank, dass die
 * Zeilen zum Kopf passen. Scheitert ein Schritt, bleibt ein gültiger Entwurf.
 */
export function useSaveIncomingInvoice() {
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateIncoming();

  async function update(id: string, patch: Partial<IncomingInvoiceWrite>) {
    const { data, error } = await supabase
      .from('incoming_invoices')
      .update({ ...patch, modified_at: new Date().toISOString() })
      .eq('company_id', companyId!)
      .eq('id', id)
      .select('id');
    if (error) throw error;
    if (!data || data.length !== 1) throw new Error('INCOMING_INVOICE_NOT_SAVED');
  }

  return useMutation({
    mutationFn: async ({
      id,
      values,
      onlyStatus,
      taxLines,
    }: {
      id: string | null;
      values: IncomingInvoiceWrite;
      onlyStatus: boolean;
      taxLines: TaxLinePayload[];
    }): Promise<string> => {
      if (onlyStatus) {
        if (id === null) throw new Error('INCOMING_INVOICE_NOT_SAVED');
        await update(id, { status: values.status });
        return id;
      }

      const draft = { ...values, status: 'draft' as const };
      let savedId = id;
      if (savedId === null) {
        const { data, error } = await supabase
          .from('incoming_invoices')
          .insert({ ...draft, company_id: companyId!, created_by: user?.id ?? null })
          .select('id')
          .single();
        if (error) throw error;
        savedId = data.id as string;
      } else {
        await update(savedId, draft);
      }

      try {
        const { data, error } = await supabase.rpc('set_incoming_invoice_tax_lines', {
          p_invoice_id: savedId,
          p_lines: taxLines,
        });
        if (error) throw error;
        if (!Array.isArray(data) || data.length !== taxLines.length) {
          throw new Error('INCOMING_TAX_LINES_NOT_SAVED');
        }
        if (values.status !== 'draft') await update(savedId, { status: values.status });
      } catch (caught) {
        throw new IncomingSaveError(savedId, caught);
      }
      return savedId;
    },
    onSettled: () => invalidate(),
  });
}

/** Prüfprotokoll einer Rechnung, älteste zuerst (#164). */
export function useIncomingInvoiceEvents(invoiceId: string | null) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['incoming-invoice-events', companyId, invoiceId],
    enabled: Boolean(companyId && invoiceId),
    queryFn: async (): Promise<IncomingInvoiceEvent[]> => {
      const { data, error } = await supabase
        .from('incoming_invoice_events')
        // `*` statt Spaltenliste: field/old_value/new_value kommen erst mit der
        // Migration zu #170; vorher fehlen sie, die Abfrage läuft trotzdem.
        .select('*')
        .eq('company_id', companyId!)
        .eq('invoice_id', invoiceId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as IncomingInvoiceEvent[];
    },
  });
}

/**
 * Freigeben oder ablehnen. Prüfstand und Protokolleintrag schreibt
 * `review_incoming_invoice` in einer Transaktion; die Funktion meldet den
 * neuen Eintrag zurück, fehlt er, ist das ein Fehler.
 */
export function useReviewIncomingInvoice() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateIncoming();

  return useMutation({
    mutationFn: async ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: IncomingReviewDecision;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc('review_incoming_invoice', {
        p_invoice_id: id,
        p_decision: decision,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      if (!data) throw new Error('INCOMING_REVIEW_NOT_SAVED');
    },
    onSuccess: (_, { id }) =>
      Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: ['incoming-invoice-events', companyId, id] }),
      ]),
  });
}

/**
 * Nur Entwürfe; der Filter auf `draft` steht zusätzlich zur Datenbank-Sperre.
 *
 * Erst die Originaldatei, dann der Entwurf: Die Storage-Policy gibt die Datei
 * nur frei, solange ein Entwurf auf sie zeigt (bautakt-app
 * 20261029150000_b_incoming_draft_file_delete). Scheitert danach das Löschen
 * des Entwurfs, fehlt beim Wiederholen schon die Datei; das ist kein Fehler.
 * Der Pfad kommt frisch aus der Datenbank, nicht aus dem Formular: Eine eben
 * hochgeladene Datei stünde dort vielleicht noch nicht.
 */
export function useDeleteIncomingDraft() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateIncoming();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: draft, error: draftError } = await supabase
        .from('incoming_invoices')
        .select('storage_path')
        .eq('company_id', companyId!)
        .eq('id', id)
        .eq('status', 'draft')
        .maybeSingle();
      if (draftError) throw draftError;
      if (!draft) throw new Error('INCOMING_INVOICE_NOT_DELETED');
      if (draft.storage_path) await removeDraftFile(draft.storage_path);
      const { data, error } = await supabase
        .from('incoming_invoices')
        .delete()
        .eq('company_id', companyId!)
        .eq('id', id)
        .eq('status', 'draft')
        .select('id');
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error('INCOMING_INVOICE_NOT_DELETED');
    },
    onSuccess: (_, id) => invalidate(id),
  });
}

/** `remove` meldet bei verweigerter Policy keinen Fehler, nur eine leere Liste. */
async function removeDraftFile(storagePath: string): Promise<void> {
  const bucket = supabase.storage.from('finance-documents');
  const { data, error } = await bucket.remove([storagePath]);
  if (error) throw error;
  if (data.length === 1) return;
  const { data: stillThere, error: existsError } = await bucket.exists(storagePath);
  if (existsError) throw existsError;
  if (stillThere) throw new Error('INCOMING_DRAFT_FILE_NOT_DELETED');
}

/** Upload gescheitert; `key` liegt unter `domain:incomingInvoiceForm.upload.errors`. */
export class IncomingUploadError extends Error {
  readonly key: StoreErrorKey;
  constructor(key: StoreErrorKey) {
    super(`INCOMING_UPLOAD_${key}`);
    this.key = key;
  }
}

/** FunctionsHttpError trägt die Antwort der Function in `context`. */
async function failedResponse(error: unknown): Promise<{ status: number; body: unknown }> {
  const response: unknown = (error as { context?: unknown }).context;
  if (!(response instanceof Response)) return { status: 0, body: null };
  return { status: response.status, body: await response.json().catch(() => null) };
}

/**
 * Datei über `finance-inbound-store` ablegen. Ohne `invoiceId` legt die
 * Function einen Entwurf an; mit ID hängt sie die Datei an diesen Entwurf.
 * Danach steht der Entwurf in der Liste, deshalb wird sie neu geladen.
 */
export function useStoreIncomingFile() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateIncoming();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      file,
    }: {
      invoiceId: string | null;
      file: File;
    }): Promise<StoredFile> => {
      const form = new FormData();
      form.append('company_id', companyId!);
      if (invoiceId) form.append('incoming_invoice_id', invoiceId);
      form.append('file', file, file.name);

      const { data, error } = await supabase.functions.invoke('finance-inbound-store', {
        body: form,
      });
      if (error) {
        const { status, body } = await failedResponse(error);
        throw new IncomingUploadError(storeErrorKey(status, body));
      }
      const stored = storedFile(data);
      if (!stored) throw new IncomingUploadError('unknown');
      return stored;
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * E-Rechnung über `finance-inbound-parse` lesen. Fotos haben kein XML und
 * gehen gar nicht erst hin.
 */
export async function parseIncomingFile(file: File, kind: UploadKind): Promise<ParseOutcome> {
  if (kind === 'image') return { status: 'none' };
  const body =
    kind === 'xml' ? { xmlText: await file.text() } : { pdfBase64: await toBase64(file) };
  const { data, error } = await supabase.functions.invoke('finance-inbound-parse', { body });
  if (error) throw error;
  return parseOutcome(data);
}

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  // In Stücken, sonst sprengt `String.fromCharCode` bei großen PDFs den Stack.
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
