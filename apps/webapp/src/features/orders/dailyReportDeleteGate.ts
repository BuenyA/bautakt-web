import type { EmployeePermissions } from '@bautakt/core';

import { supabase } from '@/lib/supabase';

import {
  seesAllOrderMaterials,
  seesAllReportIssues,
  seesAllReportTimes,
} from './dailyReportAccess';
import type { DailyReportLinkCounts } from './useOrderDailyReports';

/**
 * Warum das Web den Bericht nicht löscht.
 *
 * `billed`: frisch gelesene Zeit oder Material mit `billed_document_id`.
 * `linked`: eine sichtbare Verknüpfung, eine fehlgeschlagene Zählung, oder
 * Zeiten bzw. Mängel, die das Konto nicht vollständig sieht.
 * `materialsHidden`: alle sichtbaren Zählungen sind 0, aber fremdes Material
 * kann verborgen sein. Das sperrt, weil die Kaskade abgerechnetes Material
 * mitlöschen würde, das dieses Konto nicht sieht (GoBD).
 * Abgerechnetes gewinnt, wenn beides zutrifft.
 */
export type DailyReportDeleteBlock = 'billed' | 'linked' | 'materialsHidden';

export class DailyReportDeleteBlockedError extends Error {
  readonly block: DailyReportDeleteBlock;
  readonly counts: DailyReportLinkCounts;
  readonly attendance: number | null;
  readonly materialsComplete: boolean;

  constructor(
    block: DailyReportDeleteBlock,
    counts: DailyReportLinkCounts,
    attendance: number | null,
    materialsComplete: boolean,
  ) {
    super(
      block === 'billed'
        ? 'DAILY_REPORT_BILLED'
        : block === 'materialsHidden'
          ? 'DAILY_REPORT_MATERIALS_HIDDEN'
          : 'DAILY_REPORT_LINKED',
    );
    this.name = 'DailyReportDeleteBlockedError';
    this.block = block;
    this.counts = counts;
    this.attendance = attendance;
    this.materialsComplete = materialsComplete;
  }
}

/**
 * Sperre, die sichtbaren Anzahlen und ob Material vollständig sichtbar ist.
 *
 * `attendance` zählt `daily_report_employees` und sperrt nicht. `null` heißt:
 * die Zählung ist fehlgeschlagen, der Dialog erfindet keine Zahl.
 */
export type DailyReportDeleteReading = {
  block: DailyReportDeleteBlock | null;
  counts: DailyReportLinkCounts;
  attendance: number | null;
  materialsComplete: boolean;
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
 * Anwesenheiten am Bericht.
 *
 * Die Tabelle hat kein `company_id`. Die Select-Policy hängt am Bericht und
 * an `canCreateAndViewReports`. `head` zählt, ohne die Zeilen zu laden.
 */
async function countAttendance(reportId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from('daily_report_employees')
    .select('employment_id', { count: 'exact', head: true })
    .eq('report_id', reportId);
  if (error) return null;
  return count ?? 0;
}

/**
 * Frische Lesung, nicht der Listen-Cache.
 *
 * Jede Zahl kommt aus `select` mit `count: 'exact'` und `head: true` auf dem
 * Browser-Client. Es gibt keine Security-Definer-Zählfunktion. Die
 * Select-Policy des angemeldeten Kontos filtert mit. Eine 0 ist deshalb nur
 * für Tabellen ein Beweis, die dieses Konto vollständig sieht.
 *
 * Für den Löschen-Knopf (`canTrackTimeForTeam` und Bearbeitungsrecht) gilt:
 * Zeiten vollständig, Fotos für jedes Mitglied vollständig, Mängel und
 * Anwesenheit vollständig, sobald der Bericht selbst sichtbar ist
 * (`canCreateAndViewReports`). Material ist die Ausnahme
 * (`seesAllOrderMaterials`).
 *
 * Zeiten und Material mit gesetztem `billed_document_id` sperren immer.
 * Sonst sperrt jede sichtbare Verknüpfung auf Zeit, Material, Foto oder
 * Mangel, und eine fehlgeschlagene Zählung. Eine 0 bei unvollständiger
 * Materialsicht sperrt ebenfalls: fremdes Material kann abgerechnet sein,
 * und die Kaskade würde es löschen. Der Text nennt dann nur die fehlende
 * Sicht, keine verknüpften Einträge und keine abgerechneten Zeiten.
 * Anwesenheit sperrt nie. Sie wird nur genannt, wenn der Bericht wirklich
 * gelöscht werden darf.
 */
export async function readDailyReportDeleteBlock(
  companyId: string,
  reportId: string,
  permissions: Partial<EmployeePermissions> | null | undefined,
): Promise<DailyReportDeleteReading> {
  const [billedTimes, billedMaterials, times, materials, photos, issues, attendance] =
    await Promise.all([
      countBilled('time_entries', companyId, reportId),
      countBilled('order_materials', companyId, reportId),
      countRows('time_entries', companyId, reportId),
      countRows('order_materials', companyId, reportId),
      countRows('order_images', companyId, reportId),
      countRows('order_issues', companyId, reportId),
      countAttendance(reportId),
    ]);

  const counts: DailyReportLinkCounts = { times, materials, photos, issues };
  const materialsComplete = seesAllOrderMaterials(permissions);
  const reading = { counts, attendance, materialsComplete };

  if ((billedTimes ?? 0) > 0 || (billedMaterials ?? 0) > 0) {
    return { block: 'billed', ...reading };
  }
  if (billedTimes == null || billedMaterials == null) return { block: 'linked', ...reading };

  const totals = [times, materials, photos, issues];
  if (totals.some((total) => total == null || total > 0)) return { block: 'linked', ...reading };
  if (!seesAllReportTimes(permissions) || !seesAllReportIssues(permissions)) {
    return { block: 'linked', ...reading };
  }
  if (!materialsComplete) return { block: 'materialsHidden', ...reading };
  return { block: null, ...reading };
}
