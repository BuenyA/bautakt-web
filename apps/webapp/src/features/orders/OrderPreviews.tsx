import { SkeletonBlock, toast } from '@bautakt/ui';
import { Checkbox, ProgressBar, Text } from '@fluentui/react-components';
import {
  AddRegular,
  ArrowUploadRegular,
  BoxRegular,
  ClockRegular,
  DocumentMultipleRegular,
  ImageMultipleRegular,
  NotebookRegular,
  NoteRegular,
  TaskListSquareLtrRegular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { canCreateTimeEntry } from '@/features/times/timeEntryAccess';
import { formatMinutesAsHours, sumNetMinutes, totalsByEmployee } from '@/features/times/timeTotals';
import { useTimeEntries } from '@/features/times/useTimeEntries';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { canCreateDailyReport } from './dailyReportAccess';
import { DocumentIcon } from './OrderDocuments';
import { canCreateOrderMaterial } from './orderMaterialAccess';
import {
  OrderPreviewCard,
  PreviewEmpty,
  PreviewError,
  PreviewRow,
  PreviewSkeleton,
} from './OrderPreviewCard';
import { ORDER_SECTION_TITLE } from './orderSections';
import { useOrderChecklist } from './useOrderChecklist';
import { useSaveOrderChecklist } from './useOrderChecklistMutations';
import { formatReportDate, useOrderDailyReports } from './useOrderDailyReports';
import { useOrderDocuments } from './useOrderDocuments';
import { useOrderImages } from './useOrderImages';
import { materialLabel, useOrderMaterials } from './useOrderMaterials';
import { useOrderNotes } from './useOrderNotes';

/** So viele Zeilen zeigt eine Karte; der Rest steht auf der Unterseite. */
const PREVIEW_ROWS = 3;
const PREVIEW_PHOTOS = 4;

const quantityFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 });

/** Erste nicht leere Zeile — Notizen ohne Titel zeigen ihren Anfang. */
function firstLine(text: string): string {
  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  );
}

