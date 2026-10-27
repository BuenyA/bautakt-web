import { todayIso } from '@bautakt/finance';
import {
  Button,
  Card,
  CardHeader,
  Field,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { ArrowDownloadRegular } from '@fluentui/react-icons';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { useMembership } from '@/features/company/useMembership';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { downloadBytes } from './archiveFiles';
import {
  type ExportMonth,
  type ExportOutcome,
  type Finding,
  monthOptions,
  monthValue,
  parseMonthValue,
  previousMonth,
  readExportResponse,
} from './datevExport';

/** Zwei Jahre zurück: weiter reicht ein Nachexport selten. */
const MONTH_COUNT = 24;

const monthFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });

async function runExport(companyId: string, month: ExportMonth): Promise<ExportOutcome> {
  const { data, error } = await supabase.functions.invoke<unknown>('datev-export', {
    body: { company_id: companyId, ...month },
  });
  if (!error) return readExportResponse(200, data);
  // FunctionsHttpError trägt die Antwort der Function in `context`. Ohne
  // Response kam keine Antwort an (Netz): Das soll der Nutzer wiederholen.
  const response: unknown = (error as { context?: unknown }).context;
  if (!(response instanceof Response)) throw error;
  const body: unknown = await response.json().catch(() => null);
  return readExportResponse(response.status, body);
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

/**
 * „Export im DATEV-Format“ (#168): einen Monat wählen, die Datei
 * herunterladen. Kann DATEV den Monat nicht importieren, gibt es keine Datei,
 * sondern die Gründe je Beleg.
 *
 * Die Rechte prüft die Datenbank (`datev_sales_export`): Mitglied und
 * Rechnungen oder Firmenfinanzen. Die Seite zeigt die Karte nur dann.
 */
export function DatevExportCard() {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  const today = todayIso();
  const options = useMemo(() => monthOptions(today, MONTH_COUNT), [today]);
  const [selected, setSelected] = useState(() => monthValue(previousMonth(today)));

  const exportMonth = useMutation({
    mutationFn: async (month: ExportMonth) => {
      const outcome = await runExport(companyId!, month);
      if (outcome.kind === 'file') {
        downloadBytes(outcome.bytes, outcome.fileName, 'text/csv;charset=windows-1252');
      }
      return outcome;
    },
  });

  const month = parseMonthValue(selected);
  const start = () => {
    if (month && companyId) exportMonth.mutate(month);
  };

  const outcome = exportMonth.data;
  const errors =
    outcome && 'findings' in outcome ? outcome.findings.filter((f) => f.severity === 'error') : [];
  const warnings =
    outcome && 'findings' in outcome
      ? outcome.findings.filter((f) => f.severity === 'warning')
      : [];

  return (
    <Card size="large">
      <CardHeader
        header={
          <Text as="h2" size={400} weight="semibold">
            {t('domain:datevExport.title')}
          </Text>
        }
        description={<Text>{t('domain:datevExport.description')}</Text>}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('domain:datevExport.monthLabel')}>
          <Select
            value={selected}
            onChange={(_, { value }) => {
              setSelected(value);
              exportMonth.reset();
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
          icon={exportMonth.isPending ? <Spinner size="tiny" /> : <ArrowDownloadRegular />}
          disabled={!month || !companyId || exportMonth.isPending}
          onClick={start}
        >
          {exportMonth.isPending
            ? t('domain:datevExport.loading')
            : t('domain:datevExport.download')}
        </Button>
      </div>

      {exportMonth.isError ? (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>{t('domain:datevExport.failed.unknown')}</MessageBarBody>
          <MessageBarActions>
            <Button onClick={start}>{t('common:action.retry')}</Button>
          </MessageBarActions>
        </MessageBar>
      ) : null}

      {outcome?.kind === 'failed' ? (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>{t(`domain:datevExport.failed.${outcome.reason}`)}</MessageBarBody>
          {outcome.reason === 'unknown' ? (
            <MessageBarActions>
              <Button onClick={start}>{t('common:action.retry')}</Button>
            </MessageBarActions>
          ) : null}
        </MessageBar>
      ) : null}

      {outcome?.kind === 'blocked' ? (
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {t('domain:datevExport.blocked')}
            <FindingList findings={errors} />
            <RouterLink to={routes.settings}>{t('domain:datevExport.toSettings')}</RouterLink>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {outcome?.kind === 'file' ? (
        <MessageBar intent="success" layout="multiline">
          <MessageBarBody>
            {t('domain:datevExport.done', { count: outcome.bookings, fileName: outcome.fileName })}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {outcome?.kind === 'empty' ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>{t('domain:datevExport.empty')}</MessageBarBody>
        </MessageBar>
      ) : null}

      {outcome && outcome.kind !== 'blocked' && warnings.length > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            {t('domain:datevExport.warnings')}
            <FindingList findings={warnings} />
          </MessageBarBody>
        </MessageBar>
      ) : null}
    </Card>
  );
}
