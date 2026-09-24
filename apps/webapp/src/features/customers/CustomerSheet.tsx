import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
  toast,
} from '@bautakt/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import type { CustomerDraft } from './customerDraft';

/** Anlegen oder aendern — je nachdem, ob der Entwurf schon eine Id hat. */
function useSaveCustomer() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: CustomerDraft) => {
      const row = {
        company_id: companyId!,
        customer_type: draft.customer_type,
        company_name: draft.company_name.trim(),
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim(),
        // Leere Kundennummer als NULL: die Spalte ist nullable, und ein leerer
        // Text waere eine Nummer, die es nicht gibt.
        customer_number: draft.customer_number.trim() || null,
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        street_address: draft.street_address.trim(),
        postal_code: draft.postal_code.trim(),
        city: draft.city.trim(),
        notes: draft.notes.trim(),
      };

      // ⚠️ `customers.id` hat in der Datenbank KEIN Default: die Id kommt vom
      // Client. Das ist kein Versehen, sondern Folge des Offline-First-Ansatzes
      // der Handy-App — dort entstehen Datensaetze ohne Verbindung und tragen
      // ihre Id schon vorher. Das Web haelt sich daran.
      const query = draft.id
        ? supabase.from('customers').update(row).eq('id', draft.id).eq('company_id', companyId!)
        : supabase.from('customers').insert({ ...row, id: crypto.randomUUID() });

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['customer', companyId] });
    },
  });
}

/**
 * Kunde anlegen oder bearbeiten.
 *
 * Kurzes Formular, also ein Seitenpanel: die Kundenliste bleibt dahinter
 * sichtbar. Das Formular wird nur gemountet, solange das Panel offen ist, und
 * startet damit jedes Mal frisch.
 */
export function CustomerSheet({
  draft,
  open,
  onOpenChange,
}: {
  draft: CustomerDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open && draft ? <CustomerForm initial={draft} onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function CustomerForm({ initial, onDone }: { initial: CustomerDraft; onDone: () => void }) {
  const { t } = useTranslation();
  const save = useSaveCustomer();
  const [draft, setDraft] = useState<CustomerDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const ids = {
    company: useId(),
    first: useId(),
    last: useId(),
    number: useId(),
    email: useId(),
    phone: useId(),
    street: useId(),
    zip: useId(),
    city: useId(),
    notes: useId(),
  };

  const isBusiness = draft.customer_type === 'b2b';

  function set(patch: Partial<CustomerDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    // Ein Kunde ohne Namen ist in der Liste nicht wiederzufinden.
    const hasName = isBusiness
      ? draft.company_name.trim()
      : `${draft.first_name}${draft.last_name}`.trim();
    if (!hasName) {
      setError(t('domain:customerForm.nameRequired'));
      return;
    }

    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:customerForm.saved'));
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('domain:customerForm.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>
          {draft.id ? t('domain:customerForm.editTitle') : t('domain:customerForm.newTitle')}
        </SheetTitle>
        <SheetDescription>{t('domain:customerForm.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label>{t('domain:customerForm.type')}</Label>
          <Select
            value={draft.customer_type}
            onValueChange={(value) => set({ customer_type: value as 'b2b' | 'b2c' })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="b2b">{t('domain:customerForm.types.b2b')}</SelectItem>
              <SelectItem value="b2c">{t('domain:customerForm.types.b2c')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isBusiness ? (
          <TextField
            id={ids.company}
            label={t('domain:customerForm.companyName')}
            value={draft.company_name}
            onChange={(value) => set({ company_name: value })}
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={ids.first}
            label={t('domain:customerForm.firstName')}
            value={draft.first_name}
            onChange={(value) => set({ first_name: value })}
          />
          <TextField
            id={ids.last}
            label={t('domain:customerForm.lastName')}
            value={draft.last_name}
            onChange={(value) => set({ last_name: value })}
          />
        </div>

        <TextField
          id={ids.number}
          label={t('domain:customers.columns.number')}
          value={draft.customer_number}
          onChange={(value) => set({ customer_number: value })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={ids.email}
            label={t('domain:customers.columns.email')}
            value={draft.email}
            onChange={(value) => set({ email: value })}
            type="email"
          />
          <TextField
            id={ids.phone}
            label={t('domain:customers.columns.phone')}
            value={draft.phone}
            onChange={(value) => set({ phone: value })}
            type="tel"
          />
        </div>

        <TextField
          id={ids.street}
          label={t('domain:customerForm.street')}
          value={draft.street_address}
          onChange={(value) => set({ street_address: value })}
        />

        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <TextField
            id={ids.zip}
            label={t('domain:customerForm.postalCode')}
            value={draft.postal_code}
            onChange={(value) => set({ postal_code: value })}
          />
          <TextField
            id={ids.city}
            label={t('domain:customers.columns.city')}
            value={draft.city}
            onChange={(value) => set({ city: value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.notes}>{t('domain:customerForm.notes')}</Label>
          <Textarea
            id={ids.notes}
            rows={3}
            value={draft.notes}
            onChange={(event) => set({ notes: event.target.value })}
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {t('common:action.save')}
        </Button>
      </SheetFooter>
    </form>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