export function PhotosPreview({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const canTakePhotos = usePermission('canTakePhotos');
  const photos = useOrderImages(orderId);
  const isLoading = useCompanyListLoading(photos);
  const list = photos.data ?? [];

  return (
    <OrderPreviewCard
      icon={<ImageMultipleRegular />}
      title={t(ORDER_SECTION_TITLE.photos)}
      count={list.length}
      to={routes.orderSection(orderId, 'photos')}
      quickAction={
        canTakePhotos
          ? {
              // Ein Dateidialog lässt sich nur aus einem Klick öffnen, nicht
              // nach dem Seitenwechsel — die Karte führt zur Upload-Fläche.
              to: routes.orderSection(orderId, 'photos'),
              label: t('domain:photoForm.upload'),
              icon: <ArrowUploadRegular />,
            }
          : undefined
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-4 gap-2" role="status">
          <span className="sr-only">{t('common:state.loading')}</span>
          {Array.from({ length: PREVIEW_PHOTOS }, (_, index) => (
            <SkeletonBlock key={index} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : photos.isError ? (
        <PreviewError onRetry={() => void photos.refetch()} />
      ) : list.length === 0 ? (
        <PreviewEmpty>{t('domain:orders.photos.emptyTitle')}</PreviewEmpty>
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {list.slice(0, PREVIEW_PHOTOS).map((photo) => (
            <li key={photo.id}>
              <img
                src={photo.signedUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="bg-surface aspect-square w-full rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      )}
    </OrderPreviewCard>
  );
}

/** Die neuesten Dokumente, unabhängig vom Ordner. Ohne Leserecht fehlt die Karte. */
export function DocumentsPreview({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const canUpload = usePermission('canUploadAndEditDocuments');
  const documents = useOrderDocuments(orderId);
  const isLoading = useCompanyListLoading(documents);
  const list = documents.data ?? [];

  return (
    <OrderPreviewCard
      icon={<DocumentMultipleRegular />}
      title={t(ORDER_SECTION_TITLE.documents)}
      count={list.length}
      to={routes.orderSection(orderId, 'documents')}
      quickAction={
        canUpload
          ? {
              // Wie bei den Fotos: der Dateidialog gehört auf die Unterseite.
              to: routes.orderSection(orderId, 'documents'),
              label: t('domain:orders.documents.upload'),
              icon: <ArrowUploadRegular />,
            }
          : undefined
      }
    >
      {isLoading ? (
        <PreviewSkeleton />
      ) : documents.isError ? (
        <PreviewError onRetry={() => void documents.refetch()} />
      ) : list.length === 0 ? (
        <PreviewEmpty>{t('domain:orders.documents.emptyTitle')}</PreviewEmpty>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.slice(0, PREVIEW_ROWS).map((document) => (
            <PreviewRow
              key={document.id}
              primary={
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground flex shrink-0" aria-hidden>
                    <DocumentIcon document={document} />
                  </span>
                  <span className="truncate">{document.name}</span>
                </span>
              }
              secondary={formatDate(document.createdAt)}
            />
          ))}
        </ul>
      )}
    </OrderPreviewCard>
  );
}

export function NotesPreview({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const canCreate = usePermission('canCreateNotes');
  const notes = useOrderNotes(orderId);
  const isLoading = useCompanyListLoading(notes);
  const list = notes.data ?? [];

  return (
    <OrderPreviewCard
      icon={<NoteRegular />}
      title={t(ORDER_SECTION_TITLE.notes)}
      count={list.length}
      to={routes.orderSection(orderId, 'notes')}
      quickAction={
        canCreate
          ? {
              to: routes.orderSectionCreate(orderId, 'notes'),
              label: t('domain:orders.preview.newNote'),
              icon: <AddRegular />,
            }
          : undefined
      }
    >
      {isLoading ? (
        <PreviewSkeleton />
      ) : notes.isError ? (
        <PreviewError onRetry={() => void notes.refetch()} />
      ) : list.length === 0 ? (
        <PreviewEmpty>{t('domain:orders.notes.emptyTitle')}</PreviewEmpty>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.slice(0, PREVIEW_ROWS).map((note) => (
            <PreviewRow
              key={note.id}
              primary={note.title.trim() || firstLine(note.body)}
              secondary={formatDate(note.createdAt)}
            />
          ))}
        </ul>
      )}
    </OrderPreviewCard>
  );
}

/**
 * Fortschritt und die nächsten offenen Punkte. Abhaken geht direkt hier —
 * das ist die häufigste Handlung an der Checkliste. Ohne Lese- oder
 * Schreibrecht gibt es die Karte nicht (die Übersicht blendet sie aus).
 */
export function ChecklistPreview({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const canEdit = usePermission('canEditChecklist');
  const save = useSaveOrderChecklist();
  const checklist = useOrderChecklist(orderId, true);
  const isLoading = useCompanyListLoading(checklist);
  const items = checklist.data?.items ?? [];
  const done = items.filter((item) => item.isDone).length;
  const open = items.filter((item) => !item.isDone).slice(0, PREVIEW_ROWS);

  async function onToggle(id: string, isDone: boolean) {
    try {
      await save.mutateAsync({ kind: 'toggle', orderId, id, isDone });
    } catch (caught) {
      toast.error(t('domain:checklistForm.toggleError'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  }

  return (
    <OrderPreviewCard
      icon={<TaskListSquareLtrRegular />}
      title={t(ORDER_SECTION_TITLE.checklist)}
      to={routes.orderSection(orderId, 'checklist')}
      quickAction={
        canEdit
          ? {
              to: routes.orderSectionCreate(orderId, 'checklist'),
              label: t('domain:checklistForm.newTitle'),
              icon: <AddRegular />,
            }
          : undefined
      }
    >
      {isLoading ? (
        <PreviewSkeleton />
      ) : checklist.isError ? (
        <PreviewError onRetry={() => void checklist.refetch()} />
      ) : items.length === 0 ? (
        <PreviewEmpty>{t('domain:orders.checklist.emptyTitle')}</PreviewEmpty>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Text size={200} className="text-muted-foreground">
              {t('domain:orders.checklist.progress', { done, total: items.length })}
            </Text>
            <ProgressBar
              value={done / items.length}
              thickness="large"
              color={done === items.length ? 'success' : 'brand'}
              aria-label={t('domain:orders.checklist.progress', { done, total: items.length })}
            />
          </div>
          {open.length === 0 ? (
            <PreviewEmpty>{t('domain:orders.preview.checklistDone')}</PreviewEmpty>
          ) : (
            <ul className="flex flex-col">
              {open.map((item) => {
                const title = item.title.trim() || t('domain:orders.checklist.untitled');
                return (
                  <li key={item.id} className="min-w-0">
                    <Checkbox
                      checked={false}
                      disabled={!canEdit}
                      label={<span className="block truncate">{title}</span>}
                      aria-label={t('domain:orders.checklist.toggle', { title })}
                      onChange={() => void onToggle(item.id, true)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </OrderPreviewCard>
  );
}

/** Stunden gesamt und die drei Mitarbeiter mit den meisten Stunden. */
export function TimesPreview({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const canCreate = canCreateTimeEntry(membership?.permissions);
  const entries = useTimeEntries({ orderId });
  const isLoading = useCompanyListLoading(entries);
  const rows = entries.data ?? [];

  return (
    <OrderPreviewCard
      icon={<ClockRegular />}
      title={t(ORDER_SECTION_TITLE.times)}
      count={rows.length}
      to={routes.orderSection(orderId, 'times')}
      quickAction={
        canCreate
          ? {
              to: routes.orderSectionCreate(orderId, 'times'),
              label: t('domain:timeForm.newTitle'),
              icon: <AddRegular />,
            }
          : undefined
      }
    >
      {isLoading ? (
        <PreviewSkeleton />
      ) : entries.isError ? (
        <PreviewError onRetry={() => void entries.refetch()} />
      ) : rows.length === 0 ? (
        <PreviewEmpty>{t('domain:orders.times.emptyTitle')}</PreviewEmpty>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <Text size={200} className="text-muted-foreground">
              {t('domain:orders.times.totalAll')}
            </Text>
            <Text size={500} weight="semibold" className="tabular-nums">
              {formatMinutesAsHours(sumNetMinutes(rows))}
            </Text>
          </div>
          <ul className="flex flex-col gap-2">
            {totalsByEmployee(rows)
              .slice(0, PREVIEW_ROWS)
              .map((total) => (
                <PreviewRow
                  key={total.key}
                  primary={total.name || t('domain:times.noEmployee')}
                  secondary={formatMinutesAsHours(total.minutes)}
                />
              ))}
          </ul>
        </>
      )}
    </OrderPreviewCard>
  );
}

export function MaterialsPreview({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const canCreate = canCreateOrderMaterial(membership?.permissions);
  const materials = useOrderMaterials(orderId);
  const isLoading = useCompanyListLoading(materials);
  const list = materials.data ?? [];

  return (
    <OrderPreviewCard
      icon={<BoxRegular />}
      title={t(ORDER_SECTION_TITLE.materials)}
      count={list.length}
      to={routes.orderSection(orderId, 'materials')}
      quickAction={
        canCreate
          ? {
              to: routes.orderSectionCreate(orderId, 'materials'),
              label: t('domain:orders.preview.newMaterial'),
              icon: <AddRegular />,
            }
          : undefined
      }
    >
      {isLoading ? (
        <PreviewSkeleton />
      ) : materials.isError ? (
        <PreviewError onRetry={() => void materials.refetch()} />
      ) : list.length === 0 ? (
        <PreviewEmpty>{t('domain:orders.materials.emptyTitle')}</PreviewEmpty>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.slice(0, PREVIEW_ROWS).map((row) => (
            <PreviewRow
              key={row.id}
              primary={materialLabel(row) || t('domain:orders.materials.noTitle')}
              secondary={`${quantityFormatter.format(row.quantity)} ${row.unit}`.trim()}
            />
          ))}
        </ul>
      )}
    </OrderPreviewCard>
  );
}

/** Nur mit Recht auf das Bautagebuch; die Übersicht blendet die Karte sonst aus. */
export function ReportsPreview({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const canCreate = canCreateDailyReport(membership?.permissions);
  const reports = useOrderDailyReports(orderId, canCreate);
  const isLoading = useCompanyListLoading(reports);
  const list = reports.data ?? [];

  return (
    <OrderPreviewCard
      icon={<NotebookRegular />}
      title={t(ORDER_SECTION_TITLE.reports)}
      count={list.length}
      to={routes.orderSection(orderId, 'reports')}
      quickAction={
        canCreate
          ? {
              to: routes.orderSectionCreate(orderId, 'reports'),
              label: t('domain:orders.preview.newReport'),
              icon: <AddRegular />,
            }
          : undefined
      }
    >
      {isLoading ? (
        <PreviewSkeleton />
      ) : reports.isError ? (
        <PreviewError onRetry={() => void reports.refetch()} />
      ) : list.length === 0 ? (
        <PreviewEmpty>{t('domain:orders.dailyReports.emptyTitle')}</PreviewEmpty>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.slice(0, PREVIEW_ROWS).map((report) => (
            <PreviewRow
              key={report.id}
              primary={firstLine(report.workDone) || t('domain:orders.preview.reportNoText')}
              secondary={formatReportDate(report.date)}
            />
          ))}
        </ul>
      )}
    </OrderPreviewCard>
  );
}
