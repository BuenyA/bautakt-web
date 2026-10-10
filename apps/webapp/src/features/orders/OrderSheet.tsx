import {
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
  Select,
  Textarea,
} from '@fluentui/react-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type Ref, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { DateRangePicker } from '@/components/form/dateTime';
import { useMembership } from '@/features/company/useMembership';
import { customerDisplayName, useCustomers } from '@/features/customers/useCustomers';
import { useCostCenters } from '@/features/masterdata/useMasterData';
import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { emptyOrder, type OrderDraft } from './orderDraft';
import {
  costCenterOptionLabel,
  displayedCountry,
  draftFromOrder,
  orderCountryOptions,
  type OrderEditDraft,
  type OrderEditIssue,
  orderEditIssue,
  type OrderEditSource,
} from './orderEdit';
import { useOrderHasSalesDocuments, useUpdateOrder } from './useUpdateOrder';

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
 * Auftrag anlegen oder seine Stammdaten ändern.
 *
 * Kurzes Formular, also ein Seitenpanel. Das Formular wird nur gemountet,
 * solange das Panel offen ist, und startet damit jedes Mal frisch. Anlegen
 * bleibt das kurze Formular von #24. Bearbeiten füllt dieselben Felder wie
 * „Details bearbeiten“ in der Handy-App, ohne Icon und Titelbild.
 */
export function OrderSheet(
  props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  } & ({ mode: 'create' } | { mode: 'edit'; order: OrderEditSource }),
) {
  const { open, onOpenChange } = props;
  return (
    <FormDrawer open={open} onOpenChange={onOpenChange}>
      {open ? (
        props.mode === 'edit' ? (
          <OrderEditForm order={props.order} onDone={() => onOpenChange(false)} />
        ) : (
          <OrderForm onDone={() => onOpenChange(false)} />
        )
      ) : null}
    </FormDrawer>
  );
}

function OrderForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateOrder();
  const [draft, setDraft] = useState<OrderDraft>(emptyOrder());
  const [error, setError] = useState<string | null>(null);
  const [nameAttempted, setNameAttempted] = useState(false);
  const [nameReveal, setNameReveal] = useState(0);
  const nameRef = useScrollField(nameAttempted && !draft.name.trim(), nameReveal);
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

    // Eine Bezeichnung aus nur Leerzeichen wäre in der Liste nicht zu finden.
    // Die Spalte selbst akzeptiert den leeren Text. Die Meldung steht am
    // Feld: am Ende des Panels scrollt sie aus dem sichtbaren Bereich, das
    // Sheet bleibt offen und der Klick sieht aus, als hätte er nichts getan.
    if (!draft.name.trim()) {
      setNameAttempted(true);
      setNameReveal((pulse) => pulse + 1);
      setError(null);
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
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {t('domain:orders.create.title')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:orders.create.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <TextField
          id={ids.name}
          label={t('domain:orders.columns.name')}
          value={draft.name}
          onChange={(value) => set({ name: value })}
          error={
            nameAttempted && !draft.name.trim() ? t('domain:orders.create.nameRequired') : undefined
          }
          containerRef={nameRef}
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
      </DrawerBody>

      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={create.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

function OrderEditForm({ order, onDone }: { order: OrderEditSource; onDone: () => void }) {
  const { t } = useTranslation();
  const update = useUpdateOrder();
  const customers = useCustomers();
  const costCenters = useCostCenters();
  const documents = useOrderHasSalesDocuments(order.id);
  const [draft, setDraft] = useState<OrderEditDraft>(() => draftFromOrder(order));
  const [error, setError] = useState<string | null>(null);
  const [nameAttempted, setNameAttempted] = useState(false);
  const [nameReveal, setNameReveal] = useState(0);
  const nameMissing = nameAttempted && !draft.name.trim();
  const nameRef = useScrollField(nameMissing, nameReveal);
  const ids = {
    name: useId(),
    customerLabel: useId(),
    customer: useId(),
    costCenter: useId(),
    street: useId(),
    zip: useId(),
    city: useId(),
    country: useId(),
    start: useId(),
    end: useId(),
    description: useId(),
  };

  function set(patch: Partial<OrderEditDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function issueMessage(issue: OrderEditIssue): string {
    switch (issue) {
      case 'name':
        return t('domain:orders.create.nameRequired');
      case 'endBeforeStart':
        return t('domain:orders.edit.endBeforeStart');
    }
  }

  function onCustomer(id: string) {
    const customer = (customers.data ?? []).find((row) => row.id === id);
    const label = customer
      ? customerDisplayName(customer) || t('domain:customers.unnamed')
      : draft.customer_label;
    set({ customer_id: id, customer_label: label });
  }

  function onCostCenter(id: string) {
    const center = (costCenters.data ?? []).find((row) => row.id === id);
    const label = center
      ? costCenterOptionLabel(center.code, center.name)
      : draft.cost_center_label;
    set({ cost_center_id: id, cost_center_label: label });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const issue = orderEditIssue(draft);
    if (issue === 'name') {
      setNameAttempted(true);
      setNameReveal((pulse) => pulse + 1);
      setError(null);
      return;
    }
    if (issue) {
      setError(issueMessage(issue));
      return;
    }

    try {
      const result = await update.mutateAsync({ order, draft });
      if (result === 'saved') toast.success(t('domain:orders.edit.saved'));
      onDone();
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'INVALID_ORDER') {
        const again = orderEditIssue(draft);
        if (again === 'name') {
          setNameAttempted(true);
          setNameReveal((pulse) => pulse + 1);
          setError(null);
          return;
        }
        setError(again ? issueMessage(again) : t('domain:orders.edit.saveError'));
        return;
      }
      setError(readableDbError(caught) ?? t('domain:orders.edit.saveError'));
    }
  }

  const customerRows = [...(customers.data ?? [])].sort((a, b) =>
    customerDisplayName(a).localeCompare(customerDisplayName(b), 'de'),
  );
  const customerKnown = customerRows.some((row) => row.id === draft.customer_id);
  const costCenterRows = costCenters.data ?? [];
  const costCenterKnown = costCenterRows.some((row) => row.id === draft.cost_center_id);
  const customerChanged = (draft.customer_id ?? null) !== (order.customer_id ?? null);
  const showDocumentWarning = customerChanged && documents.data === true;
  const countries = orderCountryOptions(draft.country);

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {t('domain:orders.edit.title')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:orders.edit.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <TextField
          id={ids.name}
          label={t('domain:orders.columns.name')}
          value={draft.name}
          onChange={(value) => set({ name: value })}
          error={nameMissing ? t('domain:orders.create.nameRequired') : undefined}
          containerRef={nameRef}
        />

        <div className="grid gap-2">
          <Label htmlFor={draft.customer_id ? ids.customer : ids.customerLabel}>
            {t('domain:orders.fields.customer')}
          </Label>
          {draft.customer_id ? null : (
            <>
              <Input
                id={ids.customerLabel}
                value={draft.customer_label}
                onChange={(event) => set({ customer_label: event.target.value })}
                autoComplete="off"
              />
              <p className="text-muted-foreground text-sm">
                {t('domain:orders.edit.customerHint')}
              </p>
            </>
          )}
          <Select
            id={ids.customer}
            value={draft.customer_id ?? ''}
            onChange={(_, { value }) => onCustomer(value)}
          >
            <option value="" disabled>
              {t('domain:orders.edit.chooseCustomer')}
            </option>
            {draft.customer_id && !customerKnown ? (
              <option value={draft.customer_id}>
                {draft.customer_label.trim() || t('domain:customers.unnamed')}
              </option>
            ) : null}
            {customerRows.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customerDisplayName(customer) || t('domain:customers.unnamed')}
              </option>
            ))}
          </Select>
          {customers.isError ? (
            <p className="text-destructive text-sm">{t('domain:orders.edit.customersError')}</p>
          ) : !customers.isPending && customerRows.length === 0 && !draft.customer_id ? (
            <p className="text-muted-foreground text-sm">{t('domain:orders.edit.noCustomers')}</p>
          ) : null}
          {showDocumentWarning ? (
            <p className="border-warning-border bg-warning-bg text-text-secondary rounded-xl border p-3 text-sm">
              {t('domain:orders.edit.documentWarning')}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.costCenter}>{t('domain:orders.fields.costCenter')}</Label>
          <Select
            id={ids.costCenter}
            value={draft.cost_center_id ?? ''}
            onChange={(_, { value }) => onCostCenter(value)}
          >
            <option value="" disabled>
              {t('domain:orders.edit.chooseCostCenter')}
            </option>
            {draft.cost_center_id && !costCenterKnown ? (
              <option value={draft.cost_center_id}>
                {draft.cost_center_label.trim() || t('domain:orders.edit.unnamedCostCenter')}
              </option>
            ) : null}
            {costCenterRows.map((center) => (
              <option key={center.id} value={center.id}>
                {costCenterOptionLabel(center.code, center.name)}
              </option>
            ))}
          </Select>
          {costCenters.isError ? (
            <p className="text-destructive text-sm">{t('domain:orders.edit.costCentersError')}</p>
          ) : !costCenters.isPending && costCenterRows.length === 0 && !draft.cost_center_id ? (
            <p className="text-muted-foreground text-sm">{t('domain:orders.edit.noCostCenters')}</p>
          ) : null}
        </div>

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
          <Label htmlFor={ids.country}>{t('domain:orders.fields.country')}</Label>
          <Select
            id={ids.country}
            value={displayedCountry(draft.country)}
            onChange={(_, { value }) => set({ country: value })}
          >
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </div>

        <DateRangePicker
          startId={ids.start}
          endId={ids.end}
          startLabel={t('domain:orders.fields.start')}
          endLabel={t('domain:orders.fields.end')}
          startAriaLabel={t('domain:orders.fields.start')}
          endAriaLabel={t('domain:orders.fields.end')}
          start={draft.start_date}
          end={draft.end_date}
          onStartChange={(start_date) => set({ start_date })}
          onEndChange={(end_date) => set({ end_date })}
          rangeMessage={t('domain:orders.edit.endBeforeStart')}
        />

        <div className="grid gap-2">
          <Label htmlFor={ids.description}>{t('domain:orders.create.notes')}</Label>
          <Textarea
            id={ids.description}
            rows={3}
            value={draft.description}
            onChange={(event) => set({ description: event.target.value })}
          />
        </div>

        {error && error !== t('domain:orders.edit.endBeforeStart') ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </DrawerBody>

      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={update.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  containerRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  containerRef?: Ref<HTMLDivElement>;
}) {
  const errorId = `${id}-error`;
  return (
    <div ref={containerRef} className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Pflichtfeld in den sichtbaren Bereich holen.
 *
 * `SheetBody` scrollt, der Speichern-Knopf bleibt unten stehen. Eine Meldung
 * am Ende der Felder ist beim Bearbeiten nicht zu sehen. Der Effekt läuft
 * nach dem Render, wenn der Text schon unter dem Feld steht.
 */
function useScrollField(active: boolean, pulse: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    ref.current?.scrollIntoView({ block: 'center' });
    ref.current?.querySelector('input')?.focus();
  }, [active, pulse]);
  return ref;
}
