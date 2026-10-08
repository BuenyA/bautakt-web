import { Button, Skeleton, Uicon } from '@bautakt/ui';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDateTime } from '@/lib/format';

import { draftFromOrderNote, emptyOrderNote, type OrderNoteDraft } from './orderNoteDraft';
import { OrderNoteSheet } from './OrderNoteSheet';
import { type OrderNote, useOrderNotes } from './useOrderNotes';

const SKELETON_COUNT = 2;

/**
 * Notizen unter den Stammdaten eines Auftrags, unter den Fotos.
 *
 * Anlegen, Bearbeiten und Löschen laufen über ein Seitenpanel. Wer
 * `canCreateNotes` nicht hat, sieht die Liste nur — auch fremde Notizen
 * öffnen sich mit dem Recht, denn die Policies unterscheiden seit dem
 * 11.08.2026 nicht mehr zwischen eigenen und fremden Zeilen.
 */
export function OrderNotes({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const canCreate = usePermission('canCreateNotes');
  const [draft, setDraft] = useState<OrderNoteDraft | null>(null);
  const notes = useOrderNotes(orderId);
  const { data, isError, refetch } = notes;
  const isLoading = useCompanyListLoading(notes);

  function openNew() {
    setDraft(emptyOrderNote(orderId));
  }

  let body: ReactNode;
  if (isLoading) {
    body = <NoteListSkeleton label={t('common:state.loading')} />;
  } else if (isError) {
    body = (
      <EmptyState
        title={t('domain:orders.notes.loadErrorTitle')}
        description={t('domain:orders.notes.loadErrorDescription')}
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
        title={t('domain:orders.notes.emptyTitle')}
        description={
          canCreate
            ? t('domain:orders.notes.emptyDescriptionWrite')
            : t('domain:orders.notes.emptyDescription')
        }
        action={
          canCreate ? (
            <Button size="sm" onClick={openNew}>
              <Uicon name="plus" size={16} />
              {t('domain:noteForm.newTitle')}
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <ul className="flex max-w-3xl flex-col gap-3">
        {data.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            editable={canCreate}
            onEdit={() => setDraft(draftFromOrderNote(note, orderId))}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="order-notes-title">
      <div className="flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="order-notes-title" className="text-foreground text-lg font-semibold tracking-tight">
          {t('domain:orders.notes.title')}
        </h2>
        {canCreate ? (
          <Button size="sm" onClick={openNew}>
            <Uicon name="plus" size={16} />
            {t('domain:noteForm.newTitle')}
          </Button>
        ) : null}
      </div>
      {body}
      <OrderNoteSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </section>
  );
}

function NoteCard({
  note,
  editable,
  onEdit,
}: {
  note: OrderNote;
  editable: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const created = formatDateTime(note.createdAt);
  const modified = formatDateTime(note.modifiedAt);
  const showEdited = Boolean(modified && modified !== created);
  const className =
    'flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors';

  const content = (
    <>
      {note.title ? (
        <span className="text-foreground text-sm font-medium">{note.title}</span>
      ) : null}
      {note.body ? (
        <span className="text-foreground text-sm break-words whitespace-pre-wrap">{note.body}</span>
      ) : null}
      <span className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
        {note.author ? <span>{note.author}</span> : null}
        {created ? <time dateTime={note.createdAt}>{created}</time> : null}
        {showEdited ? <span>{t('domain:orders.notes.editedAt', { date: modified })}</span> : null}
      </span>
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

function NoteListSkeleton({ label }: { label: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}
