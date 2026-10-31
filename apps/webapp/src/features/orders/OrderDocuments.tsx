import { SkeletonBlock, toast } from '@bautakt/ui';
import {
  Button,
  Card,
  CardHeader,
  CounterBadge,
  Dropdown,
  Label,
  Link as FluentLink,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  Text,
} from '@fluentui/react-components';
import {
  ArrowUploadRegular,
  DeleteRegular,
  DocumentPdfRegular,
  DocumentRegular,
  DocumentTextRegular,
  EditRegular,
  ImageRegular,
  MoreHorizontalRegular,
} from '@fluentui/react-icons';
import { type ReactNode, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { FileDropzone } from '@/components/common/FileDropzone';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';

import { OrderDocumentDeleteDialog, OrderDocumentEditDialog } from './OrderDocumentDialogs';
import {
  defaultDocumentName,
  formatFileSize,
  groupByFolder,
  ORDER_DOCUMENT_ACCEPT,
  orderDocumentKind,
} from './orderDocumentFiles';
import { orderDocumentErrorCode, useUploadOrderDocument } from './useOrderDocumentMutations';
import {
  type OrderDocument,
  useOrderDocumentCategories,
  useOrderDocuments,
} from './useOrderDocuments';

/** Dorthin landen Uploads, solange niemand einen Ordner wählt. */
const DEFAULT_UPLOAD_SLUG = 'other';

export function DocumentIcon({ document }: { document: OrderDocument }) {
  switch (orderDocumentKind(document.mimeType, document.fileName)) {
    case 'pdf':
      return <DocumentPdfRegular />;
    case 'image':
      return <ImageRegular />;
    case 'text':
      return <DocumentTextRegular />;
    default:
      return <DocumentRegular />;
  }
}

/**
 * Dokumente eines Auftrags, Unterseite `/auftraege/:id/dokumente`: Baupläne,
 * Verträge, Scans und die archivierten Belege, in den Ordnern der Handy-App.
 *
 * Lesen mit `canViewDocuments`, Hochladen, Ändern und Löschen mit
 * `canUploadAndEditDocuments`. Die Datenbank bleibt die Grenze.
 */
export function OrderDocuments({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const canEdit = usePermission('canUploadAndEditDocuments');
  const upload = useUploadOrderDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const targetFieldId = useId();
  const uploadingRef = useRef(false);
  const documents = useOrderDocuments(orderId);
  const categories = useOrderDocumentCategories();
  const isLoading = useCompanyListLoading(documents) || categories.isPending;
  const [targetId, setTargetId] = useState<string | null>(null);
  const [editing, setEditing] = useState<OrderDocument | null>(null);
  const [deleting, setDeleting] = useState<OrderDocument | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const allCategories = categories.data ?? [];
  const uploadChoices = allCategories.filter((item) => !item.isHidden);
  const target =
    uploadChoices.find((item) => item.id === targetId) ??
    uploadChoices.find((item) => item.slug === DEFAULT_UPLOAD_SLUG) ??
    uploadChoices[0];

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || uploadingRef.current || !target) return;
    uploadingRef.current = true;
    setUploadError(null);
    let succeeded = 0;
    const failures: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      setProgress({ current: index + 1, total: files.length });
      try {
        await upload.mutateAsync({
          orderId,
          categoryId: target.id,
          name: defaultDocumentName(file.name),
          file,
        });
        succeeded += 1;
      } catch (caught) {
        failures.push(
          t('domain:orders.documents.failedLine', {
            name: file.name,
            message: uploadErrorMessage(caught, t),
          }),
        );
      }
    }

    setProgress(null);
    uploadingRef.current = false;

    if (succeeded > 0 && failures.length === 0) {
      toast.success(
        t('domain:orders.documents.uploaded', { count: succeeded, folder: target.name }),
      );
      return;
    }
    if (failures.length > 0) {
      const summary =
        succeeded > 0
          ? t('domain:orders.documents.partial', { done: succeeded, total: files.length })
          : null;
      setUploadError([summary, ...failures].filter(Boolean).join('\n'));
    }
  }

  let body: ReactNode;
  if (isLoading) {
    body = <FoldersSkeleton label={t('common:state.loading')} />;
  } else if (documents.isError || categories.isError) {
    body = (
      <EmptyState
        title={t('domain:orders.documents.loadErrorTitle')}
        description={t('domain:orders.photos.loadErrorDescription')}
        action={
          <FluentLink
            as="button"
            onClick={() => {
              void documents.refetch();
              void categories.refetch();
            }}
          >
            {t('common:action.retry')}
          </FluentLink>
        }
      />
    );
  } else if (!documents.data || documents.data.length === 0) {
    body = (
      <EmptyState
        title={t('domain:orders.documents.emptyTitle')}
        description={
          canEdit
            ? t('domain:orders.documents.emptyDescriptionWrite')
            : t('domain:orders.documents.emptyDescription')
        }
      />
    );
  } else {
    body = (
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {groupByFolder(documents.data, allCategories, t('domain:orders.documents.noFolder')).map(
          (folder) => (
            <Card key={folder.id || 'unknown'} size="large">
              <CardHeader
                header={
                  <span className="flex items-center gap-2">
                    <Text as="h3" size={400} weight="semibold">
                      {folder.name}
                    </Text>
                    <CounterBadge
                      count={folder.documents.length}
                      overflowCount={999}
                      color="informative"
                    />
                  </span>
                }
              />
              <ul className="flex flex-col">
                {folder.documents.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    canEdit={canEdit}
                    onEdit={() => setEditing(document)}
                    onDelete={() => setDeleting(document)}
                  />
                ))}
              </ul>
            </Card>
          ),
        )}
      </div>
    );
  }

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="order-documents-title"
      aria-busy={progress !== null}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="order-documents-title"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {t('domain:orders.documents.title')}
        </h2>
        {canEdit && target ? (
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={targetFieldId}>{t('domain:orders.documents.uploadTarget')}</Label>
            <Dropdown
              id={targetFieldId}
              className="min-w-40"
              value={target.name}
              selectedOptions={[target.id]}
              disabled={progress !== null}
              onOptionSelect={(_, data) => {
                if (data.optionValue) setTargetId(data.optionValue);
              }}
            >
              {uploadChoices.map((item) => (
                <Option key={item.id} value={item.id}>
                  {item.name}
                </Option>
              ))}
            </Dropdown>
            <Button
              appearance="primary"
              type="button"
              disabled={progress !== null}
              onClick={() => inputRef.current?.click()}
              icon={<ArrowUploadRegular />}
            >
              {t('domain:orders.documents.upload')}
            </Button>
          </div>
        ) : null}
      </div>

      {canEdit && target ? (
        <FileDropzone
          accept={ORDER_DOCUMENT_ACCEPT}
          title={t('domain:orders.documents.dropTitle', { folder: target.name })}
          hint={t('domain:orders.documents.dropHint')}
          busy={progress !== null}
          inputRef={inputRef}
          onFiles={(files) => void uploadFiles(files)}
        />
      ) : null}

      {progress ? (
        <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
          {t('domain:orders.documents.progress', {
            current: progress.current,
            total: progress.total,
          })}
        </p>
      ) : null}

      {uploadError ? (
        <p role="alert" className="text-destructive text-sm whitespace-pre-line">
          {uploadError}
        </p>
      ) : null}

      {body}

      {editing ? (
        <OrderDocumentEditDialog
          document={editing}
          categories={allCategories}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? (
        <OrderDocumentDeleteDialog document={deleting} onClose={() => setDeleting(null)} />
      ) : null}
    </section>
  );
}

