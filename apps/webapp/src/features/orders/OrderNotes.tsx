import { ActionCard, SkeletonBlock } from '@bautakt/ui';
import { Button, Card, Link as FluentLink } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
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
          <FluentLink as="button" onClick={() => void refetch()}>
            {t('common:action.retry')}
          </FluentLink>
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
            <Button onClick={openNew} icon={<AddRegular />}>
              {t('domain:noteForm.newTitle')}
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3">
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="order-notes-title" className="text-foreground text-lg font-semibold tracking-tight">
          {t('domain:orders.notes.title')}
        </h2>
        {canCreate ? (
          <Button appearance="primary" onClick={openNew} icon={<AddRegular />}>
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
  // Fluent-`Card`; als `button`, wenn die Zeile bearbeitet werden darf.
  const className = 'w-full text-left';
  const bodyClassName = 'flex flex-col gap-1.5';

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
        <ActionCard className={className} onAction={onEdit}>
          <div className={bodyClassName}>{content}</div>
        </ActionCard>
      ) : (
        <Card className={className}>
          <div className={bodyClassName}>{content}</div>
        </Card>
      )}
    </li>
  );
}

function NoteListSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <SkeletonBlock key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}
