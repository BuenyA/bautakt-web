import { SkeletonBlock } from '@bautakt/ui';
import {
  Button,
  Link,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  ProgressBar,
  Text,
} from '@fluentui/react-components';
import { ArrowDownload20Regular, ArrowSync20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';
import { SectionCard } from '@/features/contacts/SectionCard';
import { formatDateTime } from '@/lib/format';

import { useCompanyAccess } from '../companyAccess';
import { exportErrorKey, exportView, formatBytes } from '../fullExport';
import { SectionGuard } from '../SectionGuard';
import { FullExportError, useFullExport, useStartFullExport } from '../useFullExport';

/**
 * Vollexport als ZIP (Löschkonzept WP2). Nur der Inhaber; die Function prüft das selbst,
 * die Seite blendet nur aus. Links gelten 24 h nach Fertigstellung, jeder Abruf holt
 * frische, kurzlebige Links.
 */
export function FullExportPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const status = useFullExport();
  const start = useStartFullExport();
  const view = exportView(status.data);
  const running = view.kind === 'running' || start.isPending;

  const startError = start.error instanceof FullExportError ? start.error.code : undefined;

  return (
    <SectionGuard allowed={access.danger.view}>
      <SubPage
        title={t('companySettings:export.title')}
        description={t('companySettings:export.description')}
      >
        <SectionCard title={t('companySettings:export.cardTitle')}>
          <Text>{t('companySettings:export.intro')}</Text>
          <ul className="text-muted-foreground list-disc pl-5 text-sm">
            <li>{t('companySettings:export.contents.tables')}</li>
            <li>{t('companySettings:export.contents.files')}</li>
            <li>{t('companySettings:export.contents.datev')}</li>
            <li>{t('companySettings:export.contents.manifest')}</li>
          </ul>
          <Text className="text-muted-foreground" size={200}>
            {t('companySettings:export.notIncluded')}
          </Text>

          {status.isPending ? (
            <SkeletonBlock className="h-10" />
          ) : status.isError ? (
            <MessageBar intent="error">
              <MessageBarBody>{t('companySettings:export.errors.status')}</MessageBarBody>
            </MessageBar>
          ) : null}

          {view.kind === 'running' && (
            <div className="flex flex-col gap-2">
              <Text weight="semibold">{t('companySettings:export.running')}</Text>
              <ProgressBar value={view.total > 0 ? view.done / view.total : undefined} />
              <Text className="text-muted-foreground" size={200}>
                {view.total > 0
                  ? t('companySettings:export.progress', { done: view.done, total: view.total })
                  : t('companySettings:export.preparing')}
              </Text>
            </div>
          )}

          {view.kind === 'failed' && (
            <MessageBar intent="error" layout="multiline">
              <MessageBarBody>
                <MessageBarTitle>{t('companySettings:export.failedTitle')}</MessageBarTitle>
                {t('companySettings:export.failed', { date: formatDateTime(view.requestedAt) })}
              </MessageBarBody>
            </MessageBar>
          )}

          {view.kind === 'expired' && (
            <MessageBar intent="info">
              <MessageBarBody>
                {t('companySettings:export.expired', { date: formatDateTime(view.completedAt) })}
              </MessageBarBody>
            </MessageBar>
          )}

          {view.kind === 'ready' && (
            <div className="flex flex-col gap-3">
              <MessageBar intent="success" layout="multiline">
                <MessageBarBody>
                  <MessageBarTitle>{t('companySettings:export.readyTitle')}</MessageBarTitle>
                  {t('companySettings:export.ready', {
                    date: formatDateTime(view.completedAt),
                    until: formatDateTime(view.validUntil),
                    files: view.fileCount,
                    rows: view.rowCount,
                  })}
                </MessageBarBody>
              </MessageBar>
              <ul className="flex flex-col gap-2">
                {view.downloads.map((d) => (
                  <li key={d.file} className="flex flex-wrap items-center gap-3">
                    <ArrowDownload20Regular />
                    <Link href={d.url} download>
                      {d.kind === 'manifest'
                        ? t('companySettings:export.manifestFile')
                        : d.kind === 'data'
                          ? t('companySettings:export.dataFile')
                          : t('companySettings:export.filesFile', { file: d.file })}
                    </Link>
                    {d.bytes !== null && (
                      <Text className="text-muted-foreground" size={200}>
                        {formatBytes(d.bytes)}
                      </Text>
                    )}
                  </li>
                ))}
              </ul>
              <Text className="text-muted-foreground" size={200}>
                {t('companySettings:export.checksumHint')}
              </Text>
            </div>
          )}

          {startError && (
            <MessageBar intent="error">
              <MessageBarBody>{t(exportErrorKey(startError))}</MessageBarBody>
            </MessageBar>
          )}

          <div>
            <Button
              appearance={view.kind === 'ready' ? 'secondary' : 'primary'}
              icon={view.kind === 'none' ? <ArrowDownload20Regular /> : <ArrowSync20Regular />}
              disabled={running || status.isPending}
              onClick={() => start.mutate()}
            >
              {view.kind === 'none'
                ? t('companySettings:export.start')
                : t('companySettings:export.restart')}
            </Button>
          </div>
        </SectionCard>
      </SubPage>
    </SectionGuard>
  );
}