function DocumentRow({
  document,
  canEdit,
  onEdit,
  onDelete,
}: {
  document: OrderDocument;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const details = [
    document.fileName,
    formatFileSize(document.fileSize),
    formatDate(document.createdAt),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="border-border flex items-center gap-3 border-t py-2 first:border-t-0">
      <span className="text-brand flex shrink-0 text-xl" aria-hidden>
        <DocumentIcon document={document} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {document.signedUrl ? (
          <FluentLink
            href={document.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate"
            aria-label={t('domain:orders.documents.openLabel', { name: document.name })}
          >
            {document.name}
          </FluentLink>
        ) : (
          <span className="text-foreground truncate text-sm">
            {document.name}{' '}
            <span className="text-muted-foreground">
              ({t('domain:orders.documents.fileMissing')})
            </span>
          </span>
        )}
        <span className="text-muted-foreground truncate text-xs">{details}</span>
      </div>
      {canEdit ? (
        <Menu positioning="below-end">
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              icon={<MoreHorizontalRegular />}
              aria-label={t('domain:orders.documents.actions', { name: document.name })}
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<EditRegular />} onClick={onEdit}>
                {t('domain:orders.documents.edit')}
              </MenuItem>
              <MenuItem icon={<DeleteRegular />} onClick={onDelete}>
                {t('domain:orders.documents.delete')}
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      ) : null}
    </li>
  );
}

function FoldersSkeleton({ label }: { label: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 2 }, (_, index) => (
        <SkeletonBlock key={index} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

function uploadErrorMessage(
  error: unknown,
  t: (
    key:
      | 'domain:orders.documents.unsupported'
      | 'domain:orders.documents.tooLarge'
      | 'domain:photoForm.cleanupFailed'
      | 'domain:orders.documents.uploadError',
  ) => string,
): string {
  switch (orderDocumentErrorCode(error)) {
    case 'UNSUPPORTED_FILE':
      return t('domain:orders.documents.unsupported');
    case 'FILE_TOO_LARGE':
      return t('domain:orders.documents.tooLarge');
    case 'STORAGE_CLEANUP_FAILED':
      return t('domain:photoForm.cleanupFailed');
    default:
      return readableDbError(error) ?? t('domain:orders.documents.uploadError');
  }
}
