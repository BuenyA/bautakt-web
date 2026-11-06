import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { type ExportResponse, exportView, pollInterval } from './fullExport';

export class FullExportError extends Error {
  readonly code: string | undefined;
  constructor(code: string | undefined) {
    super(code ?? 'unknown');
    this.code = code;
  }
}

async function invoke(action: 'start' | 'status', companyId: string): Promise<ExportResponse> {
  const { data, error } = await supabase.functions.invoke<ExportResponse>('company-full-export', {
    body: { action, company_id: companyId },
  });
  if (!error && data) return data;
  // FunctionsHttpError trägt die Antwort der Function in `context`.
  const response: unknown = (error as { context?: unknown } | null)?.context;
  const payload =
    response instanceof Response
      ? ((await response.json().catch(() => null)) as { error?: string } | null)
      : null;
  throw new FullExportError(payload?.error);
}

const key = (companyId: string | undefined) => ['company-full-export', companyId] as const;

/**
 * Stand des letzten Vollexports. Solange er läuft, fragt die Seite alle 5 s nach; der
 * Abruf stößt eine hängende Kette auf dem Server auch wieder an.
 */
export function useFullExport() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: key(companyId),
    queryFn: () => invoke('status', companyId!),
    enabled: !!companyId,
    refetchInterval: (query) => pollInterval(exportView(query.state.data)),
    // Links laufen nach einer Stunde ab, nicht aus einem alten Stand anbieten.
    staleTime: 0,
  });
}

export function useStartFullExport() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoke('start', companyId!),
    onSuccess: (data) => queryClient.setQueryData(key(companyId), data),
  });
}
