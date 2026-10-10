import { hasPermission } from '@bautakt/core';
import { Combobox, Option, OptionGroup } from '@fluentui/react-components';
import { AddCircle20Regular, type FluentIcon, Search20Regular } from '@fluentui/react-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useMembership } from '@/features/company/useMembership';
import { hubs, visibleHubCards } from '@/features/hubs/hubs';
import { canCreateTimeEntry } from '@/features/times/timeEntryAccess';
import { routes, withCreate } from '@/lib/routes';

import { maySee, navItems, settingsNavItem } from './navItems';

type Entry = { to: string; label: string; icon: FluentIcon };

/**
 * Seiten und Aktionen, die die angemeldete Person sehen darf.
 *
 * Dieselben Rechte wie Leiste, Hub-Karten und Anlegen-Knöpfe. ⚠️ Führung,
 * keine Kontrolle: die Grenze bleibt RLS.
 */
function useEntries(): { pages: Entry[]; actions: Entry[] } {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const permissions = membership?.permissions;
  const can = (key: Parameters<typeof hasPermission>[1]) => hasPermission(permissions, key);

  const pages: Entry[] = [
    ...navItems
      .filter((item) => maySee(item, permissions))
      .map((item) => ({ to: item.to, label: t(item.labelKey), icon: item.icon })),
    ...hubs.flatMap((hub) =>
      visibleHubCards(hub, permissions)
        .filter((card) => !card.duplicate)
        .map((card) => ({ to: card.to, label: t(card.titleKey), icon: card.icon })),
    ),
    { to: settingsNavItem.to, label: t(settingsNavItem.labelKey), icon: settingsNavItem.icon },
  ];

  const actions: Entry[] = [
    can('canCreateOrders') && { to: withCreate(routes.orders), key: 'domain:orders.create.action' },
    can('canManageWorkAssignments') && {
      to: withCreate(routes.assignments),
      key: 'domain:assignments.create.action',
    },
    canCreateTimeEntry(permissions) && {
      to: withCreate(routes.times),
      key: 'domain:timeForm.newTitle',
    },
    can('canManageCustomers') && {
      to: withCreate(routes.customers),
      key: 'domain:customerForm.newTitle',
    },
    can('canManageEmployees') && {
      to: withCreate(routes.employees),
      key: 'domain:employeeForm.newTitle',
    },
    can('canManageAbsences') && {
      to: withCreate(routes.absences),
      key: 'domain:absenceForm.title',
    },
    can('canManageOverheadCosts') && {
      to: withCreate(routes.expenses),
      key: 'domain:expenseForm.title',
    },
    can('canUseBillingModule') && { to: routes.invoiceNew, key: 'domain:invoices.new' },
    can('canUseBillingModule') && { to: routes.quoteNew, key: 'domain:quotes.new' },
  ]
    .filter((entry): entry is { to: string; key: string } => Boolean(entry))
    .map((entry) => ({ to: entry.to, label: t(entry.key), icon: AddCircle20Regular }));

  return { pages, actions };
}

function matches(label: string, query: string): boolean {
  return label.toLocaleLowerCase('de').includes(query);
}

/**
 * Schnellsuche in der Kopfzeile: Seite oder Aktion tippen, Enter, dort.
 *
 * Fluents `Combobox` mit eigener Filterung, Aktionen oben (sie öffnen das
 * Anlege-Panel über `?neu=1`), Seiten darunter. Strg+K (Cmd+K) setzt den
 * Fokus hinein. Das Feld leert sich nach jeder Wahl.
 */
export function QuickSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pages, actions } = useEntries();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const needle = query.trim().toLocaleLowerCase('de');
  const shownActions = actions.filter((entry) => matches(entry.label, needle));
  const shownPages = pages.filter((entry) => matches(entry.label, needle));

  const render = (entry: Entry) => {
    const Icon = entry.icon;
    return (
      <Option key={entry.to} value={entry.to} text={entry.label}>
        <span className="flex items-center gap-2">
          <Icon fontSize={20} aria-hidden />
          {entry.label}
        </span>
      </Option>
    );
  };

  return (
    <Combobox
      ref={inputRef}
      freeform
      className="w-full max-w-md"
      aria-label={t('common:search.label')}
      placeholder={t('common:search.placeholder')}
      expandIcon={<Search20Regular />}
      value={query}
      selectedOptions={[]}
      onChange={(event) => setQuery(event.target.value)}
      onOptionSelect={(_, data) => {
        if (!data.optionValue) return;
        setQuery('');
        inputRef.current?.blur();
        navigate(data.optionValue);
      }}
    >
      {shownActions.length > 0 ? (
        <OptionGroup label={t('common:search.actions')}>{shownActions.map(render)}</OptionGroup>
      ) : null}
      {shownPages.length > 0 ? (
        <OptionGroup label={t('common:search.pages')}>{shownPages.map(render)}</OptionGroup>
      ) : null}
      {shownActions.length === 0 && shownPages.length === 0 ? (
        <Option value="" text="" disabled>
          {t('common:search.empty')}
        </Option>
      ) : null}
    </Combobox>
  );
}
