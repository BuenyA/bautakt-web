import {
  Button,
  Input,
  Label,
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
import { useNavigate } from 'react-router';

import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { emptyOrder, type OrderDraft } from './orderDraft';

/**
 * Legt einen Auftrag in `orders` an und liefert die vom Client vergebene Id.
 *
 * Pflicht laut Schema sind `id`, `company_id` und `name`. `orders.id` hat kein
 * Default — die Handy-App vergibt die Id vor dem Sync, das Web ebenso
 * (wiki/pages/fallstricke.md). Status, Abrechnungsart und Land bleiben auf den
 * Spalten-Defaults (`active`, `regie`, leerer Text). `customer_id` bleibt leer:
 * das Formular schreibt nur die Bezeichnung, die die Liste schon anzeigt.
 */
function useCreateOrder() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: OrderDraft): Promise<string> => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');

      const id = crypto.randomUUID();
      const { error } = await supabase.from('orders').insert({
        id,
        company_id: companyId,
        name: draft.name.trim(),
        customer_label: draft.customer_label.trim(),
        street_address: draft.street_address.trim(),
        postal_code: draft.postal_code.trim(),
        city: draft.city.trim(),
        description: draft.description.trim(),
      });
      if (error) throw error;
      return id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders', companyId] });
    },
  });
}

/**
 * Auftrag anlegen.
 *
 * Kurzes Formular, also ein Seitenpanel: die Auftragsliste bleibt dahinter
 * sichtbar. Das Formular wird nur gemountet, solange das Panel offen ist, und
 * startet damit jedes Mal frisch.
 */
export function OrderSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open ? <OrderForm onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function OrderForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateOrder();
  const [draft, setDraft] = useState<OrderDraft>(emptyOrder());
  const [error, setError] = useState<string | null>(null);
  const ids = {
    name: useId(),
    customer: useId(),
    street: useId(),
    zip: useId(),
    city: useId(),
    description: useId(),
  };

  function set(patch: Partial<OrderDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    // Eine Bezeichnung aus nur Leerzeichen waere in der Liste nicht zu finden.
    // Die Spalte selbst akzeptiert den leeren Text; die Pruefung hier ist die
    // gleiche wie beim Kundenformular.
    if (!draft.name.trim()) {
      setError(t('domain:orders.create.nameRequired'));
      return;
    }

    try {
      const id = await create.mutateAsync(draft);
      toast.success(t('domain:orders.create.saved'));
      navigate(routes.order(id));
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:orders.create.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{t('domain:orders.create.title')}</SheetTitle>
        <SheetDescription>{t('domain:orders.create.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <TextField
          id={ids.name}
          label={t('domain:orders.columns.name')}
          value={draft.name}
          onChange={(value) => set({ name: value })}
        />
        <TextField
          id={ids.customer}
          label={t('domain:orders.fields.customer')}
          value={draft.customer_label}
          onChange={(value) => set({ customer_label: value })}
        />
        <TextField
          id={ids.street}
          label={t('domain:orders.create.street')}
          value={draft.street_address}
          onChange={(value) => set({ street_address: value })}
        />
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <TextField
            id={ids.zip}
            label={t('domain:orders.create.postalCode')}
            value={draft.postal_code}
            onChange={(value) => set({ postal_code: value })}
          />
          <TextField
            id={ids.city}
            label={t('domain:orders.create.city')}
            value={draft.city}
            onChange={(value) => set({ city: value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={ids.description}>{t('domain:orders.create.notes')}</Label>
          <Textarea
            id={ids.description}
            rows={3}
            value={draft.description}
            onChange={(event) => set({ description: event.target.value })}
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button type="submit" disabled={create.isPending}>
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
