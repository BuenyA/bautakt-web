import { formatMoney, todayIso } from '@bautakt/finance';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
  Uicon,
} from '@bautakt/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { customerDisplayName, useCustomers } from '@/features/customers/useCustomers';
import { routes } from '@/lib/routes';

import {
  type EditableDocumentType,
  type EditorLine,
  type EditorState,
  editorTotals,
  emptyLine,
  LINE_KINDS,
  lineNetMinor,
  useSaveDraft,
} from '../useDocumentEditor';
import { useSalesDocument } from '../useSalesDocument';

const NO_CUSTOMER = '__none__';

function initialState(type: EditableDocumentType): EditorState {
  return {
    type,
    customerId: null,
    issueDate: todayIso(),
    serviceDate: '',
    dueDate: '',
    introText: '',
    footerText: '',
    notes: '',
    lines: [emptyLine()],
  };
}

/**
 * Editor fuer Angebote und Rechnungen.
 *
 * Eigene Seite statt Seitenpanel: eine Positionsliste mit Menge, Einzelpreis,
 * Rabatt und Steuersatz braucht die volle Breite. Kurze Formulare bleiben
 * Panels.
 *
 * ⚠️ Nur Entwuerfe. Festgeschriebene Belege sperrt die Datenbank
 * (`enforce_sales_document_immutability`) — sie hier zum Bearbeiten anzubieten
 * hiesse, dem Nutzer einen Speichern-Knopf zu zeigen, der scheitern muss.
 */
