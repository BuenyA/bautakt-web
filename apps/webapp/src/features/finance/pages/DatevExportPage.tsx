import { todayIso } from '@bautakt/finance';
import {
  Button,
  Card,
  Field,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  Spinner,
} from '@fluentui/react-components';
import { ArrowDownloadRegular } from '@fluentui/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { useMembership } from '@/features/company/useMembership';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { downloadBytes } from '../archiveFiles';
import {
  buildZip,
  type CheckOutcome,
  type ExportDocumentRef,
  type ExportMonth,
  type ExportOutcome,
  type FailureReason,
  type Finding,
  monthOptions,
  monthValue,
  parseMonthValue,
  previousMonth,
  readCheckResponse,
  readExportResponse,
  zipEntryNames,
  zipFileName,
} from '../datevExport';
import { FinanceHeader } from '../FinanceHeader';

/** Zwei Jahre zurück: weiter reicht ein Nachexport selten. */
const MONTH_COUNT = 24;

const monthFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });

/**
 * `datev-export` aufrufen und Status + JSON zurückgeben. FunctionsHttpError
 * trägt die Antwort der Function in `context`. Ohne Response kam keine
 * Antwort an (Netz): Der Fehler geht weiter, damit der Nutzer wiederholen kann.
 */
async function invokeExport(body: object): Promise<{ status: number; body: unknown }> {
  const { data, error } = await supabase.functions.invoke<unknown>('datev-export', { body });
  if (!error) return { status: 200, body: data };
  const response: unknown = (error as { context?: unknown }).context;
  if (!(response instanceof Response)) throw error;
  return { status: response.status, body: await response.json().catch(() => null) };
}

type DownloadResult =
  | { kind: 'downloaded'; csvName: string; zipName: string; documents: number }
  | Exclude<ExportOutcome, { kind: 'file' }>;

/** Festgeschriebene Belege ohne Archiv-PDF: ohne Original kein Beleg-ZIP. */
class ArchiveMissingError extends Error {
  readonly documents: string[];
  constructor(documents: string[]) {
    super('ARCHIVE_MISSING');
    this.documents = documents;
  }
}

/**
 * Archiv-PDFs der Belege laden und als ZIP packen, jede Datei benannt nach
 * Belegfeld 1. Pfad und PDF kommen mit den Rechten des Nutzers (RLS auf
 * `sales_documents`, Storage-Policy auf `finance-documents`), wie beim
 * Öffnen eines Belegs.
 */
async function buildBelegZip(
  companyId: string,
  documents: readonly ExportDocumentRef[],
): Promise<Uint8Array> {
  const ids = documents.map((document) => document.id);
  const { data, error } = await supabase
    .from('sales_documents')
    .select('id, storage_path')
    .eq('company_id', companyId)
    .in('id', ids);
  if (error) throw error;
  const paths = new Map((data ?? []).map((row) => [row.id, row.storage_path]));
  const missing = documents.filter((document) => !paths.get(document.id));
  if (missing.length > 0) {
    throw new ArchiveMissingError(missing.map((document) => document.documentNumber));
  }

  const names = zipEntryNames(documents);
  const entries = await Promise.all(
    documents.map(async (document) => {
      const { data: file, error: fileError } = await supabase.storage
        .from('finance-documents')
        .download(paths.get(document.id)!);
      if (fileError || !file) throw fileError ?? new Error('ARCHIVE_MISSING');
      return { name: names.get(document.id)!, bytes: new Uint8Array(await file.arrayBuffer()) };
    }),
  );
  return buildZip(entries);
}

function FindingList({ findings }: { findings: Finding[] }) {
  const { t } = useTranslation();
  return (
    <ul className="mt-1 list-disc pl-5">
      {findings.map((finding, index) => (
        <li key={`${finding.code}-${finding.document ?? ''}-${index}`}>
          {t(`domain:datevExport.findings.${finding.code}`, {
            document: finding.document ?? '',
            value: finding.value ?? '',
          })}
        </li>
      ))}
    </ul>
  );
}

function FailureBar({ reason, onRetry }: { reason: FailureReason; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <MessageBar intent="error" layout="multiline">
      <MessageBarBody>{t(`domain:datevExport.failed.${reason}`)}</MessageBarBody>
      {reason === 'unknown' ? (
        <MessageBarActions>
          <Button onClick={onRetry}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      ) : null}
    </MessageBar>
  );
}

