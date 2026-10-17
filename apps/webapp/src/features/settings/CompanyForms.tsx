import type { TablesUpdate } from '@bautakt/supabase';
import { toast } from '@bautakt/ui';
import {
  Button,
  Combobox,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Spinner,
  Switch,
} from '@fluentui/react-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import {
  COMPANY_COUNTRIES,
  COMPANY_TYPES,
  type CompanyCountry,
  formatIbanInput,
  isValidBic,
  isValidCompanyIban,
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
  isValidTaxNumber,
  isValidTradeRegister,
  isValidVatId,
  normalizeIban,
  PLACEHOLDERS,
  toCompanyCountry,
} from './companyValidation';

/** Die Spalten von `companies`, die diese Seite liest und schreibt. */
export type CompanyMasterData = {
  name: string | null;
  type: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone_number: string | null;
  tax_number: string | null;
  vat_id: string | null;
  trade_register: string | null;
  is_small_business: boolean | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
};

type Patch = Pick<TablesUpdate<'companies'>, keyof CompanyMasterData>;

/**
 * Stammdaten speichern. Schreiben dürfen laut RLS Inhaber und wer
 * `canEditCompanyMasterData` oder `canManageCompanySettings` hat; die Seite
 * blendet die Knöpfe nur aus.
 *
 * Den Verkäufer liest der Renderer beim Erzeugen des PDFs. Freigegebene
 * Belege ändern sich dadurch nicht: Ihr Original-PDF liegt schon im Archiv.
 */
function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (patch: Patch) => {
      const { error } = await supabase.from('companies').update(patch).eq('id', companyId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      // Steuer-IDs und Kleinunternehmer lesen Editor und Belegseite getrennt.
      await Promise.all(
        ['company-settings', 'company-tax-ids', 'company-tax-profile'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key, companyId] }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ['membership'] });
    },
  });
}

const text = (value: string | null | undefined) => value ?? '';

/**
 * Ein Formular je Karte: Fehler am Feld, sobald es angefasst oder gespeichert
 * wurde; „Speichern“ erst, wenn sich etwas geändert hat.
 */
function useCardForm<T extends Record<string, string | boolean>>(
  initial: T,
  errorsOf: (values: T) => Partial<Record<keyof T, string>>,
) {
  const [values, setValues] = useState<T | null>(null);
  const [touched, setTouched] = useState<Set<keyof T>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const current = values ?? initial;
  const errors = errorsOf(current);
  const dirty = (Object.keys(initial) as (keyof T)[]).some((key) => current[key] !== initial[key]);

  return {
    values: current,
    dirty,
    hasErrors: Object.values(errors).some(Boolean),
    errorFor: (key: keyof T) => (submitted || touched.has(key) ? errors[key] : undefined),
    set: (patch: Partial<T>) => {
      setValues({ ...current, ...patch });
      setTouched((prev) => new Set([...prev, ...(Object.keys(patch) as (keyof T)[])]));
    },
    submit: () => setSubmitted(true),
    reset: () => {
      setValues(null);
      setTouched(new Set());
      setSubmitted(false);
    },
  };
}

