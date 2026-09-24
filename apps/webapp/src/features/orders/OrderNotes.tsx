import { Skeleton } from '@bautakt/ui';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { formatDateTime } from '@/lib/format';

import { type OrderNote, useOrderNotes } from './useOrderNotes';

const SKELETON_COUNT = 2;

/**
 * Notizen unter den Stammdaten eines Auftrags, neben den Fotos. Nur Anzeige:
 * kein Anlegen, kein Bearbeiten, kein Loeschen. Schreiben bleibt in der Handy-App.
 */
export function OrderNotes({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const notes = useOrderNotes(orderId);
  const { data, isError, refetch } = notes;
  const isLoading = useCompanyListLoading(notes);

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
        description={t('domain:orders.notes.emptyDescription')}
      />
    );
  } else {
    body = (
      <ul className="flex max-w-3xl flex-col gap-3">
        {data.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="order-notes-title">
      <h2 id="order-notes-title" className="text-foreground text-base font-semibold">
        {t('domain:orders.notes.title')}
      </h2>
      {body}
    </section>
  );
}

function NoteCard({ note }: { note: OrderNote }) {
  const { t } = useTranslation();
  const created = formatDateTime(note.createdAt);
  const modified = formatDateTime(note.modifiedAt);
  const showEdited = Boolean(modified && modified !== created);

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3">
      {note.title ? <h3 className="text-foreground text-sm font-medium">{note.title}</h3> : null}
      {note.body ? (
        <p className="text-foreground text-sm break-words whitespace-pre-wrap">{note.body}</p>
      ) : null}
      <p className="text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-xs">
        {note.author ? <span>{note.author}</span> : null}
        {created ? <time dateTime={note.createdAt}>{created}</time> : null}
        {showEdited ? <span>{t('domain:orders.notes.editedAt', { date: modified })}</span> : null}
      </p>
    </li>
  );
}

function NoteListSkeleton({ label }: { label: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}
