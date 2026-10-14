import { Combobox, Option, OptionGroup } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePermission } from '@/features/company/usePermission';

import { type ContactDraft, emptyContact } from './contactDraft';
import { ContactSheet } from './ContactSheet';
import { type ContactListRow, contactsWithRole, useContacts } from './useContacts';

const CREATE = '__create__';
const NONE = '__none__';

/**
 * Kontakt für einen Beleg oder Auftrag wählen: Kunde, Lieferant oder — für
 * Beteiligte am Auftrag — jeder aktive Kontakt.
 *
 * Zeigt nur aktive Kontakte mit der passenden Rolle; die Datenbank würde
 * einen anderen ohnehin ablehnen (Fremdschlüssel auf die Rolle). „Neu
 * anlegen“ öffnet das Kontaktformular mit vorgewählter Rolle und übernimmt
 * den neuen Kontakt direkt.
 */
export function ContactPicker({
  id,
  contactRole: role,
  value,
  onChange,
  allowNone = false,
  noneLabel,
  disabled,
  invalid,
}: {
  id?: string;
  /** Kunde für Aufträge und Ausgangsbelege, Lieferant für Eingang und Ausgaben. */
  contactRole: 'customer' | 'supplier' | 'any';
  value: string | null;
  onChange: (contact: ContactListRow | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const { t } = useTranslation();
  const contacts = useContacts();
  const canCustomers = usePermission('canManageCustomers');
  const canSuppliers = usePermission('canManageSuppliers');
  const canCreate =
    role === 'customer'
      ? canCustomers
      : role === 'supplier'
        ? canSuppliers
        : canCustomers || canSuppliers;
  const [query, setQuery] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft | null>(null);

  const options = useMemo(() => contactsWithRole(contacts.data ?? [], role), [contacts.data, role]);
  const selected = (contacts.data ?? []).find((row) => row.id === value) ?? null;
  const shown = useMemo(() => {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.city.toLowerCase().includes(q) ||
        (row.customer_number ?? '').includes(q) ||
        (row.supplier_number ?? '').includes(q),
    );
  }, [options, query]);

  const placeholder =
    role === 'customer'
      ? t('domain:contactPicker.chooseCustomer')
      : role === 'supplier'
        ? t('domain:contactPicker.chooseSupplier')
        : t('domain:contactPicker.chooseContact');

  return (
    <>
      <Combobox
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        value={query ?? selected?.name ?? ''}
        selectedOptions={value ? [value] : []}
        onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
        onOpenChange={(_, data) => {
          if (!data.open) setQuery(null);
        }}
        onOptionSelect={(_, data) => {
          setQuery(null);
          if (data.optionValue === CREATE) {
            setDraft({
              ...emptyContact(role === 'any' ? 'other' : role),
              company_name: (query ?? '').trim(),
            });
            return;
          }
          if (data.optionValue === NONE) {
            onChange(null);
            return;
          }
          onChange(options.find((row) => row.id === data.optionValue) ?? null);
        }}
      >
        {allowNone ? (
          <Option value={NONE} text={noneLabel ?? t('domain:contactPicker.none')}>
            {noneLabel ?? t('domain:contactPicker.none')}
          </Option>
        ) : null}
        <OptionGroup>
          {shown.slice(0, 100).map((row) => {
            const number =
              role === 'customer'
                ? row.customer_number
                : role === 'supplier'
                  ? row.supplier_number
                  : null;
            return (
              <Option key={row.id} value={row.id} text={row.name}>
                <span className="flex w-full justify-between gap-3">
                  <span>{row.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {[number, row.city].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </Option>
            );
          })}
        </OptionGroup>
        {canCreate ? (
          <Option value={CREATE} text={t('domain:contactPicker.create')}>
            {query?.trim()
              ? t('domain:contactPicker.createNamed', { name: query.trim() })
              : t('domain:contactPicker.create')}
          </Option>
        ) : null}
      </Combobox>

      <ContactSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        onSaved={(newId) => {
          // Erst nach dem Neuladen gibt es die Zeile mit Name und Rollen.
          void contacts.refetch().then((result) => {
            onChange(result.data?.find((row) => row.id === newId) ?? null);
          });
        }}
      />
    </>
  );
}
