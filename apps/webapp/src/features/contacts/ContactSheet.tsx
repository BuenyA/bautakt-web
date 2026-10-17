import {
  FormDrawer,
  FormDrawerDescription,
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
  type InputProps,
  Label,
  Radio,
  RadioGroup,
  Select,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';
import { type FormEvent, type ReactNode, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker } from '@/components/form/dateTime';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { useCostCategories } from '@/features/finance/useCostCategories';
import { BUYER_REFERENCE_MAX_LENGTH } from '@/features/finance/useDocumentEditor';
import { isPlausibleVatId } from '@/features/settings/companyValidation';
import { readableDbError } from '@/lib/dbErrors';

import {
  type ContactDraft,
  hasOptionalValues,
  ibanPlacement,
  parseOptionalDecimal,
  parseOptionalInt,
  withoutRole,
  withRole,
} from './contactDraft';
import {
  CONTACT_COUNTRIES,
  CONTACT_ROLES,
  type ContactRole,
  isValidIban,
  OTHER_FUNCTIONS,
} from './contactModel';
import { canViewBankAccounts, useContactBankAccounts } from './useContact';
import { useSaveContact } from './useContactMutations';

/**
 * Kontakt anlegen oder bearbeiten.
 *
 * Ein Formular für alle Rollen. Offen stehen nur Name, Rollen, Anschrift,
 * Telefon und E-Mail (beim Subunternehmer Gewerk und §13b, beim Sonstigen die
 * Funktion). Alles Weitere — Ansprechpartner, Steuer, Nummern,
 * Zahlungsbedingungen, Rechnungsadresse, Notizen — liegt zugeklappt unter
 * „Weitere Angaben“: die meisten Kontakte brauchen es nie.
 */
export function ContactSheet({
  draft,
  open,
  onOpenChange,
  onSaved,
}: {
  draft: ContactDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nach dem Speichern, mit der Id des Kontakts (z. B. für Auswahlfelder). */
  onSaved?: (contactId: string) => void;
}) {
  return (
    <FormDrawer open={open} onOpenChange={onOpenChange} size="medium">
      {open && draft ? (
        <ContactForm
          initial={draft}
          onDone={(id) => {
            onOpenChange(false);
            if (id) onSaved?.(id);
          }}
        />
      ) : null}
    </FormDrawer>
  );
}

function ContactForm({
  initial,
  onDone,
}: {
  initial: ContactDraft;
  onDone: (savedId?: string) => void;
}) {
  const { t } = useTranslation();
  const save = useSaveContact();
  const canCustomers = usePermission('canManageCustomers');
  const canSuppliers = usePermission('canManageSuppliers');
  const canViewFinance = usePermission('canViewCompanyFinance');
  const canOverhead = usePermission('canManageOverheadCosts');
  const canFinance = canViewFinance || canOverhead;
  const canBilling = usePermission('canUseBillingModule');
  const { data: membership } = useMembership();
  const bankAccounts = useContactBankAccounts(initial.id);
  const costCategories = useCostCategories();
  const [draft, setDraft] = useState<ContactDraft>(initial);
  const [iban, setIban] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Offen stehen nur Name, Rolle, Anschrift und Telefon/E-Mail; der Rest ist
  // für die meisten Kontakte überflüssig. Schon gefüllt → gleich offen.
  const [showMore, setShowMore] = useState(() => hasOptionalValues(initial));
  const id = useId();
  const f = (name: string) => `${id}-${name}`;

  const isCompany = draft.kind === 'company';
  const has = (role: ContactRole) => draft.roles.includes(role);

  function set(patch: Partial<ContactDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function setCustomer(patch: Partial<ContactDraft['customer']>) {
    setDraft((current) => ({ ...current, customer: { ...current.customer, ...patch } }));
  }
  function setSupplier(patch: Partial<ContactDraft['supplier']>) {
    setDraft((current) => ({ ...current, supplier: { ...current.supplier, ...patch } }));
  }

  // IBAN nur fürs erste Konto: Gibt es schon eines, pflegt man die Konten auf
  // der Detailseite (mehrere Konten, Standardkonto, Betrugswarnung).
  const placement = ibanPlacement(draft.roles);
  const mayEditBank =
    placement === 'visible' ? canSuppliers && canFinance : canCustomers && canBilling;
  const noAccountYet =
    !initial.id ||
    (canViewBankAccounts(membership?.permissions) &&
      bankAccounts.isSuccess &&
      bankAccounts.data.length === 0);
  const ibanField =
    placement && mayEditBank && noAccountYet ? (
      <div className="grid gap-2 sm:max-w-sm">
        <TextField
          id={f('iban')}
          label={t('domain:bankAccounts.iban')}
          placeholder="DE00 0000 0000 0000 0000 00"
          value={iban}
          onChange={setIban}
        />
        <Text size={200} className="text-muted-foreground">
          {t('domain:contactForm.ibanHint')}
        </Text>
      </div>
    ) : null;

  function mayEditRole(role: ContactRole): boolean {
    if (role === 'customer') return canCustomers;
    if (role === 'supplier' || role === 'subcontractor') return canSuppliers;
    return canCustomers || canSuppliers;
  }

  function toggleRole(role: ContactRole, checked: boolean) {
    set({ roles: checked ? withRole(draft.roles, role) : withoutRole(draft.roles, role) });
  }

  function validate(): string | null {
    const name = isCompany
      ? draft.company_name.trim()
      : `${draft.first_name}${draft.last_name}`.trim();
    if (!name) return t('domain:contactForm.nameRequired');
    if (draft.roles.length === 0) return t('domain:contactForm.roleRequired');

    const numbers = [
      has('customer') && draft.customer.payment_term_days,
      has('customer') && draft.customer.discount_days,
      has('supplier') && draft.supplier.payment_term_days,
      has('supplier') && draft.supplier.discount_days,
    ].filter((v): v is string => typeof v === 'string');
    if (numbers.some((v) => Number.isNaN(parseOptionalInt(v)))) {
      return t('domain:contactForm.daysInvalid');
    }
    const percents = [
      has('customer') && draft.customer.discount_percent,
      has('supplier') && draft.supplier.discount_percent,
    ].filter((v): v is string => typeof v === 'string');
    if (
      percents.some((v) => {
        const n = parseOptionalDecimal(v);
        return Number.isNaN(n) || (n !== null && n > 100);
      })
    ) {
      return t('domain:contactForm.percentInvalid');
    }
    if (ibanField && iban.trim() && !isValidIban(iban)) {
      return t('domain:bankAccounts.ibanInvalid');
    }
    if (draft.vat_id.trim() && !isPlausibleVatId(draft.vat_id)) {
      return t('domain:contactForm.vatIdInvalid');
    }
    // Dieselbe Grenze wie im Rechnungseditor, sonst sperrt die Leitweg-ID
    // erst beim Beleg.
    if (
      has('customer') &&
      draft.customer.buyer_reference.trim().length > BUYER_REFERENCE_MAX_LENGTH
    ) {
      return t('domain:contactForm.buyerReferenceTooLong', { max: BUYER_REFERENCE_MAX_LENGTH });
    }
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      // Tage, Skonto und die Kunden-IBAN stehen im zugeklappten Bereich:
      // Fehler sichtbar machen.
      setShowMore(true);
      return;
    }
    setError(null);
    try {
      const savedId = await save.mutateAsync({
        initial,
        draft,
        iban: ibanField ? iban : '',
      });
      toast.success(t('domain:contactForm.saved'));
      onDone(savedId);
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:contactForm.saveError'));
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {draft.id ? t('domain:contactForm.editTitle') : t('domain:contactForm.newTitle')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:contactForm.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-6">
        {/* --- Wer ------------------------------------------------------- */}
        <Section title={t('domain:contactForm.sectionWho')}>
          <RadioGroup
            layout="horizontal"
            aria-label={t('domain:contactForm.kind')}
            value={draft.kind}
            onChange={(_, { value }) => set({ kind: value === 'person' ? 'person' : 'company' })}
          >
            <Radio value="company" label={t('domain:contactKind.company')} />
            <Radio value="person" label={t('domain:contactKind.person')} />
          </RadioGroup>

          {isCompany ? (
            <TextField
              id={f('company')}
              label={t('domain:contactForm.companyName')}
              value={draft.company_name}
              onChange={(value) => set({ company_name: value })}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id={f('first')}
                label={t('domain:contactForm.firstName')}
                value={draft.first_name}
                onChange={(value) => set({ first_name: value })}
              />
              <TextField
                id={f('last')}
                label={t('domain:contactForm.lastName')}
                value={draft.last_name}
                onChange={(value) => set({ last_name: value })}
              />
            </div>
          )}
        </Section>

        {/* --- Rollen ---------------------------------------------------- */}
        <Section
          title={t('domain:contactForm.sectionRoles')}
          hint={t('domain:contactForm.rolesHint')}
        >
          <div className="grid gap-1 sm:grid-cols-2">
            {CONTACT_ROLES.map((role) => {
              const existing = draft.existingRoles.includes(role);
              return (
                <Checkbox
                  key={role}
                  checked={has(role)}
                  // Eine vorhandene Rolle entfernt die Detailseite (Archivieren),
                  // nicht das Formular: an ihr können Belege hängen.
                  disabled={existing || !mayEditRole(role)}
                  onChange={(_, { checked }) => toggleRole(role, checked === true)}
                  label={t(`domain:contactRoles.${role}`)}
                />
              );
            })}
          </div>
        </Section>

        {/* --- Anschrift und Erreichbarkeit ------------------------------ */}
        <Section title={t('domain:contactForm.sectionAddress')}>
          <TextField
            id={f('street')}
            label={t('domain:contactForm.street')}
            value={draft.street_address}
            onChange={(value) => set({ street_address: value })}
          />
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <TextField
              id={f('zip')}
              label={t('domain:contactForm.postalCode')}
              value={draft.postal_code}
              onChange={(value) => set({ postal_code: value })}
            />
            <TextField
              id={f('city')}
              label={t('domain:contactForm.city')}
              value={draft.city}
              onChange={(value) => set({ city: value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id={f('phone')}
              type="tel"
              label={t('domain:contactForm.phone')}
              value={draft.phone}
              onChange={(value) => set({ phone: value })}
            />
            <TextField
              id={f('email')}
              type="email"
              label={t('domain:contactForm.email')}
              value={draft.email}
              onChange={(value) => set({ email: value })}
            />
          </div>
        </Section>

        {/* --- Bankverbindung: Lieferanten und Subunternehmer bezahlt man -- */}
        {placement === 'visible' && ibanField ? (
          <Section title={t('domain:bankAccounts.title')}>{ibanField}</Section>
        ) : null}

        {/* --- Subunternehmer: Gewerk und §13b bestimmen jede Rechnung ---- */}
        {has('subcontractor') ? (
          <Section title={t('domain:contactRoles.subcontractor')}>
            <TextField
              id={f('trade')}
              label={t('domain:contactForm.trade')}
              value={draft.subcontractor.trade}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  subcontractor: { ...current.subcontractor, trade: value },
                }))
              }
              disabled={!canSuppliers}
            />
            <Checkbox
              checked={draft.subcontractor.reverse_charge_13b}
              disabled={!canSuppliers}
              onChange={(_, { checked }) =>
                setDraft((current) => ({
                  ...current,
                  subcontractor: {
                    ...current.subcontractor,
                    reverse_charge_13b: checked === true,
                  },
                }))
              }
              label={t('domain:contactForm.reverseCharge13b')}
            />
            <Text size={200} className="text-muted-foreground">
              {t('domain:contactForm.exemptionHint')}
            </Text>
          </Section>
        ) : null}

        {/* --- Sonstiger Kontakt ----------------------------------------- */}
        {has('other') ? (
          <Section title={t('domain:contactRoles.other')}>
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor={f('function')}>{t('domain:contactForm.function')}</Label>
              <Select
                id={f('function')}
                value={draft.other.function}
                onChange={(_, { value }) =>
                  set({ other: { function: value as ContactDraft['other']['function'] } })
                }
              >
                {OTHER_FUNCTIONS.map((fn) => (
                  <option key={fn} value={fn}>
                    {t(`domain:otherFunction.${fn}`)}
                  </option>
                ))}
              </Select>
            </div>
          </Section>
        ) : null}

        {/* --- Weitere Angaben (zugeklappt) ------------------------------- */}
        <div className="border-border flex flex-col gap-6 border-t pt-4">
          <Button
            type="button"
            appearance="subtle"
            className="self-start"
            icon={showMore ? <ChevronUpRegular /> : <ChevronDownRegular />}
            iconPosition="after"
            aria-expanded={showMore}
            aria-controls={f('more')}
            onClick={() => setShowMore((open) => !open)}
          >
            {t('domain:contactForm.moreDetails')}
          </Button>

          {showMore ? (
            <div id={f('more')} className="flex flex-col gap-6">
              <Section title={t('domain:contactForm.sectionMoreContact')}>
                {isCompany ? (
                  <div className="grid gap-4 sm:grid-cols-[7rem_1fr_1fr]">
                    <TextField
                      id={f('salutation')}
                      label={t('domain:contactForm.salutation')}
                      value={draft.salutation}
                      onChange={(value) => set({ salutation: value })}
                    />
                    <TextField
                      id={f('first')}
                      label={t('domain:contactForm.contactFirstName')}
                      value={draft.first_name}
                      onChange={(value) => set({ first_name: value })}
                    />
                    <TextField
                      id={f('last')}
                      label={t('domain:contactForm.contactLastName')}
                      value={draft.last_name}
                      onChange={(value) => set({ last_name: value })}
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:max-w-xs">
                    <TextField
                      id={f('salutation')}
                      label={t('domain:contactForm.salutation')}
                      value={draft.salutation}
                      onChange={(value) => set({ salutation: value })}
                    />
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id={f('mobile')}
                    type="tel"
                    label={t('domain:contactForm.mobile')}
                    value={draft.mobile}
                    onChange={(value) => set({ mobile: value })}
                  />
                  <TextField
                    id={f('website')}
                    type="url"
                    label={t('domain:contactForm.website')}
                    value={draft.website}
                    onChange={(value) => set({ website: value })}
                  />
                </div>
                <div className="sm:max-w-xs">
                  <CountrySelect
                    id={f('country')}
                    label={t('domain:contactForm.country')}
                    value={draft.country}
                    onChange={(value) => set({ country: value })}
                  />
                </div>
              </Section>

              <Section title={t('domain:contactForm.sectionTax')}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id={f('vat')}
                    label={t('domain:contactForm.vatId')}
                    value={draft.vat_id}
                    onChange={(value) => set({ vat_id: value })}
                  />
                  <TextField
                    id={f('taxnr')}
                    label={t('domain:contactForm.taxNumber')}
                    value={draft.tax_number}
                    onChange={(value) => set({ tax_number: value })}
                  />
                </div>
              </Section>

              {has('customer') ? (
                <Section title={t('domain:contactRoles.customer')}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id={f('custnr')}
                      label={t('domain:contactForm.customerNumber')}
                      placeholder={t('domain:contactForm.numberAuto')}
                      value={draft.customer.customer_number}
                      onChange={(value) => setCustomer({ customer_number: value })}
                      disabled={!canCustomers}
                    />
                    <TextField
                      id={f('leitweg')}
                      label={t('domain:contactForm.buyerReference')}
                      value={draft.customer.buyer_reference}
                      onChange={(value) => setCustomer({ buyer_reference: value })}
                      disabled={!canCustomers}
                    />
                  </div>
                  <PaymentTerms
                    idPrefix={f('cust')}
                    value={draft.customer}
                    onChange={(patch) => setCustomer(patch)}
                    disabled={!canCustomers}
                  />
                  <Checkbox
                    checked={draft.customer.is_construction_business}
                    disabled={!canCustomers}
                    onChange={(_, { checked }) =>
                      setCustomer({ is_construction_business: checked === true })
                    }
                    label={t('domain:contactForm.constructionBusiness')}
                  />
                  {draft.customer.is_construction_business ? (
                    <div className="grid gap-2 sm:max-w-xs">
                      <Label htmlFor={f('exemptuntil')}>
                        {t('domain:contactForm.taxExemptionValidUntil')}
                      </Label>
                      <DatePicker
                        id={f('exemptuntil')}
                        aria-label={t('domain:contactForm.taxExemptionValidUntil')}
                        value={draft.customer.tax_exemption_valid_until}
                        onChange={(value) => setCustomer({ tax_exemption_valid_until: value })}
                        disabled={!canCustomers}
                      />
                    </div>
                  ) : null}

                  {placement === 'optional' ? ibanField : null}

                  <Text weight="semibold" size={200}>
                    {t('domain:contactForm.billingAddress')}
                  </Text>
                  <TextField
                    id={f('bstreet')}
                    label={t('domain:contactForm.street')}
                    placeholder={t('domain:contactForm.billingSameAsMain')}
                    value={draft.customer.billing_street}
                    onChange={(value) => setCustomer({ billing_street: value })}
                    disabled={!canCustomers}
                  />
                  {draft.customer.billing_street.trim() ? (
                    <div className="grid gap-4 sm:grid-cols-[8rem_1fr_8rem]">
                      <TextField
                        id={f('bzip')}
                        label={t('domain:contactForm.postalCode')}
                        value={draft.customer.billing_postal_code}
                        onChange={(value) => setCustomer({ billing_postal_code: value })}
                        disabled={!canCustomers}
                      />
                      <TextField
                        id={f('bcity')}
                        label={t('domain:contactForm.city')}
                        value={draft.customer.billing_city}
                        onChange={(value) => setCustomer({ billing_city: value })}
                        disabled={!canCustomers}
                      />
                      <CountrySelect
                        id={f('bcountry')}
                        label={t('domain:contactForm.country')}
                        value={draft.customer.billing_country || draft.country}
                        onChange={(value) => setCustomer({ billing_country: value })}
                        disabled={!canCustomers}
                      />
                    </div>
                  ) : null}
                </Section>
              ) : null}

              {has('supplier') ? (
                <Section
                  title={
                    has('subcontractor')
                      ? t('domain:contactRoles.subcontractor')
                      : t('domain:contactRoles.supplier')
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id={f('supnr')}
                      label={t('domain:contactForm.supplierNumber')}
                      placeholder={t('domain:contactForm.numberAuto')}
                      value={draft.supplier.supplier_number}
                      onChange={(value) => setSupplier({ supplier_number: value })}
                      disabled={!canSuppliers}
                    />
                    <TextField
                      id={f('ourcust')}
                      label={t('domain:contactForm.ourCustomerNumber')}
                      value={draft.supplier.our_customer_number}
                      onChange={(value) => setSupplier({ our_customer_number: value })}
                      disabled={!canSuppliers}
                    />
                  </div>
                  <PaymentTerms
                    idPrefix={f('sup')}
                    value={draft.supplier}
                    onChange={(patch) => setSupplier(patch)}
                    disabled={!canSuppliers}
                  />
                  <div className="grid gap-2">
                    <Label htmlFor={f('costcat')}>
                      {t('domain:contactForm.defaultCostCategory')}
                    </Label>
                    <Select
                      id={f('costcat')}
                      value={draft.supplier.default_cost_category_id}
                      disabled={!canSuppliers}
                      onChange={(_, { value }) => setSupplier({ default_cost_category_id: value })}
                    >
                      <option value="">{t('domain:contactForm.noDefaultCostCategory')}</option>
                      {(costCategories.data ?? []).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Section>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor={f('notes')}>{t('domain:contactForm.notes')}</Label>
                <Textarea
                  id={f('notes')}
                  rows={3}
                  value={draft.notes}
                  onChange={(event) => set({ notes: event.target.value })}
                />
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </DrawerBody>

      <FormDrawerFooter>
        <Button type="button" onClick={() => onDone()}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={save.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 flex flex-col gap-0.5">
        <Text weight="semibold">{title}</Text>
        {hint ? (
          <Text size={200} className="text-muted-foreground">
            {hint}
          </Text>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}

function PaymentTerms({
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  idPrefix: string;
  value: { payment_term_days: string; discount_percent: string; discount_days: string };
  onChange: (patch: {
    payment_term_days?: string;
    discount_percent?: string;
    discount_days?: string;
  }) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TextField
        id={`${idPrefix}-term`}
        label={t('domain:contactForm.paymentTermDays')}
        inputMode="numeric"
        value={value.payment_term_days}
        onChange={(v) => onChange({ payment_term_days: v })}
        disabled={disabled}
      />
      <TextField
        id={`${idPrefix}-skonto`}
        label={t('domain:contactForm.discountPercent')}
        inputMode="decimal"
        value={value.discount_percent}
        onChange={(v) => onChange({ discount_percent: v })}
        disabled={disabled}
      />
      <TextField
        id={`${idPrefix}-skontodays`}
        label={t('domain:contactForm.discountDays')}
        inputMode="numeric"
        value={value.discount_days}
        onChange={(v) => onChange({ discount_days: v })}
        disabled={disabled}
      />
    </div>
  );
}

function CountrySelect({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const known = (CONTACT_COUNTRIES as readonly string[]).includes(value);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(_, { value: next }) => onChange(next)}
      >
        {CONTACT_COUNTRIES.map((code) => (
          <option key={code} value={code}>
            {t(`domain:country.${code}`)}
          </option>
        ))}
        {/* Ein Land außerhalb der Liste (z. B. aus einer E-Rechnung) bleibt wählbar. */}
        {!known && value ? <option value={value}>{value}</option> : null}
      </Select>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type,
  placeholder,
  inputMode,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: InputProps['type'];
  placeholder?: string;
  inputMode?: 'numeric' | 'decimal';
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
