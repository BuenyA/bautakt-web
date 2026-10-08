import { Button, Checkbox, Skeleton, toast, Uicon } from '@bautakt/ui';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { useEmployees } from '@/features/team/useEmployees';
import { readableDbError } from '@/lib/dbErrors';

import {
  type ChecklistItemDraft,
  draftFromChecklistItem,
  emptyChecklistItem,
  localToday,
  type OrderChecklistItem,
} from './orderChecklistDraft';
import { OrderChecklistSheet } from './OrderChecklistSheet';
import { useOrderChecklist } from './useOrderChecklist';
import { useSaveOrderChecklist } from './useOrderChecklistMutations';

const SKELETON_COUNT = 3;

/**
 * Checkliste unter den Notizen eines Auftrags.
 *
 * Anlegen, Umbenennen, Datum und Zuweisung laufen über ein Seitenpanel.
 * Abhaken sitzt auf der Zeile. Wer `canEditChecklist` nicht hat, sieht die
 * Punkte nur. Wer weder lesen noch schreiben darf, sieht den Block nicht —
 * ein leerer Hinweis wäre dieselbe Fläche wie „noch keine Punkte“.
 */
export function OrderChecklist({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const canView = usePermission('canViewChecklist');
  const canEdit = usePermission('canEditChecklist');
  const visible = canView || canEdit;
  useEmployees({ enabled: canEdit });
  const [draft, setDraft] = useState<ChecklistItemDraft | null>(null);
  const save = useSaveOrderChecklist();
  const checklist = useOrderChecklist(orderId, visible);
  const { data, isError, refetch } = checklist;
  const isLoading = useCompanyListLoading(checklist);

  if (!visible) return null;

  function openNew() {
    setDraft(emptyChecklistItem(orderId));
  }

  async function onToggle(item: OrderChecklistItem, isDone: boolean) {
    try {
      await save.mutateAsync({ kind: 'toggle', orderId, id: item.id, isDone });
    } catch (caught) {
      toast.error(t('domain:checklistForm.toggleError'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  }

  const items = data?.items ?? [];
  const doneCount = items.filter((item) => item.isDone).length;

  let body: ReactNode;
  if (isLoading) {
    body = <ChecklistSkeleton label={t('common:state.loading')} />;
  } else if (isError) {
    body = (
      <EmptyState
        title={t('domain:orders.checklist.loadErrorTitle')}
        description={t('domain:orders.checklist.loadErrorDescription')}
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
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title={t('domain:orders.checklist.emptyTitle')}
        description={
          canEdit
            ? t('domain:orders.checklist.emptyDescriptionWrite')
            : t('domain:orders.checklist.emptyDescription')
        }
        action={
          canEdit ? (
            <Button size="sm" onClick={openNew}>
              <Uicon name="plus" size={16} />
              {t('domain:checklistForm.newTitle')}
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <ul className="flex max-w-3xl flex-col gap-3">
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            editable={canEdit}
            pending={save.isPending}
            onEdit={() => setDraft(draftFromChecklistItem(item, orderId))}
            onToggle={(isDone) => void onToggle(item, isDone)}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="order-checklist-title">
      <div className="flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1">
          <h2
            id="order-checklist-title"
            className="text-foreground text-lg font-semibold tracking-tight"
          >
            {t('domain:orders.checklist.title')}
          </h2>
          {!isLoading && !isError && items.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('domain:orders.checklist.progress', { done: doneCount, total: items.length })}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <Button size="sm" onClick={openNew}>
            <Uicon name="plus" size={16} />
            {t('domain:checklistForm.newTitle')}
          </Button>
        ) : null}
      </div>
      {body}
      <OrderChecklistSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </section>
  );
}

function formatIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function ChecklistRow({
  item,
  editable,
  pending,
  onEdit,
  onToggle,
}: {
  item: OrderChecklistItem;
  editable: boolean;
  pending: boolean;
  onEdit: () => void;
  onToggle: (isDone: boolean) => void;
}) {
  const { t } = useTranslation();
  const title = item.title.trim() || t('domain:orders.checklist.untitled');
  const due = item.dueDate ? formatIsoDate(item.dueDate) : '';
  const overdue = Boolean(item.dueDate && !item.isDone && item.dueDate < localToday());
  const assignee = item.assignee
    ? item.assigneeEnded
      ? t('domain:checklistForm.assigneeEnded', { name: item.assignee })
      : item.assignee
    : '';
  const className =
    'flex w-full items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm';

  const text = (
    <>
      <span
        className={`text-sm font-medium break-words ${item.isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}
      >
        {title}
      </span>
      {due || assignee ? (
        <span className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
          {due ? (
            <time
              dateTime={item.dueDate ?? undefined}
              className={overdue ? 'text-destructive' : undefined}
            >
              {t('domain:orders.checklist.due', { date: due })}
            </time>
          ) : null}
          {assignee ? <span>{assignee}</span> : null}
        </span>
      ) : null}
    </>
  );

  return (
    <li className={editable ? `${className} hover:border-border-strong` : className}>
      <Checkbox
        className="mt-0.5"
        checked={item.isDone}
        disabled={!editable || pending}
        aria-label={t('domain:orders.checklist.toggle', { title })}
        onCheckedChange={(value) => {
          if (value === 'indeterminate') return;
          onToggle(value === true);
        }}
      />
      {editable ? (
        <button
          type="button"
          className="flex min-w-0 flex-1 flex-col gap-1 text-left"
          onClick={onEdit}
        >
          {text}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1">{text}</div>
      )}
    </li>
  );
}

function ChecklistSkeleton({ label }: { label: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}
