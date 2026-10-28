import {
  formatMoney,
  formatMoneyInput,
  fromMinorUnits,
  parseMoneyInput,
  todayIso,
} from '@bautakt/finance';
import {
  DangerButton,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  Spinner,
  Textarea,
  Tooltip,
} from '@fluentui/react-components';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker } from '@/components/form/dateTime';
import { ContactPicker } from '@/features/contacts/ContactPicker';
import type { ContactListRow } from '@/features/contacts/useContacts';
import { useOrders } from '@/features/orders/useOrders';
import { readableDbError } from '@/lib/dbErrors';

import {
  canDelete,
  canEditFields,
  type IncomingInvoiceStatus,
  isIncomingInvoiceStatus,
  statusOptions,
  suggestGross,
  validateIncomingInvoice,
} from './incomingInvoiceForm';
import { useCostCategories } from './useCostCategories';
import {
  type IncomingInvoiceRow,
  useDeleteIncomingDraft,
  useIncomingInvoice,
  useSaveIncomingInvoice,
} from './useIncomingInvoice';

/**
 * Eingangsrechnung erfassen oder öffnen (bautakt-web#88), Parität zu
 * `payables.tsx` der App.
 *
 * Felder bearbeiten nur im Entwurf; ein erfasster Beleg ist
 * aufbewahrungspflichtig und ändert nur noch seinen Status. Löschen nur im
 * Entwurf. Die Grenze ziehen die Trigger der Datenbank, das Formular bietet
 * nur an, was dort durchgeht.
 */
