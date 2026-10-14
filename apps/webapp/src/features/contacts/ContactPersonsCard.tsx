import {
  DangerIconButton,
  FormDrawer,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  Checkbox,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  Link,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular, EditRegular, StarFilled } from '@fluentui/react-icons';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';

import { SectionCard } from './SectionCard';
import { type ContactPerson, useContactPersons } from './useContact';
import {
  type ContactPersonDraft,
  useDeleteContactPerson,
  useSaveContactPerson,
} from './useContactDetailMutations';

const EMPTY: ContactPersonDraft = {
  salutation: '',
  first_name: '',
  last_name: '',
  position: '',
  email: '',
  phone: '',
  mobile: '',
  notes: '',
  is_primary: false,
};

/** Ansprechpartner einer Firma: wer ruft an, wer bekommt die Rechnung. */
export function ContactPersonsCard({
  contactId,
  canManage,
}: {
  contactId: string;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const persons = useContactPersons(contactId);
  const remove = useDeleteContactPerson();
  const [draft, setDraft] = useState<ContactPersonDraft | null>(null);

  const list = persons.data ?? [];

  async function onDelete(person: ContactPerson) {
    try {
      await remove.mutateAsync(person.id);
      toast.success(t('domain:contactPersons.deleted'));
    } catch (caught) {
      toast.error(readableDbError(caught) ?? t('domain:contactPersons.deleteError'));
    }
  }

  return (
    <SectionCard
      title={t('domain:contactPersons.title')}
      action={
        canManage ? (
          <Button
            appearance="subtle"
            icon={<AddRegular />}
            onClick={() => setDraft({ ...EMPTY, is_primary: list.length === 0 })}
          >
            {t('domain:contactPersons.add')}
          </Button>
        ) : null
      }
    >
      {list.length === 0 ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:contactPersons.empty')}
        </Text>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {list.map((person) => {
            const name = [person.salutation, person.first_name, person.last_name]
              .map((p) => p.trim())
              .filter(Boolean)
              .join(' ');
            return (
              <li key={person.id} className="flex items-start justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                  <span className="flex items-center gap-1 font-medium">
                    {name}
                    {person.is_primary ? (
                      <StarFilled
                        aria-label={t('domain:contactPersons.primary')}
                        className="text-brand size-4"
                      />
                    ) : null}
                  </span>
                  {person.position ? (
                    <span className="text-muted-foreground">{person.position}</span>
                  ) : null}
                  <span className="flex flex-wrap gap-x-4">
                    {person.phone ? <Link href={`tel:${person.phone}`}>{person.phone}</Link> : null}
                    {person.mobile ? (
                      <Link href={`tel:${person.mobile}`}>{person.mobile}</Link>
                    ) : null}
                    {person.email ? (
                      <Link href={`mailto:${person.email}`}>{person.email}</Link>
                    ) : null}
                  </span>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      appearance="subtle"
                      icon={<EditRegular />}
                      aria-label={t('common:action.edit')}
                      onClick={() => setDraft({ ...person })}
                    />
                    <DangerIconButton
                      aria-label={t('common:action.delete')}
                      icon={<DeleteRegular />}
                      onClick={() => void onDelete(person)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <FormDrawer
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        size="small"
      >
        {draft ? (
          <PersonForm contactId={contactId} initial={draft} onDone={() => setDraft(null)} />
        ) : null}
      </FormDrawer>
    </SectionCard>
  );
}

function PersonForm({
  contactId,
  initial,
  onDone,
}: {
  contactId: string;
  initial: ContactPersonDraft;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveContactPerson(contactId);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const set = (patch: Partial<ContactPersonDraft>) => setDraft((d) => ({ ...d, ...patch }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!`${draft.first_name}${draft.last_name}`.trim()) {
      setError(t('domain:contactPersons.nameRequired'));
      return;
    }
    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:contactPersons.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:contactPersons.saveError'));
    }
  }

  const field = (name: keyof ContactPersonDraft, label: string, type?: 'email' | 'tel') => (
    <div className="grid gap-2">
      <Label htmlFor={f(name)}>{label}</Label>
      <Input
        id={f(name)}
        type={type}
        value={String(draft[name] ?? '')}
        onChange={(event) => set({ [name]: event.target.value })}
      />
    </div>
  );

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {draft.id ? t('domain:contactPersons.editTitle') : t('domain:contactPersons.newTitle')}
        </FormDrawerTitle>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-4">
        {field('salutation', t('domain:contactForm.salutation'))}
        <div className="grid gap-4 sm:grid-cols-2">
          {field('first_name', t('domain:contactForm.firstName'))}
          {field('last_name', t('domain:contactForm.lastName'))}
        </div>
        {field('position', t('domain:contactPersons.position'))}
        {field('phone', t('domain:contactForm.phone'), 'tel')}
        {field('mobile', t('domain:contactForm.mobile'), 'tel')}
        {field('email', t('domain:contactForm.email'), 'email')}
        <div className="grid gap-2">
          <Label htmlFor={f('notes')}>{t('domain:contactForm.notes')}</Label>
          <Textarea
            id={f('notes')}
            rows={2}
            value={draft.notes}
            onChange={(event) => set({ notes: event.target.value })}
          />
        </div>
        <Checkbox
          checked={draft.is_primary}
          onChange={(_, { checked }) => set({ is_primary: checked === true })}
          label={t('domain:contactPersons.primary')}
        />
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </DrawerBody>
      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={save.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}
