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
import { usePermission } from '@/features/company/usePermission';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { downloadBytes } from '../archiveFiles';
import {
  buildZip,
  type CheckOutcome,
  EXPORT_DIRECTIONS,
  type ExportDirection,
  type ExportDocumentRef,
  type ExportMonth,
  type ExportOutcome,
  type FailureReason,
  type Finding,
  formatTaxValue,
  monthOptions,
  monthValue,
  parseDirection,
  parseMonthValue,
  previousMonth,
  readCheckResponse,
  readExportResponse,
  storageExtension,
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
  | {
      kind: 'downloaded';
      csvName: string;
      /** `null`: zu keinem Beleg ein Original, also kein ZIP. */
      zipName: string | null;
      documents: number;
      /** Eingangsrechnungen ohne Original, die im ZIP fehlen. */
      withoutOriginal: string[];
    }
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

/**
 * Originale der Eingangsrechnungen als ZIP, benannt nach Belegfeld 1 mit der
 * Endung der abgelegten Datei (PDF, XML, Bild). Anders als beim Ausgang darf
 * eine Eingangsrechnung ohne Datei erfasst sein (Papierbeleg): Sie fehlt im
 * ZIP und wird genannt, statt den ganzen Monat zu blockieren. Pfad und Datei
 * kommen mit den Rechten des Nutzers (RLS auf `incoming_invoices`,
 * Storage-Policy auf `finance-documents`).
 */
async function buildOriginalsZip(
  companyId: string,
  documents: readonly ExportDocumentRef[],
): Promise<{ zip: Uint8Array | null; included: number; withoutOriginal: string[] }> {
  const { data, error } = await supabase
    .from('incoming_invoices')
    .select('id, storage_path')
    .eq('company_id', companyId)
    .in(
      'id',
      documents.map((document) => document.id),
    );
  if (error) throw error;
  const paths = new Map((data ?? []).map((row) => [row.id, row.storage_path]));
  const withFile = documents.filter((document) => paths.get(document.id));
  const withoutOriginal = documents
    .filter((document) => !paths.get(document.id))
    .map((document) => document.documentNumber || document.id.slice(0, 8));
  if (withFile.length === 0) return { zip: null, included: 0, withoutOriginal };

  const names = zipEntryNames(withFile, (id) => storageExtension(paths.get(id)!));
  const entries = await Promise.all(
    withFile.map(async (document) => {
      const { data: file, error: fileError } = await supabase.storage
        .from('finance-documents')
        .download(paths.get(document.id)!);
      if (fileError || !file) throw fileError ?? new Error('ORIGINAL_MISSING');
      return { name: names.get(document.id)!, bytes: new Uint8Array(await file.arrayBuffer()) };
    }),
  );
  return { zip: buildZip(entries), included: entries.length, withoutOriginal };
}

/** Befunde, deren Wert Steuerart und Satz ist (`reverse_charge|19.00`). */
const TAX_VALUE_CODES = new Set(['account_missing', 'split_mismatch', 'tax_key_unknown']);

function FindingList({ findings, direction }: { findings: Finding[]; direction: ExportDirection }) {
  const { t, i18n } = useTranslation();
  return (
    <ul className="mt-1 list-disc pl-5">
      {findings.map((finding, index) => {
        // Der Eingang hat eigene Texte, wo das Konto anders heißt
        // (Aufwand statt Erlös); sonst gilt der gemeinsame.
        const incomingKey = `domain:datevExport.findingsIncoming.${finding.code}`;
        const key =
          direction === 'incoming' && i18n.exists(incomingKey)
            ? incomingKey
            : `domain:datevExport.findings.${finding.code}`;
        const value = finding.value ?? '';
        return (
          <li key={`${finding.code}-${finding.document ?? ''}-${index}`}>
            {t(key, {
              document: finding.document ?? '',
              value: TAX_VALUE_CODES.has(finding.code) ? formatTaxValue(value) : value,
            })}
          </li>
        );
      })}
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

function CheckResult({
  check,
  direction,
  onRetry,
}: {
  check: CheckOutcome;
  direction: ExportDirection;
  onRetry: () => void;
}) {
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
            <FindingList findings={errors} direction={direction} />
            <RouterLink to={routes.settings}>{t('domain:datevExport.toSettings')}</RouterLink>
          </MessageBarBody>
        </MessageBar>
      ) : check.bookings === 0 ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            {t(
              direction === 'incoming'
                ? 'domain:datevExport.emptyIncoming'
                : 'domain:datevExport.empty',
            )}
          </MessageBarBody>
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
            <FindingList findings={warnings} direction={direction} />
          </MessageBarBody>
        </MessageBar>
      ) : null}
    </>
  );
}