export function IncomingInvoiceSheet({
  open,
  invoiceId,
  onOpenChange,
}: {
  open: boolean;
  /** `null`: neue Eingangsrechnung. */
  invoiceId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormDrawer open={open} onOpenChange={onOpenChange}>
      {open ? (
        <IncomingInvoiceLoader
          key={invoiceId ?? 'new'}
          invoiceId={invoiceId}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormDrawer>
  );
}

function IncomingInvoiceLoader({
  invoiceId,
  onDone,
}: {
  invoiceId: string | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const invoice = useIncomingInvoice(invoiceId);

  if (invoiceId === null) return <IncomingInvoiceForm saved={null} onDone={onDone} />;
  if (invoice.isPending) {
    return (
      <DrawerBody className="flex items-center justify-center">
        <Spinner />
      </DrawerBody>
    );
  }
  if (invoice.isError) {
    return (
      <DrawerBody className="flex flex-col gap-4 pt-6">
        <MessageBar intent="error" layout="multiline">
          <MessageBarBody>
            {readableDbError(invoice.error) ?? t('domain:incomingInvoiceForm.loadError')}
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => void invoice.refetch()}>{t('common:action.retry')}</Button>
          </MessageBarActions>
        </MessageBar>
      </DrawerBody>
    );
  }
  return <IncomingInvoiceForm saved={invoice.data} onDone={onDone} />;
}

const toInput = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : formatMoneyInput(value);

function IncomingInvoiceForm({
  saved,
  onDone,
}: {
  saved: IncomingInvoiceRow | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveIncomingInvoice();
  const remove = useDeleteIncomingDraft();
  const categories = useCostCategories();
  const orders = useOrders();
  const ids = {
    supplier: useId(),
    vendor: useId(),
    number: useId(),
    date: useId(),
    due: useId(),
    net: useId(),
    vat: useId(),
    gross: useId(),
    order: useId(),
    category: useId(),
    status: useId(),
    notes: useId(),
  };

  const savedStatus: IncomingInvoiceStatus | null =
    saved && isIncomingInvoiceStatus(saved.status) ? saved.status : null;
  const editable = canEditFields(savedStatus);

  const [supplierId, setSupplierId] = useState<string | null>(saved?.supplier_id ?? null);
  const [vendorName, setVendorName] = useState(saved?.vendor_name ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(saved?.invoice_number ?? '');
  const [invoiceDate, setInvoiceDate] = useState(saved?.invoice_date ?? todayIso());
  const [dueDate, setDueDate] = useState(saved?.due_date ?? '');
  const [net, setNet] = useState(toInput(saved?.net_total));
  const [vat, setVat] = useState(toInput(saved?.vat_total));
  const [gross, setGross] = useState(toInput(saved?.gross_total));
  const [orderId, setOrderId] = useState(saved?.order_id ?? '');
  const [categoryId, setCategoryId] = useState(saved?.cost_category_id ?? '');
  const [notes, setNotes] = useState(saved?.notes ?? '');
  const [status, setStatus] = useState<IncomingInvoiceStatus>(savedStatus ?? 'open');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Die Meldung steht unter dem letzten Feld; ohne Scrollen sähe sie keiner.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [error]);

  const fields = {
    vendorName,
    invoiceDate,
    dueDate,
    netMinor: parseMoneyInput(net),
    vatMinor: parseMoneyInput(vat),
    grossMinor: parseMoneyInput(gross),
  };

  function onSupplier(contact: ContactListRow | null) {
    setSupplierId(contact?.id ?? null);
    if (!contact) return;
    // Der Name auf dem Beleg bleibt überschreibbar.
    setVendorName(contact.name);
    if (!categoryId && contact.default_cost_category_id) {
      setCategoryId(contact.default_cost_category_id);
    }
  }

  // Brutto aus Netto + USt, sobald beides da ist und Brutto noch leer.
  function fillGross() {
    if (gross.trim()) return;
    const suggested = suggestGross(fields);
    if (suggested !== null) setGross(formatMoneyInput(fromMinorUnits(suggested)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (editable) {
      const problems = validateIncomingInvoice(fields, status);
      if (problems.length > 0) {
        setError(problems.map((key) => t(`domain:incomingInvoiceForm.errors.${key}`)).join(' '));
        return;
      }
    }

    try {
      await save.mutateAsync({
        id: saved?.id ?? null,
        onlyStatus: !editable,
        values: {
          status,
          supplier_id: supplierId,
          vendor_name: vendorName.trim(),
          invoice_number: invoiceNumber.trim(),
          invoice_date: invoiceDate || todayIso(),
          due_date: dueDate || null,
          net_total: fromMinorUnits(fields.netMinor ?? 0),
          vat_total: fromMinorUnits(fields.vatMinor ?? 0),
          gross_total: fromMinorUnits(fields.grossMinor ?? 0),
          order_id: orderId || null,
          cost_category_id: categoryId || null,
          notes: notes.trim(),
        },
      });
      toast.success(t('domain:incomingInvoiceForm.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:incomingInvoiceForm.saveError'));
    }
  }

  async function onDelete() {
    if (!saved) return;
    try {
      await remove.mutateAsync(saved.id);
      toast.success(t('domain:incomingInvoiceForm.deleted'));
      setConfirmDelete(false);
      onDone();
    } catch (caught) {
      setConfirmDelete(false);
      setError(readableDbError(caught) ?? t('domain:incomingInvoiceForm.deleteError'));
    }
  }

  const sumOk =
    fields.netMinor !== null &&
    fields.vatMinor !== null &&
    fields.grossMinor !== null &&
    fields.netMinor + fields.vatMinor === fields.grossMinor;

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {saved
            ? t('domain:incomingInvoiceForm.editTitle')
            : t('domain:incomingInvoiceForm.title')}
        </FormDrawerTitle>
        <FormDrawerDescription>
          {editable
            ? t('domain:incomingInvoiceForm.description')
            : t('domain:incomingInvoiceForm.retainedDescription')}
        </FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={ids.supplier}>{t('domain:expenses.columns.vendor')}</Label>
          <ContactPicker
            id={ids.supplier}
            contactRole="supplier"
            value={supplierId}
            onChange={onSupplier}
            allowNone
            noneLabel={t('domain:expenseForm.noSupplier')}
            disabled={!editable}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.vendor} required={status !== 'draft'}>
            {t('domain:expenseForm.vendorOnReceipt')}
          </Label>
          <Input
            id={ids.vendor}
            value={vendorName}
            disabled={!editable}
            onChange={(event) => setVendorName(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.number}>{t('domain:expenses.columns.number')}</Label>
          <Input
            id={ids.number}
            value={invoiceNumber}
            disabled={!editable}
            onChange={(event) => setInvoiceNumber(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.date} required={status !== 'draft'}>
              {t('domain:expenses.columns.date')}
            </Label>
            <DatePicker
              id={ids.date}
              aria-label={t('domain:expenses.columns.date')}
              value={invoiceDate}
              onChange={setInvoiceDate}
              disabled={!editable}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.due} required={status !== 'draft'}>
              {t('domain:expenses.columns.due')}
            </Label>
            <DatePicker
              id={ids.due}
              aria-label={t('domain:expenses.columns.due')}
              value={dueDate}
              onChange={setDueDate}
              disabled={!editable}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyField
            id={ids.net}
            label={t('domain:invoices.net')}
            value={net}
            onChange={setNet}
            onBlur={fillGross}
            required={status !== 'draft'}
            disabled={!editable}
          />
          <MoneyField
            id={ids.vat}
            label={t('domain:invoices.vat')}
            value={vat}
            onChange={setVat}
            onBlur={fillGross}
            required={status !== 'draft'}
            disabled={!editable}
          />
          <MoneyField
            id={ids.gross}
            label={t('domain:invoices.gross')}
            value={gross}
            onChange={setGross}
            required={status !== 'draft'}
            disabled={!editable}
          />
        </div>
        {editable &&
        fields.netMinor !== null &&
        fields.vatMinor !== null &&
        fields.grossMinor !== null ? (
          <p className={sumOk ? 'text-muted-foreground text-sm' : 'text-destructive text-sm'}>
            {sumOk
              ? t('domain:incomingInvoiceForm.sumOk')
              : t('domain:incomingInvoiceForm.sumHint', {
                  expected: formatMoney(fields.netMinor + fields.vatMinor),
                })}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.order}>{t('domain:incomingInvoiceForm.order')}</Label>
            <Select
              id={ids.order}
              value={orderId}
              disabled={!editable}
              onChange={(_, { value }) => setOrderId(value)}
            >
              <option value="">{t('domain:incomingInvoiceForm.noOrder')}</option>
              {(orders.data ?? []).map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.category}>{t('domain:expenses.columns.category')}</Label>
            <Select
              id={ids.category}
              value={categoryId}
              disabled={!editable}
              onChange={(_, { value }) => setCategoryId(value)}
            >
              <option value="">{t('domain:incomingInvoiceForm.noCategory')}</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.status}>{t('domain:incomingInvoiceForm.status')}</Label>
          <Select
            id={ids.status}
            value={status}
            onChange={(_, { value }) => {
              if (isIncomingInvoiceStatus(value)) setStatus(value);
            }}
          >
            {statusOptions(savedStatus).map((option) => (
              <option key={option} value={option}>
                {t(`domain:incomingInvoiceStatus.${option}`)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.notes}>{t('domain:contactForm.notes')}</Label>
          <Textarea
            id={ids.notes}
            rows={3}
            value={notes}
            disabled={!editable}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {error ? (
          <div ref={errorRef}>
            <MessageBar intent="error" layout="multiline">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          </div>
        ) : null}
      </DrawerBody>

      <FormDrawerFooter>
        {saved ? (
          canDelete(savedStatus) ? (
            <DangerButton type="button" onClick={() => setConfirmDelete(true)}>
              {t('common:action.delete')}
            </DangerButton>
          ) : (
            <Tooltip
              content={t('domain:incomingInvoiceForm.deleteRetained')}
              relationship="description"
            >
              <Button type="button" disabledFocusable>
                {t('common:action.delete')}
              </Button>
            </Tooltip>
          )
        ) : null}
        <span className="flex-1" />
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={save.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>

      <Dialog open={confirmDelete} onOpenChange={(_, data) => setConfirmDelete(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('domain:incomingInvoiceForm.deleteTitle')}</DialogTitle>
            <DialogContent>{t('domain:incomingInvoiceForm.deleteText')}</DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDelete(false)}>{t('common:action.cancel')}</Button>
              <DangerButton onClick={() => void onDelete()} disabled={remove.isPending}>
                {t('common:action.delete')}
              </DangerButton>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </form>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  onBlur,
  required,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required: boolean;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        input={{ className: 'text-right tabular-nums' }}
        placeholder="0,00"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
