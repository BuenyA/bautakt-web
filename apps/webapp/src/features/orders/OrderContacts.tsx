import {
  DangerIconButton,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  Link,
  Select,
  Text,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { contactDisplayName } from '@/features/contacts/contactModel';
import { ContactPicker } from '@/features/contacts/ContactPicker';
import { SectionCard } from '@/features/contacts/SectionCard';
import { useContactPersons } from '@/features/contacts/useContact';
import type { ContactListRow } from '@/features/contacts/useContacts';
import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

/** Funktionen am Auftrag (`order_contacts.role`). */
const ORDER_CONTACT_ROLES = [
  'site_contact',
  'architect',
  'planner',
  'structural_engineer',
  'property_manager',
  'authority',
  'subcontractor',
  'supplier',
  'other',
] as const;
type OrderContactRole = (typeof ORDER_CONTACT_ROLES)[number];

type OrderContactRow = {
  id: string;
  role: string;
  note: string;
  contact_id: string;
  contact: {
    kind: string;
    company_name: string;
    first_name: string;
    last_name: string;
    phone: string;
    mobile: string;
    email: string;
  } | null;
  person: {
    first_name: string;
    last_name: string;
    phone: string;
    mobile: string;
    email: string;
  } | null;
};

function useOrderContacts(orderId: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['contacts', companyId, 'order', orderId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<OrderContactRow[]> => {
      const { data, error } = await supabase
        .from('order_contacts')
        .select(
          `id, role, note, contact_id,
           contact:contacts(kind, company_name, first_name, last_name, phone, mobile, email),
           person:contact_persons(first_name, last_name, phone, mobile, email)`,
        )
        .eq('company_id', companyId!)
        .eq('order_id', orderId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Beteiligte am Auftrag neben dem Kunden: Architekt, Hausverwaltung,
 * Subunternehmer, Ansprechpartner vor Ort. Das, was der Monteur draußen
 * braucht — wen er anruft, wenn der Schlüssel fehlt.
 */
export function OrderContacts({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const canManage = usePermission('canManageOrders');
  const contacts = useOrderContacts(orderId);
  const [adding, setAdding] = useState(false);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('order_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['contacts', membership?.companyId] }),
  });

  async function onDelete(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(t('domain:orderContacts.deleted'));
    } catch (caught) {
      toast.error(readableDbError(caught) ?? t('domain:orderContacts.deleteError'));
    }
  }

  const list = contacts.data ?? [];

  return (
    <div className="max-w-3xl">
      <SectionCard
        title={t('domain:orderContacts.title')}
        description={t('domain:orderContacts.description')}
        action={
          canManage ? (
            <Button appearance="subtle" icon={<AddRegular />} onClick={() => setAdding(true)}>
              {t('domain:orderContacts.add')}
            </Button>
          ) : null
        }
      >
        {list.length === 0 ? (
          <Text size={200} className="text-muted-foreground">
            {t('domain:orderContacts.empty')}
          </Text>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {list.map((entry) => {
              const name = entry.contact ? contactDisplayName(entry.contact) : '';
              const person = entry.person
                ? [entry.person.first_name, entry.person.last_name].filter(Boolean).join(' ')
                : '';
              const phone =
                entry.person?.phone ||
                entry.person?.mobile ||
                entry.contact?.phone ||
                entry.contact?.mobile ||
                '';
              const email = entry.person?.email || entry.contact?.email || '';
              return (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                    <span className="text-muted-foreground">
                      {t(`domain:orderContactRole.${entry.role}`)}
                    </span>
                    <RouterLink to={routes.contact(entry.contact_id)}>
                      <span className="font-medium">{name}</span>
                    </RouterLink>
                    {person ? <span>{person}</span> : null}
                    <span className="flex flex-wrap gap-x-4">
                      {phone ? <Link href={`tel:${phone}`}>{phone}</Link> : null}
                      {email ? <Link href={`mailto:${email}`}>{email}</Link> : null}
                    </span>
                    {entry.note ? (
                      <span className="text-muted-foreground whitespace-pre-wrap">
                        {entry.note}
                      </span>
                    ) : null}
                  </div>
                  {canManage ? (
                    <DangerIconButton
                      aria-label={t('common:action.delete')}
                      icon={<DeleteRegular />}
                      onClick={() => void onDelete(entry.id)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <FormDrawer open={adding} onOpenChange={setAdding} size="small">
        {adding ? (
          <OrderContactForm
            orderId={orderId}
            nextSortOrder={list.length}
            onDone={() => setAdding(false)}
          />
        ) : null}
      </FormDrawer>
    </div>
  );
}

function OrderContactForm({
  orderId,
  nextSortOrder,
  onDone,
}: {
  orderId: string;
  nextSortOrder: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const [contact, setContact] = useState<ContactListRow | null>(null);
  const [role, setRole] = useState<OrderContactRole>('site_contact');
  const [personId, setPersonId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const persons = useContactPersons(contact?.id);
  const id = useId();
  const f = (name: string) => `${id}-${name}`;

  const save = useMutation({
    mutationFn: async () => {
      const { error: insertError } = await supabase.from('order_contacts').insert({
        id: crypto.randomUUID(),
        company_id: companyId!,
        order_id: orderId,
        contact_id: contact!.id,
        contact_person_id: personId || null,
        role,
        note: note.trim(),
        sort_order: nextSortOrder,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', companyId] }),
  });

  function onContact(next: ContactListRow | null) {
    setContact(next);
    setPersonId('');
    // Die Rolle des Kontakts schlägt die Funktion am Auftrag vor.
    if (next?.roles.includes('subcontractor')) setRole('subcontractor');
    else if (next?.roles.includes('supplier')) setRole('supplier');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!contact) {
      setError(t('domain:orderContacts.contactRequired'));
      return;
    }
    try {
      await save.mutateAsync();
      toast.success(t('domain:orderContacts.saved'));
      onDone();
    } catch (caught) {
      const code = (caught as { code?: string } | null)?.code;
      setError(
        code === '23505'
          ? t('domain:orderContacts.duplicate')
          : (readableDbError(caught) ?? t('domain:orderContacts.saveError')),
      );
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {t('domain:orderContacts.newTitle')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:orderContacts.description')}</FormDrawerDescription>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={f('contact')}>{t('domain:orderContacts.contact')}</Label>
          <ContactPicker
            id={f('contact')}
            contactRole="any"
            value={contact?.id ?? null}
            onChange={onContact}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={f('role')}>{t('domain:orderContacts.role')}</Label>
          <Select
            id={f('role')}
            value={role}
            onChange={(_, { value }) => setRole(value as OrderContactRole)}
          >
            {ORDER_CONTACT_ROLES.map((value) => (
              <option key={value} value={value}>
                {t(`domain:orderContactRole.${value}`)}
              </option>
            ))}
          </Select>
        </div>
        {(persons.data ?? []).length > 0 ? (
          <div className="grid gap-2">
            <Label htmlFor={f('person')}>{t('domain:orderContacts.person')}</Label>
            <Select
              id={f('person')}
              value={personId}
              onChange={(_, { value }) => setPersonId(value)}
            >
              <option value="">{t('domain:orderContacts.noPerson')}</option>
              {(persons.data ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {[person.first_name, person.last_name].filter(Boolean).join(' ')}
                  {person.position ? ` · ${person.position}` : ''}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor={f('note')}>{t('domain:orderContacts.note')}</Label>
          <Input id={f('note')} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
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
