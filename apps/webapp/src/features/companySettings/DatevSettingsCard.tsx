import type { Tables } from '@bautakt/supabase';
import { SkeletonBlock, StatusBadge, toast } from '@bautakt/ui';
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import {
  ACCOUNT_LENGTHS,
  type AccountError,
  accountError,
  type AccountSlot,
  CASH_DISCOUNT_BOOKINGS,
  type CashDiscountBooking,
  type Chart,
  CHARTS,
  compareSlots,
  isValidClientNumber,
  isValidConsultantNumber,
  isValidTaxKey,
  slotKey,
  STANDARD_ACCOUNT_LENGTH,
  toOptionalNumber,
} from './datevSettings';

type Settings = Pick<
  Tables<'company_datev_settings'>,
  | 'consultant_number'
  | 'client_number'
  | 'chart_of_accounts'
  | 'account_length'
  | 'fiscal_year_start_month'
  | 'cash_discount_booking'
>;
type DefaultAccount = Tables<'datev_default_accounts'>;
type Mapping = Pick<
  Tables<'datev_account_mappings'>,
  'id' | 'chart_of_accounts' | 'purpose' | 'tax_mode' | 'tax_rate' | 'account' | 'tax_key'
>;

/** Ohne gespeicherte Zeile gelten dieselben Werte wie in `datev_effective_settings`. */
const DEFAULT_SETTINGS: Settings = {
  consultant_number: null,
  client_number: null,
  chart_of_accounts: 'SKR03',
  account_length: STANDARD_ACCOUNT_LENGTH,
  fiscal_year_start_month: 1,
  cash_discount_booking: 'on_note',
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const monthName = (month: number) =>
  new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(2026, month - 1, 1));

/** RLS lässt ein Write still ins Leere laufen; 0 Zeilen sind deshalb ein Fehler. */
class NothingWrittenError extends Error {}

function useDatevData() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['datev-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [settings, defaults, mappings] = await Promise.all([
        supabase
          .from('company_datev_settings')
          .select(
            'consultant_number, client_number, chart_of_accounts, account_length, fiscal_year_start_month, cash_discount_booking',
          )
          .eq('company_id', companyId!)
          .maybeSingle(),
        supabase.from('datev_default_accounts').select('*'),
        supabase
          .from('datev_account_mappings')
          .select('id, chart_of_accounts, purpose, tax_mode, tax_rate, account, tax_key')
          .eq('company_id', companyId!),
      ]);
      if (settings.error) throw settings.error;
      if (defaults.error) throw defaults.error;
      if (mappings.error) throw mappings.error;

      return {
        saved: settings.data !== null,
        settings: settings.data ?? DEFAULT_SETTINGS,
        defaults: defaults.data ?? [],
        mappings: mappings.data ?? [],
      };
    },
  });
}

/** Text für einen fehlgeschlagenen Write: was passiert ist, dahinter der Grund. */
function useSaveErrorText() {
  const { t } = useTranslation();
  return (caught: unknown) => {
    if (caught instanceof NothingWrittenError) return t('domain:datev.errors.nothingWritten');
    const detail = readableDbError(caught);
    return detail
      ? `${t('domain:datev.errors.saveFailed')} ${detail}`
      : t('domain:datev.errors.saveFailed');
  };
}

/** Meldung für einen fehlgeschlagenen Write, mit „Erneut versuchen“. */
function WriteError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <MessageBar intent="error" layout="multiline">
      <MessageBarBody>{message}</MessageBarBody>
      <MessageBarActions>
        <Button onClick={onRetry}>{t('common:action.retry')}</Button>
      </MessageBarActions>
    </MessageBar>
  );
}

