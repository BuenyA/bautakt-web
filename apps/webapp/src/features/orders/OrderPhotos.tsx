import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@bautakt/ui';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { formatDateTime } from '@/lib/format';

import { useOrderImages } from './useOrderImages';

const SKELETON_COUNT = 4;

/**
 * Fotos unter den Stammdaten eines Auftrags. Nur Anzeige: kein Upload, kein
 * Loeschen, kein Bearbeiten. Aufnehmen bleibt in der Handy-App.
 */
export function OrderPhotos({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const photos = useOrderImages(orderId);
  const { data, isError, refetch } = photos;
  const isLoading = useCompanyListLoading(photos);
  const [openId, setOpenId] = useState<string | null>(null);

  const openPhoto = data?.find((photo) => photo.id === openId) ?? null;
  const openDate = openPhoto ? formatDateTime(openPhoto.takenAt) : '';

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
            className="text-sm font-medium text-primary hover:underline"
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
        description={t('domain:orders.photos.emptyDescription')}
      />
    );
  } else {
    body = (
      <>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {data.map((photo) => {
            const takenAt = formatDateTime(photo.takenAt);
            const label = takenAt
              ? t('domain:orders.photos.openLabel', { date: takenAt })
              : t('domain:orders.photos.openLabelUndated');
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  className="focus-visible:ring-ring flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-surface text-left transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:outline-none"
                  aria-label={label}
                  onClick={() => setOpenId(photo.id)}
                >
                  <img
                    src={photo.signedUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full bg-surface object-cover"
                  />
                  {takenAt ? (
                    <span className="text-muted-foreground truncate px-2 py-1.5 text-xs">
                      {takenAt}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <Dialog
          open={openPhoto !== null}
          onOpenChange={(open) => {
            if (!open) setOpenId(null);
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t('domain:orders.photos.lightboxTitle')}</DialogTitle>
              <DialogDescription>
                {openDate
                  ? t('domain:orders.photos.takenAt', { date: openDate })
                  : t('domain:orders.photos.openLabelUndated')}
              </DialogDescription>
            </DialogHeader>
            {openPhoto ? (
              <img
                src={openPhoto.signedUrl}
                alt={
                  openDate
                    ? t('domain:orders.photos.openLabel', { date: openDate })
                    : t('domain:orders.photos.openLabelUndated')
                }
                className="max-h-[70vh] w-full rounded-md bg-surface object-contain"
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="order-photos-title">
      <h2 id="order-photos-title" className="text-foreground text-base font-semibold">
        {t('domain:orders.photos.title')}
      </h2>
      {body}
    </section>
  );
}

function PhotoGridSkeleton({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}