function CheckResult({ check, onRetry }: { check: CheckOutcome; onRetry: () => void }) {
  const { t } = useTranslation();
  if (check.kind === 'failed') return <FailureBar reason={check.reason} onRetry={onRetry} />;

  const errors = check.findings.filter((f) => f.severity === 'error');
  const warnings = check.findings.filter((f) => f.severity === 'warning');
  return (
    <>
      {!check.importable ? (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {t('domain:datevExport.blocked')}
            <FindingList findings={errors} />
            <RouterLink to={routes.settings}>{t('domain:datevExport.toSettings')}</RouterLink>
          </MessageBarBody>
        </MessageBar>
      ) : check.bookings === 0 ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>{t('domain:datevExport.empty')}</MessageBarBody>
        </MessageBar>
      ) : (
        <MessageBar intent="success" layout="multiline">
          <MessageBarBody>
            {t('domain:datevExport.ready', { count: check.bookings })}
          </MessageBarBody>
        </MessageBar>
      )}
      {warnings.length > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            {t('domain:datevExport.warnings')}
            <FindingList findings={warnings} />
          </MessageBarBody>
        </MessageBar>
      ) : null}
    </>
  );
}

/**
 * „DATEV-Export“ (#168, #169): einen Monat wählen, die Prüfung läuft sofort
 * (`check_only`), und erst wenn DATEV den Monat importieren kann, gibt es
 * den Buchungsstapel zum Herunterladen. Die Datei baut die Edge Function
 * `datev-export` (bautakt-app).
 *
 * Die Rechte prüft die Datenbank (`datev_sales_export`); die Route zeigt die
 * Seite nur mit denselben Rechten.
 */
export function DatevExportPage() {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  const today = todayIso();
  const options = useMemo(() => monthOptions(today, MONTH_COUNT), [today]);
  const [selected, setSelected] = useState(() => monthValue(previousMonth(today)));
  const month = parseMonthValue(selected);

  const check = useQuery({
    queryKey: ['datev-export-check', companyId, selected],
    enabled: Boolean(companyId && month),
    // Festgeschriebene Belege und Einstellungen ändern sich woanders; beim
    // Zurückkommen auf die Seite neu prüfen statt einen alten Stand zu zeigen.
    staleTime: 0,
    queryFn: async () => {
      const response = await invokeExport({ company_id: companyId, ...month, check_only: true });
      return readCheckResponse(response.status, response.body);
    },
  });

  const download = useMutation({
    mutationFn: async (target: ExportMonth): Promise<DownloadResult> => {
      const response = await invokeExport({ company_id: companyId, ...target });
      const outcome = readExportResponse(response.status, response.body);
      if (outcome.kind !== 'file') {
        // Zwischen Prüfung und Download hat sich etwas geändert: neu prüfen.
        void check.refetch();
        return outcome;
      }
      // Erst alles bauen, dann beide Dateien geben: Scheitert ein PDF, gibt
      // es auch keinen Buchungsstapel ohne seine Belege.
      const zip = await buildBelegZip(companyId!, outcome.documents);
      const zipName = zipFileName(target);
      downloadBytes(outcome.bytes, outcome.fileName, 'text/csv;charset=windows-1252');
      downloadBytes(zip, zipName, 'application/zip');
      return {
        kind: 'downloaded',
        csvName: outcome.fileName,
        zipName,
        documents: outcome.documents.length,
      };
    },
  });

  const ready = check.data?.kind === 'checked' && check.data.importable && check.data.bookings > 0;
  const start = () => {
    if (month && companyId) download.mutate(month);
  };

  return (
    <div className="flex flex-col gap-6">
      <FinanceHeader description={t('domain:datevExport.description')} />

      <Card size="large">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('domain:datevExport.monthLabel')}>
            <Select
              value={selected}
              onChange={(_, { value }) => {
                setSelected(value);
                download.reset();
              }}
            >
              {options.map((option) => (
                <option key={monthValue(option)} value={monthValue(option)}>
                  {monthFormat.format(new Date(option.year, option.month - 1, 1))}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            appearance="primary"
            icon={download.isPending ? <Spinner size="tiny" /> : <ArrowDownloadRegular />}
            disabled={!ready || download.isPending}
            onClick={start}
          >
            {t('domain:datevExport.download')}
          </Button>
        </div>

        {check.isPending && companyId ? (
          <Spinner size="small" labelPosition="after" label={t('domain:datevExport.checking')} />
        ) : check.isError ? (
          <FailureBar reason="unknown" onRetry={() => void check.refetch()} />
        ) : check.data ? (
          <CheckResult check={check.data} onRetry={() => void check.refetch()} />
        ) : null}

        {download.error instanceof ArchiveMissingError ? (
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>
              {t('domain:datevExport.archiveMissing', {
                documents: download.error.documents.join(', '),
              })}
            </MessageBarBody>
          </MessageBar>
        ) : download.isError ? (
          <FailureBar reason="unknown" onRetry={start} />
        ) : null}
        {download.data?.kind === 'failed' ? (
          <FailureBar reason={download.data.reason} onRetry={start} />
        ) : null}
        {download.data?.kind === 'downloaded' ? (
          <MessageBar intent="success" layout="multiline">
            <MessageBarBody>
              {t('domain:datevExport.downloaded', {
                csvName: download.data.csvName,
                zipName: download.data.zipName,
                count: download.data.documents,
              })}
            </MessageBarBody>
          </MessageBar>
        ) : null}
      </Card>
    </div>
  );
}
