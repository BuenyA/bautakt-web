import type { EmployeePermissions } from '@bautakt/core';

import { supabase } from '@/lib/supabase';

import { seesEveryReportLink } from './dailyReportAccess';
import type { DailyReportLinkCounts } from './useOrderDailyReports';

/**
 * Warum das Web den Bericht nicht löscht.
 *
 * `billed`: frisch gelesene Zeit oder Material mit `billed_document_id`.
 * `linked`: irgendeine verknüpfte Zeile, eine fehlgeschlagene Zählung, oder
 * ein Konto, dessen Select die vier Tabellen nicht vollständig sieht.
 * Abgerechnetes gewinnt, wenn beides zutrifft.
 */
export type DailyReportDeleteBlock = 'billed' | 'linked';

export class DailyReportDeleteBlockedError extends Error {
  readonly block: DailyReportDeleteBlock;
  readonly counts: DailyReportLinkCounts;

  constructor(block: DailyReportDeleteBlock, counts: DailyReportLinkCounts) {
    super(block === 'billed' ? 'DAILY_REPORT_BILLED' : 'DAILY_REPORT_LINKED');
    this.name = 'DailyReportDeleteBlockedError';
    this.block = block;
    this.counts = counts;
  }
}

/** Sperre plus die sichtbaren Anzahlen, die der Dialog unter dem Text nennt. */
export type DailyReportDeleteReading = {
  block: DailyReportDeleteBlock | null;
  counts: DailyReportLinkCounts;
};

type LinkTable = 'time_entries' | 'order_materials' | 'order_images' | 'order_issues';

async function countRows(
  table: LinkTable,
  companyId: string,
  reportId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('daily_report_id', reportId);
  if (error) return null;
  return count ?? 0;
}

async function countBilled(
  table: 'time_entries' | 'order_materials',
  companyId: string,
  reportId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('daily_report_id', reportId)
    .not('billed_document_id', 'is', null);
  if (error) return null;
  return count ?? 0;
}

/**
 * Frische Lesung, nicht der Listen-Cache.
 *
 * Zeiten und Material mit gesetztem `billed_document_id` sperren immer.
 * Sonst sperrt jede sichtbare Verknüpfung auf Zeit, Material, Foto oder
 * Mangel. Eine 0 zählt nur, wenn `seesEveryReportLink` gilt — sonst könnte
 * die Select-Policy Zeilen ausblenden, die CASCADE trotzdem löscht.
 */
export async function readDailyReportDeleteBlock(
  companyId: string,
  reportId: string,
  permissions: Partial<EmployeePermissions> | null | undefined,
): Promise<DailyReportDeleteReading> {
  const [billedTimes, billedMaterials, times, materials, photos, issues] = await Promise.all([
    countBilled('time_entries', companyId, reportId),
    countBilled('order_materials', companyId, reportId),
    countRows('time_entries', companyId, reportId),
    countRows('order_materials', companyId, reportId),
    countRows('order_images', companyId, reportId),
    countRows('order_issues', companyId, reportId),
  ]);

  const counts: DailyReportLinkCounts = { times, materials, photos, issues };

  if ((billedTimes ?? 0) > 0 || (billedMaterials ?? 0) > 0) return { block: 'billed', counts };
  if (billedTimes == null || billedMaterials == null) return { block: 'linked', counts };

  const totals = [times, materials, photos, issues];
  if (totals.some((total) => total == null || total > 0)) return { block: 'linked', counts };
  if (!seesEveryReportLink(permissions)) return { block: 'linked', counts };
  return { block: null, counts };
}