/**
 * „DATEV-Export“ (#168, #169): Belegart und Monat wählen, die Prüfung läuft
 * sofort (`check_only`), und erst wenn DATEV den Monat importieren kann, gibt
 * es den Buchungsstapel zum Herunterladen. Ausgangs- und Eingangsrechnungen
 * sind getrennte Stapel. Die Datei baut die Edge Function `datev-export`
 * (bautakt-app).
 *
 * Die Rechte prüft die Datenbank (`datev_sales_export`,
 * `datev_incoming_export`); die Route zeigt die Seite nur mit denselben
 * Rechten. Die Belegart „Eingangsrechnungen“ gibt es nur mit dem Recht, alle
 * Eingangsrechnungen des Betriebs zu sehen.
 */
export function DatevExportPage() {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const canViewFinance = usePermission('canViewCompanyFinance');
  const canManageOverhead = usePermission('canManageOverheadCosts');
  const canExportIncoming = canViewFinance || canManageOverhead;

  const today = todayIso();
  const options = useMemo(() => monthOptions(today, MONTH_COUNT), [today]);
  const [selected, setSelected] = useState(() => monthValue(previousMonth(today)));
  const month = parseMonthValue(selected);
  const [chosenDirection, setDirection] = useState<ExportDirection>('outgoing');
  const direction: ExportDirection = canExportIncoming ? chosenDirection : 'outgoing';

  const check = useQuery({
    queryKey: ['datev-export-check', companyId, direction, selected],
    enabled: Boolean(companyId && month),
    // Festgeschriebene Belege und Einstellungen ändern sich woanders; beim
    // Zurückkommen auf die Seite neu prüfen statt einen alten Stand zu zeigen.
    staleTime: 0,
    queryFn: async () => {
      const response = await invokeExport({
        company_id: companyId,
        ...month,
        direction,
        check_only: true,
      });
      return readCheckResponse(response.status, response.body);
    },
  });

  const download = useMutation({
    mutationFn: async ({
      target,
      kind,
    }: {
      target: ExportMonth;
      kind: ExportDirection;
    }): Promise<DownloadResult> => {
      const response = await invokeExport({ company_id: companyId, ...target, direction: kind });
      const outcome = readExportResponse(response.status, response.body);
      if (outcome.kind !== 'file') {
        // Zwischen Prüfung und Download hat sich etwas geändert: neu prüfen.
        void check.refetch();
        return outcome;
      }
      // Erst alles bauen, dann die Dateien geben: Scheitert ein Beleg, gibt
      // es auch keinen Buchungsstapel ohne seine Belege.
      const belege =
        kind === 'incoming'
          ? await buildOriginalsZip(companyId!, outcome.documents)
          : {
              zip: await buildBelegZip(companyId!, outcome.documents),
              included: outcome.documents.length,
              withoutOriginal: [],
            };
      const zipName = belege.zip ? zipFileName(target, kind) : null;
      downloadBytes(outcome.bytes, outcome.fileName, 'text/csv;charset=windows-1252');
      if (belege.zip && zipName) downloadBytes(belege.zip, zipName, 'application/zip');
      return {
        kind: 'downloaded',
        csvName: outcome.fileName,
        zipName,
        documents: belege.included,
        withoutOriginal: belege.withoutOriginal,
      };
    },
  });

  const ready = check.data?.kind === 'checked' && check.data.importable && check.data.bookings > 0;
  const start = () => {
    if (month && companyId) download.mutate({ target: month, kind: direction });
  };

  return (
    <div className="flex flex-col gap-6">
      <FinanceHeader description={t('domain:datevExport.description')} />

      <Card size="large">
        <div className="flex flex-wrap items-end gap-3">
          {canExportIncoming ? (
            <Field label={t('domain:datevExport.directionLabel')}>
              <Select
                value={direction}
                onChange={(_, { value }) => {
                  setDirection(parseDirection(value));
                  download.reset();
                }}
              >
                {EXPORT_DIRECTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`domain:datevExport.direction.${option}`)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
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
          <CheckResult
            check={check.data}
            direction={direction}
            onRetry={() => void check.refetch()}
          />
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
              {download.data.zipName
                ? t('domain:datevExport.downloaded', {
                    csvName: download.data.csvName,
                    zipName: download.data.zipName,
                    count: download.data.documents,
                  })
                : t('domain:datevExport.downloadedWithoutZip', {
                    csvName: download.data.csvName,
                  })}
            </MessageBarBody>
          </MessageBar>
        ) : null}
        {download.data?.kind === 'downloaded' && download.data.withoutOriginal.length > 0 ? (
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>
              {t('domain:datevExport.withoutOriginal', {
                count: download.data.withoutOriginal.length,
                documents: download.data.withoutOriginal.join(', '),
              })}
            </MessageBarBody>
          </MessageBar>
        ) : null}
      </Card>
    </div>
  );
}
