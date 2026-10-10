import { SkeletonBlock, toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from '@fluentui/react-components';
import { ArrowUploadRegular, DeleteRegular } from '@fluentui/react-icons';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/useAuth';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { readableDbError } from '@/lib/dbErrors';
import { formatDateTime } from '@/lib/format';

import { canDeleteOrderPhoto } from './orderImageAccess';
import { OrderPhotoDeleteDialog } from './OrderPhotoDeleteDialog';
import { OrderPhotoDropzone } from './OrderPhotoDropzone';
import { orderImageErrorCode, useUploadOrderImage } from './useOrderImageMutations';
import { type OrderPhoto, useOrderImages } from './useOrderImages';

const SKELETON_COUNT = 4;

/**
 * Fotos unter den Stammdaten eines Auftrags.
 *
 * Hochladen mit `canTakePhotos`. Löschen der eigenen Fotos mit demselben
 * Recht, aller Fotos mit `canManageOrders`. Die Datenbank bleibt die Grenze.
 */
export function OrderPhotos({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canTakePhotos = usePermission('canTakePhotos');
  const canManageOrders = usePermission('canManageOrders');
  const upload = useUploadOrderImage();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const photos = useOrderImages(orderId);
  const { data, isError, refetch } = photos;
  const isLoading = useCompanyListLoading(photos);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deletePhoto, setDeletePhoto] = useState<OrderPhoto | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const openPhoto = data?.find((photo) => photo.id === openId) ?? null;
  const openDate = openPhoto ? formatDateTime(openPhoto.takenAt) : '';
  const canDeleteOpen = openPhoto
    ? canDeleteOrderPhoto({
        photoUserId: openPhoto.userId,
        currentUserId: user?.id,
        canTakePhotos,
        canManageOrders,
      })
    : false;

  function askDelete(photo: OrderPhoto) {
    setOpenId(null);
    setDeletePhoto(photo);
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || uploadingRef.current) return;
    uploadingRef.current = true;
    setUploadError(null);
    let succeeded = 0;
    const failures: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      setProgress({ current: index + 1, total: files.length });
      try {
        await upload.mutateAsync({ orderId, file });
        succeeded += 1;
      } catch (caught) {
        failures.push(
          t('domain:photoForm.failedLine', {
            name: file.name,
            message: uploadErrorMessage(caught, t),
          }),
        );
      }
    }

    setProgress(null);
    uploadingRef.current = false;

    if (succeeded > 0 && failures.length === 0) {
      toast.success(t('domain:photoForm.uploaded', { count: succeeded }));
      return;
    }
    if (failures.length > 0) {
      const summary =
        succeeded > 0
          ? t('domain:photoForm.partial', { done: succeeded, total: files.length })
          : null;
      setUploadError([summary, ...failures].filter(Boolean).join('\n'));
    }
  }

  let body: ReactNode;
  if (isLoading) {
    body = <PhotoGridSkeleton label={t('common:state.loading')} />;
  } else if (isError) {
    body = (
      <EmptyState
        title={t('domain:orders.photos.loadErrorTitle')}
        description={t('domain:orders.photos.loadErrorDescription')}
        action={
          <button
            type="button"
            className="text-sm font-medium text-brand hover:underline"
            onClick={() => void refetch()}
          >
            {t('common:action.retry')}
          </button>
        }
      />
    );
  } else if (!data || data.length === 0) {
    body = (
      <EmptyState
        title={t('domain:orders.photos.emptyTitle')}
        description={
          canTakePhotos
            ? t('domain:orders.photos.emptyDescriptionWrite')
            : t('domain:orders.photos.emptyDescription')
        }
      />
    );
  } else {
    body = (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {data.map((photo) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            deletable={canDeleteOrderPhoto({
              photoUserId: photo.userId,
              currentUserId: user?.id,
              canTakePhotos,
              canManageOrders,
            })}
            onOpen={() => setOpenId(photo.id)}
            onDelete={() => askDelete(photo)}
          />
        ))}
      </ul>
    );
  }

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="order-photos-title"
      aria-busy={progress !== null}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="order-photos-title"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {t('domain:orders.photos.title')}
        </h2>
        {canTakePhotos ? (
          <Button
            appearance="primary"
            size="small"
            type="button"
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
            icon={<ArrowUploadRegular />}
          >
            {t('domain:photoForm.upload')}
          </Button>
        ) : null}
      </div>

      {canTakePhotos ? (
        <OrderPhotoDropzone
          busy={progress !== null}
          inputRef={inputRef}
          onFiles={(files) => void uploadFiles(files)}
        />
      ) : null}

      {progress ? (
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <p className="text-muted-foreground text-sm">
            {t('domain:photoForm.progress', { current: progress.current, total: progress.total })}
          </p>
          <div
            className="bg-muted h-1.5 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
          >
            <div
              className="bg-primary h-full transition-[width]"
              style={{ width: `${((progress.current - 0.5) / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {uploadError ? (
        <p role="alert" className="text-destructive text-sm whitespace-pre-line">
          {uploadError}
        </p>
      ) : null}

      {body}

      <Dialog
        open={openPhoto !== null}
        onOpenChange={(_, { open }) => {
          if (!open) setOpenId(null);
        }}
      >
        {/* Breiter als Fluents 600 px: das Foto ist der Inhalt. */}
        <DialogSurface style={{ maxWidth: 'min(48rem, calc(100vw - 2rem))' }}>
          <DialogBody>
            <DialogTitle>{t('domain:orders.photos.lightboxTitle')}</DialogTitle>
            <DialogContent className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                {openDate
                  ? t('domain:orders.photos.takenAt', { date: openDate })
                  : t('domain:orders.photos.openLabelUndated')}
              </p>
              {openPhoto ? (
                <img
                  src={openPhoto.signedUrl}
                  alt={
                    openDate
                      ? t('domain:orders.photos.openLabel', { date: openDate })
                      : t('domain:orders.photos.openLabelUndated')
                  }
                  className="max-h-[70vh] w-full rounded-xl bg-surface object-contain"
                />
              ) : null}
            </DialogContent>
            {openPhoto && canDeleteOpen ? (
              <DialogActions>
                <Button
                  size="small"
                  type="button"
                  onClick={() => askDelete(openPhoto)}
                  icon={<DeleteRegular />}
                >
                  {t('domain:photoForm.delete.action')}
                </Button>
              </DialogActions>
            ) : null}
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {deletePhoto ? (
        <OrderPhotoDeleteDialog
          imageId={deletePhoto.id}
          label={formatDateTime(deletePhoto.takenAt)}
          open
          onOpenChange={(open) => {
            if (!open) setDeletePhoto(null);
          }}
        />
      ) : null}
    </section>
  );
}

function PhotoTile({
  photo,
  deletable,
  onOpen,
  onDelete,
}: {
  photo: OrderPhoto;
  deletable: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const takenAt = formatDateTime(photo.takenAt);
  const label = takenAt
    ? t('domain:orders.photos.openLabel', { date: takenAt })
    : t('domain:orders.photos.openLabelUndated');

  return (
    <li className="relative">
      <button
        type="button"
        className="focus-visible:ring-ring flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-colors hover:border-border-strong hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
        aria-label={label}
        onClick={onOpen}
      >
        <img
          src={photo.signedUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-square w-full bg-surface object-cover"
        />
        {takenAt ? (
          <span className="truncate bg-card px-2.5 py-2 text-xs text-muted-foreground">
            {takenAt}
          </span>
        ) : null}
      </button>
      {deletable ? (
        <button
          type="button"
          className="focus-visible:ring-ring absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full border border-border bg-card text-destructive shadow-sm hover:bg-accent focus-visible:ring-2 focus-visible:outline-none"
          aria-label={
            takenAt
              ? t('domain:photoForm.delete.label', { date: takenAt })
              : t('domain:photoForm.delete.labelUndated')
          }
          onClick={onDelete}
        >
          <DeleteRegular fontSize={16} />
        </button>
      ) : null}
    </li>
  );
}

function PhotoGridSkeleton({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <SkeletonBlock key={index} className="aspect-square rounded-xl" />
      ))}
    </div>
  );
}

function uploadErrorMessage(
  error: unknown,
  t: (
    key:
      | 'domain:photoForm.unsupported'
      | 'domain:photoForm.unreadable'
      | 'domain:photoForm.tooLarge'
      | 'domain:photoForm.cleanupFailed'
      | 'domain:photoForm.saveError',
  ) => string,
): string {
  switch (orderImageErrorCode(error)) {
    case 'UNSUPPORTED_IMAGE':
      return t('domain:photoForm.unsupported');
    case 'IMAGE_UNREADABLE':
      return t('domain:photoForm.unreadable');
    case 'IMAGE_TOO_LARGE':
      return t('domain:photoForm.tooLarge');
    case 'STORAGE_CLEANUP_FAILED':
      return t('domain:photoForm.cleanupFailed');
    default:
      return readableDbError(error) ?? t('domain:photoForm.saveError');
  }
}