export function DocumentEditorPage({ type }: { type: EditableDocumentType }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const existing = useSalesDocument(id);
  const customers = useCustomers();
  const save = useSaveDraft(id);

  const [state, setState] = useState<EditorState | null>(id ? null : initialState(type));

  // Beim Bearbeiten: sobald der Beleg geladen ist, einmal in den Formularzustand
  // uebernehmen. Danach gehoert der Zustand dem Formular.
  if (id && state === null && existing.data) {
    setState({
      type: (existing.data.type as EditableDocumentType) ?? type,
      customerId: existing.data.customer_id,
      issueDate: existing.data.issue_date ?? todayIso(),
      serviceDate: existing.data.service_date ?? '',
      dueDate: existing.data.due_date ?? '',
      introText: existing.data.intro_text,
      footerText: existing.data.footer_text,
      notes: existing.data.notes,
      lines: existing.data.lines.length
        ? existing.data.lines.map((line) => ({
            key: line.id,
            title: line.title,
            description: line.description,
            kind: (LINE_KINDS as readonly string[]).includes(line.kind)
              ? (line.kind as EditorLine['kind'])
              : 'other',
            quantity: String(line.quantity),
            unit: line.unit,
            unitPrice: String(line.unit_price),
            discountPercent: String(line.discount_percent),
            taxRatePercent: String(line.tax_rate_percent),
          }))
        : [emptyLine()],
    });
  }

  const totals = useMemo(() => (state ? editorTotals(state.lines) : null), [state]);

  if (id && existing.isLoading) return <PageSpinner />;

  if (id && existing.data && existing.data.status !== 'draft') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:editor.title')} />
        <EmptyState
          title={t('domain:editor.lockedTitle')}
          description={t('domain:editor.lockedDescription')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={routes.invoice(id)}>{t('domain:editor.toDocument')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!state || !totals) return <PageSpinner />;

  function update(patch: Partial<EditorState>) {
    setState((current) => (current ? { ...current, ...patch } : current));
  }

  function updateLine(key: string, patch: Partial<EditorLine>) {
    setState((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
          }
        : current,
    );
  }

  async function onSave() {
    if (!state) return;
    try {
      const savedId = await save.mutateAsync(state);
      toast.success(t('domain:editor.saved'));
      void navigate(routes.invoice(savedId));
    } catch (error) {
      toast.error(t('domain:editor.saveError'), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={id ? t('domain:editor.editTitle') : t(`domain:editor.newTitle.${state.type}`)}
        description={t('domain:editor.draftHint')}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={state.type === 'quote' ? routes.quotes : routes.invoices}>
                {t('common:action.cancel')}
              </Link>
            </Button>
            <Button size="sm" disabled={save.isPending} onClick={() => void onSave()}>
              {t('common:action.save')}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('domain:editor.head')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label>{t('domain:invoices.columns.customer')}</Label>
            <Select
              value={state.customerId ?? NO_CUSTOMER}
              onValueChange={(value) =>
                update({ customerId: value === NO_CUSTOMER ? null : value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CUSTOMER}>{t('domain:invoices.noCustomer')}</SelectItem>
                {(customers.data ?? []).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customerDisplayName(customer) || t('domain:customers.unnamed')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DateField
            label={t('domain:invoices.columns.issueDate')}
            value={state.issueDate}
            onChange={(value) => update({ issueDate: value })}
          />
          <DateField
            label={t('domain:invoices.serviceDate')}
            value={state.serviceDate}
            onChange={(value) => update({ serviceDate: value })}
          />
          <DateField
            label={t('domain:invoices.columns.dueDate')}
            value={state.dueDate}
            onChange={(value) => update({ dueDate: value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('domain:invoices.lines')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {state.lines.map((line) => (
            <div
              key={line.key}
              className="border-border grid gap-3 rounded-lg border p-3 xl:grid-cols-[1fr_8rem_6rem_7rem_6rem_6rem_7rem_2.5rem]"
            >
              <Field
                label={t('domain:invoices.lineColumns.title')}
                value={line.title}
                onChange={(value) => updateLine(line.key, { title: value })}
              />
              <div className="grid gap-2">
                <Label>{t('domain:editor.kind')}</Label>
                <Select
                  value={line.kind}
                  onValueChange={(value) =>
                    updateLine(line.key, { kind: value as EditorLine['kind'] })
                  }
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINE_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {t(`domain:editor.kinds.${kind}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                label={t('domain:invoices.lineColumns.quantity')}
                value={line.quantity}
                onChange={(value) => updateLine(line.key, { quantity: value })}
                numeric
              />
              <Field
                label={t('domain:editor.unit')}
                value={line.unit}
                onChange={(value) => updateLine(line.key, { unit: value })}
              />
              <Field
                label={t('domain:invoices.lineColumns.unitPrice')}
                value={line.unitPrice}
                onChange={(value) => updateLine(line.key, { unitPrice: value })}
                numeric
              />
              <Field
                label={t('domain:editor.discount')}
                value={line.discountPercent}
                onChange={(value) => updateLine(line.key, { discountPercent: value })}
                numeric
              />
              <div className="grid gap-2">
                <Label>{t('domain:invoices.lineColumns.net')}</Label>
                <span className="text-foreground flex h-9 items-center justify-end text-sm font-medium tabular-nums">
                  {line.kind === 'text' ? '—' : formatMoney(lineNetMinor(line))}
                </span>
              </div>
              <div className="flex items-end justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label={t('domain:editor.removeLine')}
                  disabled={state.lines.length === 1}
                  onClick={() =>
                    update({ lines: state.lines.filter((entry) => entry.key !== line.key) })
                  }
                >
                  <Uicon name="trash" size={16} />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => update({ lines: [...state.lines, emptyLine()] })}
            >
              <Uicon name="plus" size={16} />
              {t('domain:editor.addLine')}
            </Button>

            <dl className="flex w-full max-w-xs flex-col gap-1 text-sm">
              <SumRow label={t('domain:invoices.net')} value={formatMoney(totals.netMinor)} />
              {totals.byRate.map((group) => (
                <SumRow
                  key={group.rate}
                  label={t('domain:invoices.vatAt', { rate: group.rate })}
                  value={formatMoney(group.vatMinor)}
                />
              ))}
              <SumRow
                label={t('domain:invoices.gross')}
                value={formatMoney(totals.grossMinor)}
                strong
              />
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('domain:editor.texts')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            <Label>{t('domain:editor.intro')}</Label>
            <Textarea
              rows={3}
              value={state.introText}
              onChange={(event) => update({ introText: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t('domain:editor.footer')}</Label>
            <Textarea
              rows={3}
              value={state.footerText}
              onChange={(event) => update({ footerText: event.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        className={numeric ? 'h-9 text-right tabular-nums' : 'h-9'}
        inputMode={numeric ? 'decimal' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SumRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? 'text-foreground font-medium' : 'text-muted-foreground'}>{label}</dt>
      <dd className={strong ? 'font-semibold tabular-nums' : 'tabular-nums'}>{value}</dd>
    </div>
  );
}