function FormCard({
  title,
  description,
  canEdit,
  dirty,
  saving,
  onSave,
  children,
}: {
  title: string;
  description?: ReactNode;
  canEdit: boolean;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <SectionCard title={title} description={description}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        {children}
        {canEdit ? (
          <div className="flex justify-end">
            <Button
              appearance="primary"
              type="submit"
              disabled={!dirty || saving}
              icon={saving ? <Spinner size="tiny" /> : undefined}
            >
              {t('common:action.save')}
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}

function useSave(update: ReturnType<typeof useUpdateCompany>, onDone: () => void) {
  const { t } = useTranslation();
  return async (patch: Patch) => {
    try {
      await update.mutateAsync(patch);
      toast.success(t('domain:settings.saved'));
      onDone();
    } catch (caught) {
      toast.error(t('domain:settings.saveError'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  };
}

// ---------------------------------------------------------------------------

export function CompanyCard({
  company,
  canEdit,
}: {
  company: CompanyMasterData;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const update = useUpdateCompany();
  const form = useCardForm(
    {
      name: text(company.name),
      type: text(company.type),
      street_address: text(company.street_address),
      postal_code: text(company.postal_code),
      city: text(company.city),
      country: toCompanyCountry(company.country) as string,
      phone_number: text(company.phone_number),
      email: text(company.email),
    },
    (v) => ({
      name: v.name.trim().length < 2 ? t('domain:settings.errors.name') : undefined,
      type: v.type.trim().length < 2 ? t('domain:settings.errors.type') : undefined,
      street_address:
        v.street_address.trim().length < 5 ? t('domain:settings.errors.street') : undefined,
      postal_code: !isValidPostalCode(v.postal_code, v.country as CompanyCountry)
        ? t('domain:settings.errors.postalCode', { count: v.country === 'DE' ? 5 : 4 })
        : undefined,
      city: v.city.trim().length < 2 ? t('domain:settings.errors.city') : undefined,
      phone_number: !isValidPhone(v.phone_number) ? t('domain:settings.errors.phone') : undefined,
      email: !isValidEmail(v.email) ? t('domain:settings.errors.email') : undefined,
    }),
  );
  const save = useSave(update, form.reset);
  const v = form.values;

  return (
    <FormCard
      title={t('domain:settings.company')}
      canEdit={canEdit}
      dirty={form.dirty}
      saving={update.isPending}
      onSave={() => {
        form.submit();
        if (form.hasErrors) return;
        void save({
          name: v.name.trim(),
          type: v.type.trim(),
          street_address: v.street_address.trim(),
          postal_code: v.postal_code.trim(),
          city: v.city.trim(),
          country: v.country,
          phone_number: v.phone_number.trim(),
          email: v.email.trim(),
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('domain:settings.name')} required validationMessage={form.errorFor('name')}>
          <Input
            value={v.name}
            disabled={!canEdit}
            onChange={(_, d) => form.set({ name: d.value })}
          />
        </Field>
        <Field
          label={t('domain:settings.companyType')}
          required
          validationMessage={form.errorFor('type')}
        >
          <Combobox
            freeform
            disabled={!canEdit}
            value={v.type}
            selectedOptions={v.type ? [v.type] : []}
            onChange={(event) => form.set({ type: event.target.value })}
            onOptionSelect={(_, d) => form.set({ type: d.optionText ?? '' })}
          >
            {COMPANY_TYPES.map((type) => (
              <Option key={type}>{type}</Option>
            ))}
          </Combobox>
        </Field>
        <Field
          label={t('domain:settings.street')}
          required
          validationMessage={form.errorFor('street_address')}
          className="md:col-span-2"
        >
          <Input
            value={v.street_address}
            disabled={!canEdit}
            onChange={(_, d) => form.set({ street_address: d.value })}
          />
        </Field>
        <Field
          label={t('domain:settings.postalCode')}
          required
          validationMessage={form.errorFor('postal_code')}
        >
          <Input
            value={v.postal_code}
            inputMode="numeric"
            disabled={!canEdit}
            onChange={(_, d) => form.set({ postal_code: d.value.replace(/\D/g, '') })}
          />
        </Field>
        <Field label={t('domain:settings.city')} required validationMessage={form.errorFor('city')}>
          <Input
            value={v.city}
            disabled={!canEdit}
            onChange={(_, d) => form.set({ city: d.value })}
          />
        </Field>
        <Field label={t('domain:settings.country')} required>
          <Select
            value={v.country}
            disabled={!canEdit}
            onChange={(_, d) => form.set({ country: d.value })}
          >
            {COMPANY_COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {t(`domain:settings.countries.${country}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t('domain:settings.phone')}
          required
          validationMessage={form.errorFor('phone_number')}
        >
          <Input
            type="tel"
            value={v.phone_number}
            disabled={!canEdit}
            onChange={(_, d) => form.set({ phone_number: d.value.replace(/[^\d\s\-+()]/g, '') })}
          />
        </Field>
        <Field
          label={t('domain:settings.email')}
          required
          validationMessage={form.errorFor('email')}
          className="md:col-span-2"
        >
          <Input
            type="email"
            value={v.email}
            disabled={!canEdit}
            onChange={(_, d) => form.set({ email: d.value })}
          />
        </Field>
      </div>
    </FormCard>
  );
}

// ---------------------------------------------------------------------------

export function LegalCard({ company, canEdit }: { company: CompanyMasterData; canEdit: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateCompany();
  const country = toCompanyCountry(company.country);
  const form = useCardForm(
    {
      tax_number: text(company.tax_number),
      vat_id: text(company.vat_id),
      trade_register: text(company.trade_register),
      is_small_business: Boolean(company.is_small_business),
    },
    (v) => ({
      tax_number: !isValidTaxNumber(v.tax_number, country)
        ? t(`domain:settings.errors.taxNumber.${country}`)
        : undefined,
      vat_id:
        v.vat_id.trim() && !isValidVatId(v.vat_id, country)
          ? t(`domain:settings.errors.vatId.${country}`)
          : undefined,
      trade_register: !isValidTradeRegister(v.trade_register, country)
        ? t(`domain:settings.errors.tradeRegister.${country}`)
        : undefined,
    }),
  );
  const save = useSave(update, form.reset);
  const v = form.values;
  // Gespeicherter Stand, nicht das Formular: der Hinweis sagt, was beim
  // Freigeben fehlt (`MISSING_SELLER_TAX_ID`).
  const missingTaxId = !company.tax_number?.trim() && !company.vat_id?.trim();

  return (
    <FormCard
      title={t('domain:settings.tax')}
      canEdit={canEdit}
      dirty={form.dirty}
      saving={update.isPending}
      onSave={() => {
        form.submit();
        if (form.hasErrors) return;
        void save({
          tax_number: v.tax_number.trim(),
          vat_id: v.vat_id.trim().toUpperCase(),
          trade_register: v.trade_register.trim(),
          is_small_business: v.is_small_business,
        });
      }}
    >
      {missingTaxId ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>{t('domain:settings.missingTaxId')}</MessageBarBody>
        </MessageBar>
      ) : null}
      <Field
        label={t('domain:invoices.taxNumber')}
        required
        validationMessage={form.errorFor('tax_number')}
      >
        <Input
          value={v.tax_number}
          placeholder={PLACEHOLDERS[country].taxNumber}
          disabled={!canEdit}
          onChange={(_, d) => form.set({ tax_number: d.value })}
        />
      </Field>
      <Field label={t('domain:invoices.vatId')} validationMessage={form.errorFor('vat_id')}>
        <Input
          value={v.vat_id}
          placeholder={PLACEHOLDERS[country].vatId}
          disabled={!canEdit}
          onChange={(_, d) =>
            form.set({ vat_id: d.value.toUpperCase().replace(/[^A-Z0-9.\-\s]/g, '') })
          }
        />
      </Field>
      <Field
        label={t('domain:settings.tradeRegister')}
        validationMessage={form.errorFor('trade_register')}
      >
        <Input
          value={v.trade_register}
          placeholder={PLACEHOLDERS[country].tradeRegister}
          disabled={!canEdit}
          onChange={(_, d) => form.set({ trade_register: d.value })}
        />
      </Field>
      <Field hint={t('domain:settings.smallBusinessHint')}>
        <Switch
          checked={v.is_small_business}
          disabled={!canEdit}
          label={t('domain:settings.smallBusinessLabel')}
          onChange={(_, d) => form.set({ is_small_business: d.checked })}
        />
      </Field>
    </FormCard>
  );
}

// ---------------------------------------------------------------------------

export function BankCard({ company, canEdit }: { company: CompanyMasterData; canEdit: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateCompany();
  const country = toCompanyCountry(company.country);
  const [lookingUp, setLookingUp] = useState(false);
  const form = useCardForm(
    {
      iban: formatIbanInput(text(company.iban)),
      bic: text(company.bic),
      bank_name: text(company.bank_name),
    },
    (v) => ({
      iban: !isValidCompanyIban(v.iban, country)
        ? t(`domain:settings.errors.iban.${country}`)
        : undefined,
      bic: !isValidBic(v.bic, country) ? t('domain:settings.errors.bic') : undefined,
      bank_name: v.bank_name.trim().length < 2 ? t('domain:settings.errors.bankName') : undefined,
    }),
  );
  const save = useSave(update, form.reset);
  const v = form.values;

  /** BIC und Bank aus der IBAN (Edge Function `lookup-iban`), wie in der App. */
  async function lookup(iban: string) {
    if (!isValidCompanyIban(iban, country)) return;
    setLookingUp(true);
    try {
      const { data } = await supabase.functions.invoke<{ bic?: string; bankName?: string }>(
        'lookup-iban',
        { body: { iban: normalizeIban(iban) } },
      );
      const bic = data?.bic?.trim().toUpperCase() ?? '';
      const bankName = data?.bankName?.trim() ?? '';
      if (bic || bankName) {
        form.set({
          iban,
          bic: bic && isValidBic(bic, country) ? bic : v.bic,
          bank_name: bankName || v.bank_name,
        });
      }
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <FormCard
      title={t('domain:settings.bankTitle')}
      canEdit={canEdit}
      dirty={form.dirty}
      saving={update.isPending}
      onSave={() => {
        form.submit();
        if (form.hasErrors) return;
        void save({
          iban: normalizeIban(v.iban),
          bic: v.bic.trim().toUpperCase(),
          bank_name: v.bank_name.trim(),
        });
      }}
    >
      <Field label="IBAN" required validationMessage={form.errorFor('iban')}>
        <Input
          value={v.iban}
          placeholder={PLACEHOLDERS[country].iban}
          disabled={!canEdit}
          input={{ className: 'tabular-nums', autoComplete: 'off' }}
          onChange={(_, d) => {
            const iban = formatIbanInput(d.value);
            const changed = normalizeIban(iban) !== normalizeIban(v.iban);
            form.set({ iban });
            // Bank automatisch ergänzen, sobald die IBAN vollständig und gültig ist.
            if (changed) void lookup(iban);
          }}
          contentAfter={lookingUp ? <Spinner size="extra-tiny" /> : undefined}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="BIC" validationMessage={form.errorFor('bic')}>
          <Input
            value={v.bic}
            disabled={!canEdit}
            onChange={(_, d) => form.set({ bic: d.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
          />
        </Field>
        <Field
          label={t('domain:settings.bank')}
          required
          validationMessage={form.errorFor('bank_name')}
        >
          <Input
            value={v.bank_name}
            disabled={!canEdit}
            onChange={(_, d) => form.set({ bank_name: d.value })}
          />
        </Field>
      </div>
    </FormCard>
  );
}
