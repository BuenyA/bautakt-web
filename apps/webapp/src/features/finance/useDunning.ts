import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/** Hoechste bereits erreichte Mahnstufe je Beleg. */
export function useDunningLevels() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['dunning-levels', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('dunning_notices')
        .select('document_id, level')
        .eq('company_id', companyId!);

      if (error) throw error;

      const levels = new Map<string, number>();
      for (const row of data ?? []) {
        levels.set(row.document_id, Math.max(levels.get(row.document_id) ?? 0, row.level));
      }
      return levels;
    },
  });
}

export type NewDunningNotice = {
  documentId: string;
  level: number;
  noticeDateIso: string;
};

/**
 * Mahnung anlegen.
 *
 * Gebuehr und Verzugszinsen bleiben bei 0: beides ist eine kaufmaennische
 * Entscheidung und haengt an Vertrag und Verzugsdauer. Sie hier zu raten waere
 * schlimmer als sie wegzulassen — die Betraege gehoeren spaeter in ein Formular,
 * nicht in einen Standardwert.
 */
export function useCreateDunningNotice() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (notice: NewDunningNotice) => {
      const { error } = await supabase.from('dunning_notices').insert({
        company_id: companyId!,
        document_id: notice.documentId,
        level: notice.level,
        notice_date: notice.noticeDateIso,
        fee_amount: 0,
        interest_amount: 0,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dunning-levels', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['dunning-notices', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
    },
  });
}
