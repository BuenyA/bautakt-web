import { DangerButton, toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  Option,
} from '@fluentui/react-components';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';

import { isFinanceArchivePath } from './orderDocumentFiles';
import { useDeleteOrderDocument, useUpdateOrderDocument } from './useOrderDocumentMutations';
import type { OrderDocument, OrderDocumentCategory } from './useOrderDocuments';

/**
 * Name und Ordner ändern. Nur gemountet, solange er offen ist, und startet
 * deshalb immer mit den Werten des Dokuments.
 */
export function OrderDocumentEditDialog({
  document,
  categories,
  onClose,
}: {
  document: OrderDocument;
  categories: OrderDocumentCategory[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const update = useUpdateOrderDocument();
  const [name, setName] = useState(document.name);
  const [categoryId, setCategoryId] = useState(document.categoryId);
  const [error, setError] = useState<string | null>(null);
  // Ein ausgeblendeter Ordner bleibt wählbar, solange das Dokument darin liegt.
  const choices = categories.filter((item) => !item.isHidden || item.id === document.categoryId);
  const selected = choices.find((item) => item.id === categoryId);
  const nameMissing = name.trim() === '';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (nameMissing) return;
    setError(null);
    try {
      await update.mutateAsync({ id: document.id, name, categoryId });
      toast.success(t('domain:orders.documents.saved'));
      onClose();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:orders.documents.saveError'));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(_, { open }) => {
        if (!open && !update.isPending) onClose();
      }}
    >
      <DialogSurface>
        <form onSubmit={(event) => void onSubmit(event)}>
          <DialogBody>
            <DialogTitle>{t('domain:orders.documents.editTitle')}</DialogTitle>
            <DialogContent className="flex flex-col gap-4">
              <Field
                label={t('domain:orders.documents.name')}
                required
                validationMessage={nameMissing ? t('domain:orders.documents.nameRequired') : null}
              >
                <Input value={name} onChange={(_, data) => setName(data.value)} />
              </Field>
              <Field label={t('domain:orders.documents.folder')}>
                <Dropdown
                  value={selected?.name ?? ''}
                  selectedOptions={[categoryId]}
                  onOptionSelect={(_, data) => {
                    if (data.optionValue) setCategoryId(data.optionValue);
                  }}
                >
                  {choices.map((item) => (
                    <Option key={item.id} value={item.id}>
                      {item.name}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button type="button" onClick={onClose} disabled={update.isPending}>
                {t('common:action.cancel')}
              </Button>
              <Button
                type="submit"
                appearance="primary"
                disabled={update.isPending || nameMissing}
                aria-busy={update.isPending}
              >
                {t('common:action.save')}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}

/**
 * Bestätigung vor dem Löschen. Bei archivierten Rechnungen und Angeboten
 * verschwindet nur der Eintrag am Auftrag, der Beleg selbst bleibt.
 */
export function OrderDocumentDeleteDialog({
  document,
  onClose,
}: {
  document: OrderDocument;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteOrderDocument();
  const [error, setError] = useState<string | null>(null);
  const archived = isFinanceArchivePath(document.storagePath);

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(document.id);
      toast.success(t('domain:orders.documents.deleted'));
      onClose();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:orders.documents.deleteError'));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(_, { open }) => {
        if (!open && !remove.isPending) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:orders.documents.deleteTitle')}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <p>
              {archived
                ? t('domain:orders.documents.deleteArchived', { name: document.name })
                : t('domain:orders.documents.deleteDescription', { name: document.name })}
            </p>
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={onClose} disabled={remove.isPending}>
              {t('common:action.cancel')}
            </Button>
            <DangerButton
              type="button"
              disabled={remove.isPending}
              aria-busy={remove.isPending}
              onClick={() => void onConfirm()}
            >
              {remove.isPending
                ? t('domain:orders.documents.deletePending')
                : archived
                  ? t('domain:orders.documents.unlinkConfirm')
                  : t('domain:orders.documents.deleteConfirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
