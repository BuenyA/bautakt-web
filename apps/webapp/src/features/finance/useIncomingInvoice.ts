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
          'id, status, supplier_id, vendor_name, vendor_vat_id, vendor_iban, invoice_number, invoice_date, due_date, net_total, vat_total, gross_total, currency, order_id, cost_category_id, notes, source_format, storage_path, content_hash',
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
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['incoming-invoices-list', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['incoming-invoice', companyId] }),
    ]);
  };
}

/**
 * Anlegen oder ändern. Ein erfasster Beleg ändert nur noch den Status
 * (`onlyStatus`); was sonst im Formular steht, wird dann nicht gesendet.
 * 0 geänderte Zeilen ist ein Fehler, kein stiller Erfolg.
 */
export function useSaveIncomingInvoice() {
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateIncoming();

  return useMutation({
    mutationFn: async ({
      id,
      values,
      onlyStatus,
    }: {
      id: string | null;
      values: IncomingInvoiceWrite;
      onlyStatus: boolean;
    }): Promise<string> => {
      if (id === null) {
        const { data, error } = await supabase
          .from('incoming_invoices')
          .insert({ ...values, company_id: companyId!, created_by: user?.id ?? null })
          .select('id')
          .single();
        if (error) throw error;
        return data.id;
      }

      const patch = onlyStatus ? { status: values.status } : values;
      const { data, error } = await supabase
        .from('incoming_invoices')
        .update({ ...patch, modified_at: new Date().toISOString() })
        .eq('company_id', companyId!)
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error('INCOMING_INVOICE_NOT_SAVED');
      return id;
    },
    onSuccess: () => invalidate(),
  });
}

/** Nur Entwürfe; der Filter auf `draft` steht zusätzlich zur Datenbank-Sperre. */
export function useDeleteIncomingDraft() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateIncoming();

  return useMutation({
    mutationFn: async (id: string) => {
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
