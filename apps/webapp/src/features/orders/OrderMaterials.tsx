import { hasPermission } from '@bautakt/core';
import { Badge, Button, Skeleton, Uicon } from '@bautakt/ui';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/useAuth';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { useArticles } from '@/features/masterdata/useMasterData';
import { formatCurrency } from '@/lib/format';

import { canCreateOrderMaterial, canEditOrderMaterial } from './orderMaterialAccess';
import {
  draftFromOrderMaterial,
  emptyOrderMaterial,
  type OrderMaterialDraft,
} from './orderMaterialDraft';
import { OrderMaterialSheet } from './OrderMaterialSheet';
import { materialLabel, type OrderMaterial, useOrderMaterials } from './useOrderMaterials';

const SKELETON_COUNT = 2;

const quantityFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 });

/**
 * Material unter den Stammdaten eines Auftrags, unter den Zeiten.
 *
 * Anlegen, Bearbeiten und Löschen laufen über ein Seitenpanel. Wer weder
 * erfassen noch Aufträge verwalten darf, sieht die Liste nur. Abgerechnete
 * Zeilen öffnen das Panel, speichern und löschen darin aber nicht.
 */
export function OrderMaterials({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const canCreate = canCreateOrderMaterial(membership?.permissions);
  const canManage = hasPermission(membership?.permissions, 'canManageOrders');
  // Dieselbe Abfrage wie das Panel, aber schon mit der Seite. Sonst ist der
  // Katalog beim Öffnen leer und die Artikelauswahl zeigt nichts Vorbelegtes.
  useArticles({ enabled: canCreate || canManage });
  const [draft, setDraft] = useState<OrderMaterialDraft | null>(null);
  const materials = useOrderMaterials(orderId);
  const { data, isError, refetch } = materials;
  const isLoading = useCompanyListLoading(materials);

  function openNew() {
    setDraft(emptyOrderMaterial(orderId));
  }

  let body: ReactNode;
  if (isLoading) {
    body = <MaterialListSkeleton label={t('common:state.loading')} />;
  } else if (isError) {
    body = (
      <EmptyState
        title={t('domain:orders.materials.loadErrorTitle')}
        description={t('domain:orders.materials.loadErrorDescription')}
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
        title={t('domain:orders.materials.emptyTitle')}
        description={
          canCreate
            ? t('domain:orders.materials.emptyDescriptionWrite')
            : t('domain:orders.materials.emptyDescription')
        }
        action={
          canCreate ? (
            <Button size="sm" onClick={openNew}>
              <Uicon name="plus" size={16} />
              {t('domain:materialForm.newTitle')}
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <ul className="flex max-w-3xl flex-col gap-3">
        {data.map((row) => (
          <MaterialCard
            key={row.id}
            row={row}
            editable={canEditOrderMaterial(membership?.permissions, user?.id, {
              user_id: row.userId,
            })}
            onEdit={() => setDraft(draftFromOrderMaterial(row, orderId))}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="order-materials-title">
      <div className="flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="order-materials-title"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {t('domain:orders.materials.title')}
        </h2>
        {canCreate ? (
          <Button size="sm" onClick={openNew}>
            <Uicon name="plus" size={16} />
            {t('domain:materialForm.newTitle')}
          </Button>
        ) : null}
      </div>
      {body}
      <OrderMaterialSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </section>
  );
}

function formatUsedAt(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function MaterialCard({
  row,
  editable,
  onEdit,
}: {
  row: OrderMaterial;
  editable: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const title = materialLabel(row) || t('domain:orders.materials.noTitle');
  const amount = `${quantityFormatter.format(row.quantity)} ${row.unit}`.trim();
  const prices = [
    row.unitCost != null
      ? t('domain:orders.materials.cost', { price: formatCurrency(row.unitCost) })
      : '',
    row.unitPrice != null
      ? t('domain:orders.materials.price', { price: formatCurrency(row.unitPrice) })
      : '',
  ].filter(Boolean);
  const className =
    'flex w-full flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors';

  const content = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-foreground flex flex-wrap items-center gap-2 text-sm font-medium">
          {title}
          {row.billed ? <Badge variant="muted">{t('domain:orders.materials.billed')}</Badge> : null}
        </span>
        <span className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">
          {amount}
        </span>
      </div>
      <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
        {row.usedAt ? <time dateTime={row.usedAt}>{formatUsedAt(row.usedAt)}</time> : null}
        {prices.length > 0 ? <span className="tabular-nums">{prices.join(' · ')}</span> : null}
        {row.author ? <span>{row.author}</span> : null}
      </p>
      {row.notes ? (
        <p className="text-foreground text-sm break-words whitespace-pre-wrap">{row.notes}</p>
      ) : null}
    </>
  );

  return (
    <li>
      {editable ? (
        <button
          type="button"
          className={`${className} cursor-pointer hover:border-border-strong`}
          onClick={onEdit}
        >
          {content}
        </button>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

function MaterialListSkeleton({ label }: { label: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}