/**
 * Einstellungen für den Export im DATEV-Format (#167): Berater- und
 * Mandantennummer, Kontenrahmen, Sachkontenlänge, Beginn des
 * Wirtschaftsjahrs, wann erhaltenes Skonto gebucht wird (#172) und die
 * Konten, die vom Standard abweichen.
 *
 * Die Standardkonten liegen in `datev_default_accounts`, nicht im Code. Der
 * Export fragt sie über `datev_resolve_account` ab (bautakt-app #126).
 */
export function DatevSettingsCard() {
  const { t } = useTranslation();
  const canEdit = usePermission('canManageCompanySettings');
  const canFinance = usePermission('canViewCompanyFinance');
  const canBilling = usePermission('canUseBillingModule');
  const canOverhead = usePermission('canManageOverheadCosts');
  const canView = canEdit || canFinance || canBilling || canOverhead;
  const { data, isLoading, isError, error, refetch } = useDatevData();

  if (!canView) return null;

  return (
    <div className="flex flex-col gap-4 xl:col-span-2">
      <SectionCard
        title={t('domain:datev.title')}
        description={<Text className="text-muted-foreground">{t('domain:datev.description')}</Text>}
      >
        {isLoading ? (
          <SkeletonBlock className="h-40 w-full" />
        ) : isError || !data ? (
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>
              {t('domain:datev.loadError')}
              {readableDbError(error) ? ` ${readableDbError(error)}` : ''}
            </MessageBarBody>
            <MessageBarActions>
              <Button onClick={() => void refetch()}>{t('common:action.retry')}</Button>
            </MessageBarActions>
          </MessageBar>
        ) : (
          <MasterDataForm
            key={JSON.stringify(data.settings)}
            settings={data.settings}
            saved={data.saved}
            canEdit={canEdit}
          />
        )}
      </SectionCard>

      {data ? (
        <AccountsCard
          chart={data.settings.chart_of_accounts as Chart}
          accountLength={data.settings.account_length}
          defaults={data.defaults}
          mappings={data.mappings}
          canEdit={canEdit}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function MasterDataForm({
  settings,
  saved,
  canEdit,
}: {
  settings: Settings;
  saved: boolean;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  const initial = {
    consultant: settings.consultant_number != null ? String(settings.consultant_number) : '',
    client: settings.client_number != null ? String(settings.client_number) : '',
    chart: settings.chart_of_accounts,
    length: String(settings.account_length),
    month: String(settings.fiscal_year_start_month),
    skonto: settings.cash_discount_booking,
  };
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const saveErrorText = useSaveErrorText();
  const dirty =
    !saved ||
    (Object.keys(initial) as (keyof typeof initial)[]).some((k) => values[k] !== initial[k]);

  const errors = {
    consultant: isValidConsultantNumber(values.consultant.trim())
      ? undefined
      : t('domain:datev.errors.consultant'),
    client: isValidClientNumber(values.client.trim()) ? undefined : t('domain:datev.errors.client'),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('company_datev_settings')
        .upsert(
          {
            company_id: companyId!,
            consultant_number: toOptionalNumber(values.consultant),
            client_number: toOptionalNumber(values.client),
            chart_of_accounts: values.chart,
            account_length: Number(values.length),
            fiscal_year_start_month: Number(values.month),
            cash_discount_booking: values.skonto,
          },
          { onConflict: 'company_id' },
        )
        .select('company_id');
      if (error) throw error;
      if (data?.length !== 1) throw new NothingWrittenError();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datev-settings', companyId] }),
  });

  const run = async () => {
    setFailed(null);
    try {
      await save.mutateAsync();
      toast.success(t('domain:settings.saved'));
    } catch (caught) {
      console.error('DATEV-Einstellungen speichern', caught);
      setFailed(saveErrorText(caught));
    }
  };

  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);
  const chartChanged = values.chart !== initial.chart;
  const lengthChanged = values.length !== initial.length;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (!hasErrors) void run();
      }}
    >
      {!saved ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>{t('domain:datev.notSaved')}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div className="grid items-start gap-4 md:grid-cols-2">
        <Field
          label={t('domain:datev.consultantNumber')}
          hint={t('domain:datev.consultantNumberHint')}
          validationMessage={shown('consultant')}
        >
          <Input
            inputMode="numeric"
            value={values.consultant}
            disabled={!canEdit}
            onChange={(_, d) => setValues({ ...values, consultant: d.value })}
            input={{ className: 'tabular-nums' }}
          />
        </Field>
        <Field
          label={t('domain:datev.clientNumber')}
          hint={t('domain:datev.clientNumberHint')}
          validationMessage={shown('client')}
        >
          <Input
            inputMode="numeric"
            value={values.client}
            disabled={!canEdit}
            onChange={(_, d) => setValues({ ...values, client: d.value })}
            input={{ className: 'tabular-nums' }}
          />
        </Field>
        <Field
          label={t('domain:datev.chart')}
          hint={chartChanged ? t('domain:datev.chartChangedHint') : undefined}
        >
          <Select
            value={values.chart}
            disabled={!canEdit}
            onChange={(_, d) => setValues({ ...values, chart: d.value })}
          >
            {CHARTS.map((chart) => (
              <option key={chart} value={chart}>
                {chart}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t('domain:datev.accountLength')}
          hint={
            lengthChanged
              ? t('domain:datev.accountLengthChangedHint')
              : t('domain:datev.accountLengthHint')
          }
        >
          <Select
            value={values.length}
            disabled={!canEdit}
            onChange={(_, d) => setValues({ ...values, length: d.value })}
          >
            {ACCOUNT_LENGTHS.map((length) => (
              <option key={length} value={String(length)}>
                {t('domain:datev.digits', { count: length })}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('domain:datev.fiscalYearStart')}>
          <Select
            value={values.month}
            disabled={!canEdit}
            onChange={(_, d) => setValues({ ...values, month: d.value })}
          >
            {MONTHS.map((month) => (
              <option key={month} value={String(month)}>
                {monthName(month)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t('domain:datev.cashDiscountBooking')}
          hint={t(`domain:datev.cashDiscountBookingHints.${values.skonto as CashDiscountBooking}`, {
            defaultValue: '',
          })}
        >
          <Select
            value={values.skonto}
            disabled={!canEdit}
            onChange={(_, d) => setValues({ ...values, skonto: d.value })}
          >
            {CASH_DISCOUNT_BOOKINGS.map((booking) => (
              <option key={booking} value={booking}>
                {t(`domain:datev.cashDiscountBookings.${booking}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {failed ? <WriteError message={failed} onRetry={() => void run()} /> : null}

      {canEdit ? (
        <div className="flex justify-end">
          <Button
            appearance="primary"
            type="submit"
            disabled={!dirty || save.isPending}
            icon={save.isPending ? <Spinner size="tiny" /> : undefined}
          >
            {t('common:action.save')}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------

type Row = AccountSlot & {
  standard: DefaultAccount | null;
  mapping: Mapping | null;
};

/**
 * Eine Zeile je Konto-Schlüssel des gespeicherten Kontenrahmens: die
 * Standardkonten plus Abweichungen, für die es keinen Standard gibt.
 */
function buildRows(chart: Chart, defaults: DefaultAccount[], mappings: Mapping[]): Row[] {
  const rows = new Map<string, Row>();
  for (const standard of defaults.filter((d) => d.chart_of_accounts === chart)) {
    rows.set(slotKey(standard), { ...pick(standard), standard, mapping: null });
  }
  for (const mapping of mappings.filter((m) => m.chart_of_accounts === chart)) {
    const key = slotKey(mapping);
    const row = rows.get(key);
    rows.set(key, row ? { ...row, mapping } : { ...pick(mapping), standard: null, mapping });
  }
  return [...rows.values()].sort(compareSlots);
}

const pick = ({ purpose, tax_mode, tax_rate }: AccountSlot): AccountSlot => ({
  purpose,
  tax_mode,
  tax_rate,
});

function AccountsCard({
  chart,
  accountLength,
  defaults,
  mappings,
  canEdit,
}: {
  chart: Chart;
  accountLength: number;
  defaults: DefaultAccount[];
  mappings: Mapping[];
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const rows = buildRows(chart, defaults, mappings);
  const standardApplies = accountLength === STANDARD_ACCOUNT_LENGTH;

  return (
    <SectionCard
      title={t('domain:datev.accountsTitle', { chart })}
      description={
        <Text className="text-muted-foreground">{t('domain:datev.accountsDescription')}</Text>
      }
    >
      {!standardApplies ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            {t('domain:datev.standardNotApplicable', { count: accountLength })}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <div role="table" aria-label={t('domain:datev.accountsTitle', { chart })}>
        <div
          role="row"
          className="text-muted-foreground hidden gap-3 border-b pb-2 text-sm font-semibold md:grid md:grid-cols-[minmax(0,1fr)_6rem_9rem_7rem_17rem]"
        >
          <span role="columnheader">{t('domain:datev.columns.purpose')}</span>
          <span role="columnheader">{t('domain:datev.columns.standard')}</span>
          <span role="columnheader">{t('domain:datev.columns.account')}</span>
          <span role="columnheader">{t('domain:datev.columns.taxKey')}</span>
          <span role="columnheader" className="sr-only">
            {t('domain:datev.columns.actions')}
          </span>
        </div>
        {rows.map((row) => (
          <AccountRow
            key={`${chart}|${slotKey(row)}|${row.mapping?.id ?? ''}|${row.mapping?.account ?? ''}|${row.mapping?.tax_key ?? ''}`}
            chart={chart}
            row={row}
            accountLength={accountLength}
            standardApplies={standardApplies}
            canEdit={canEdit}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function useSlotLabel() {
  const { t } = useTranslation();
  return (slot: AccountSlot) => {
    const purpose = t(`domain:datev.purposes.${slot.purpose}`, { defaultValue: slot.purpose });
    const detail =
      slot.tax_mode === 'standard' && slot.tax_rate != null
        ? t('domain:datev.rate', { rate: slot.tax_rate })
        : slot.tax_mode
          ? t(`domain:datev.taxModes.${slot.tax_mode}`, { defaultValue: slot.tax_mode })
          : '';
    return detail ? `${purpose} · ${detail}` : purpose;
  };
}

function useAccountErrorText() {
  const { t } = useTranslation();
  return (error: AccountError) =>
    error.kind === 'digits'
      ? t('domain:datev.errors.digits', { count: error.count })
      : t(`domain:datev.errors.${error.kind}`, { from: error.from, to: error.to });
}

function AccountRow({
  chart,
  row,
  accountLength,
  standardApplies,
  canEdit,
}: {
  chart: Chart;
  row: Row;
  accountLength: number;
  standardApplies: boolean;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const label = useSlotLabel()(row);
  const errorText = useAccountErrorText();

  const initialAccount = row.mapping?.account ?? '';
  const initialTaxKey = row.mapping?.tax_key ?? '';
  const [account, setAccount] = useState(initialAccount);
  const [taxKey, setTaxKey] = useState(initialTaxKey);
  const [failed, setFailed] = useState<{ message: string; retry: () => void } | null>(null);
  const saveErrorText = useSaveErrorText();

  const trimmed = account.trim();
  const accountErr = trimmed ? accountError(row.purpose, trimmed, accountLength) : null;
  const taxKeyErr = isValidTaxKey(taxKey.trim()) ? undefined : t('domain:datev.errors.taxKey');
  const dirty = trimmed !== initialAccount || taxKey.trim() !== initialTaxKey;
  const canSave = dirty && trimmed !== '' && !accountErr && !taxKeyErr;
  const standard = standardApplies ? row.standard : null;
  const missing = !row.mapping && !standard;

  const write = useMutation({
    mutationFn: async (action: 'save' | 'reset') => {
      const mapping = row.mapping;
      const result =
        action === 'reset' && mapping
          ? await supabase.from('datev_account_mappings').delete().eq('id', mapping.id).select('id')
          : mapping
            ? await supabase
                .from('datev_account_mappings')
                .update({ account: trimmed, tax_key: taxKey.trim() })
                .eq('id', mapping.id)
                .select('id')
            : await supabase
                .from('datev_account_mappings')
                .insert({
                  company_id: companyId!,
                  chart_of_accounts: chart,
                  purpose: row.purpose,
                  tax_mode: row.tax_mode,
                  tax_rate: row.tax_rate,
                  account: trimmed,
                  tax_key: taxKey.trim(),
                })
                .select('id');
      if (result.error) throw result.error;
      if (result.data?.length !== 1) throw new NothingWrittenError();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datev-settings', companyId] }),
  });

  const run = async (action: 'save' | 'reset') => {
    setFailed(null);
    try {
      await write.mutateAsync(action);
      toast.success(
        action === 'reset' ? t('domain:datev.resetDone', { label }) : t('domain:settings.saved'),
      );
    } catch (caught) {
      console.error('DATEV-Konto speichern', caught);
      setFailed({
        message: saveErrorText(caught),
        retry: () => void run(action),
      });
    }
  };

  return (
    <div role="row" className="border-b py-3 last:border-b-0">
      <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_6rem_9rem_7rem_17rem]">
        <div role="cell" className="flex flex-wrap items-center gap-2 md:pt-1.5">
          <Text weight="semibold">{label}</Text>
          {row.mapping ? <StatusBadge tone="brand">{t('domain:datev.own')}</StatusBadge> : null}
          {missing ? <StatusBadge tone="warning">{t('domain:datev.missing')}</StatusBadge> : null}
        </div>
        <div role="cell" className="tabular-nums md:pt-1.5">
          <span className="text-muted-foreground mr-2 text-sm md:hidden">
            {t('domain:datev.columns.standard')}
          </span>
          {standard ? (
            <>
              {standard.account}
              {standard.tax_key ? (
                <span className="text-muted-foreground"> / {standard.tax_key}</span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">–</span>
          )}
        </div>
        <Field
          role="cell"
          aria-label={t('domain:datev.columns.account')}
          validationMessage={accountErr ? errorText(accountErr) : undefined}
        >
          <Input
            aria-label={`${t('domain:datev.columns.account')}: ${label}`}
            inputMode="numeric"
            value={account}
            placeholder={standard?.account ?? ''}
            disabled={!canEdit}
            onChange={(_, d) => setAccount(d.value)}
            input={{ className: 'tabular-nums' }}
          />
        </Field>
        <Field role="cell" validationMessage={taxKeyErr}>
          <Input
            aria-label={`${t('domain:datev.columns.taxKey')}: ${label}`}
            inputMode="numeric"
            value={taxKey}
            placeholder={standard?.tax_key || ''}
            disabled={!canEdit}
            onChange={(_, d) => setTaxKey(d.value)}
            input={{ className: 'tabular-nums' }}
          />
        </Field>
        <div role="cell" className="flex gap-2 whitespace-nowrap md:justify-end">
          {canEdit ? (
            <>
              <Button
                disabled={!canSave || write.isPending}
                icon={write.isPending ? <Spinner size="tiny" /> : undefined}
                onClick={() => void run('save')}
              >
                {t('common:action.save')}
              </Button>
              {row.mapping ? (
                <Button
                  appearance="subtle"
                  disabled={write.isPending}
                  onClick={() => void run('reset')}
                >
                  {row.standard ? t('domain:datev.reset') : t('common:action.delete')}
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      {failed ? (
        <div className="mt-2">
          <WriteError message={failed.message} onRetry={failed.retry} />
        </div>
      ) : null}
    </div>
  );
}
