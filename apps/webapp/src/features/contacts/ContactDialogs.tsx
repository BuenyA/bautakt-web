import { DangerButton, toast } from '@bautakt/ui';
import {
  Button,
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Option,
  Text,
} from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';

import { useDeleteContact, useMergeContacts } from './useContactMutations';
import { useContacts } from './useContacts';

/** Endgültig löschen — nur angeboten, wenn der Kontakt nirgends verwendet wird. */
export function ContactDeleteDialog({
  contactId,
  name,
  open,
  onOpenChange,
}: {
  contactId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const remove = useDeleteContact();
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(contactId);
      toast.success(t('domain:contactDelete.deleted'));
      onOpenChange(false);
      void navigate(routes.contacts);
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:contactDelete.error'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:contactDelete.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <Text>{t('domain:contactDelete.body', { name })}</Text>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onOpenChange(false)}>{t('common:action.cancel')}</Button>
            <DangerButton onClick={() => void onConfirm()} disabled={remove.isPending}>
              {t('domain:contactDelete.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

/**
 * Dublette zusammenführen: der gewählte Kontakt geht in diesem hier auf. Alle
 * Belege, Rollen, Ansprechpartner und Konten wandern mit; der andere Kontakt
 * verschwindet. Typischer Fall: derselbe Lieferant zweimal aus Freitext.
 */
export function MergeContactsDialog({
  keepId,
  keepName,
  open,
  onOpenChange,
}: {
  keepId: string;
  keepName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const contacts = useContacts();
  const merge = useMergeContacts();
  const [dropId, setDropId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      (contacts.data ?? [])
        .filter((row) => row.id !== keepId)
        .filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase())),
    [contacts.data, keepId, query],
  );
  const dropName = contacts.data?.find((row) => row.id === dropId)?.name ?? '';

  async function onConfirm() {
    if (!dropId) return;
    setError(null);
    try {
      await merge.mutateAsync({ keep: keepId, drop: dropId });
      toast.success(t('domain:contactMerge.merged'));
      onOpenChange(false);
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:contactMerge.error'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:contactMerge.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-4">
            <Text>{t('domain:contactMerge.body', { name: keepName })}</Text>
            <Field label={t('domain:contactMerge.duplicate')}>
              <Combobox
                freeform={false}
                value={dropId ? dropName : query}
                selectedOptions={dropId ? [dropId] : []}
                onInput={(event) => {
                  setDropId(null);
                  setQuery((event.target as HTMLInputElement).value);
                }}
                onOptionSelect={(_, data) => setDropId(data.optionValue ?? null)}
                placeholder={t('domain:contactMerge.search')}
              >
                {candidates.slice(0, 50).map((row) => (
                  <Option key={row.id} value={row.id} text={row.name}>
                    {row.name}
                    {row.city ? <span className="text-muted-foreground"> · {row.city}</span> : null}
                  </Option>
                ))}
              </Combobox>
            </Field>
            {dropId ? (
              <Text size={200} className="text-muted-foreground">
                {t('domain:contactMerge.effect', { drop: dropName, keep: keepName })}
              </Text>
            ) : null}
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onOpenChange(false)}>{t('common:action.cancel')}</Button>
            <DangerButton onClick={() => void onConfirm()} disabled={!dropId || merge.isPending}>
              {t('domain:contactMerge.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
