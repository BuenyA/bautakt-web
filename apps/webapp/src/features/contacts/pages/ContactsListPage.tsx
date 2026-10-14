import { DataTable, type DataTableColumn, StatusBadge } from '@bautakt/ui';
import {
  Button,
  Link as FluentLink,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Switch,
  Tab,
  TabList,
} from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { RouterLink } from '@/components/common/RouterLink';
import { useCreateFromUrl } from '@/components/common/useCreateFromUrl';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { routes } from '@/lib/routes';

import { type ContactDraft, emptyContact } from '../contactDraft';
import {
  CONTACT_TABS,
  contactArchiveParam,
  type ContactTab,
  contactTabFromSearch,
  contactTabParam,
  contactTabToSearch,
  matchesContactTab,
  roleOfTab,
} from '../contactListFilter';
import type { ContactRole } from '../contactModel';
import { ContactRoleBadges } from '../ContactRoleBadges';
import { ContactSheet } from '../ContactSheet';
import { type ContactListRow, useContacts } from '../useContacts';

/**
 * Kontakte: alle Geschäftspartner des Betriebs in einer Liste, nach Rolle in
 * Reitern. Ein Kontakt mit zwei Rollen steht in beiden Reitern — er ist
 * trotzdem nur einmal gespeichert.
 */
export function ContactsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const labels = useDataTableLabels();
  const canCustomers = usePermission('canManageCustomers');
  const canSuppliers = usePermission('canManageSuppliers');
  const canCreate = canCustomers || canSuppliers;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = contactTabFromSearch(searchParams.get(contactTabParam));
  const showArchived = searchParams.get(contactArchiveParam) === '1';
  const panelId = useId();
  const [draft, setDraft] = useState<ContactDraft | null>(null);

  function defaultRoleFor(current: ContactTab): ContactRole | null {
    const role = roleOfTab(current);
    if (role) return role;
    return canCustomers ? 'customer' : canSuppliers ? 'supplier' : null;
  }

  // `?neu=1` aus der Schnellsuche öffnet das Anlege-Panel mit der Rolle des Reiters.
  useCreateFromUrl(canCreate, () => setDraft(emptyContact(defaultRoleFor(tab))));

  const contacts = useContacts();
  const { data, isError, refetch } = contacts;
  const isLoading = useCompanyListLoading(contacts);

  function updateParams(next: { tab?: ContactTab; archived?: boolean }) {
    const params = new URLSearchParams(searchParams);
    const nextTab = next.tab ?? tab;
    const value = contactTabToSearch(nextTab);
    if (value) params.set(contactTabParam, value);
    else params.delete(contactTabParam);
    const archived = next.archived ?? showArchived;
    if (archived) params.set(contactArchiveParam, '1');
    else params.delete(contactArchiveParam);
    setSearchParams(params, { replace: true });
  }

  const rows = useMemo(
    () => (data ?? []).filter((row) => matchesContactTab(row, tab, showArchived)),
    [data, tab, showArchived],
  );

  const counts = useMemo(() => {
    const result: Record<ContactTab, number> = {
      all: 0,
      customers: 0,
      suppliers: 0,
      subcontractors: 0,
      others: 0,
    };
    for (const row of data ?? []) {
      for (const key of CONTACT_TABS) {
        if (matchesContactTab(row, key, false)) result[key] += 1;
      }
    }
    return result;
  }, [data]);

  const showNumber = tab === 'customers' || tab === 'suppliers' || tab === 'subcontractors';

  const columns = useMemo<DataTableColumn<ContactListRow>[]>(() => {
    const list: DataTableColumn<ContactListRow>[] = [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: t('domain:contacts.columns.name'),
        cell: ({ row }) => (
          <RouterLink appearance="subtle" to={routes.contact(row.original.id)} stopPropagation>
            <span className="font-medium">{row.original.name || t('domain:contacts.unnamed')}</span>
          </RouterLink>
        ),
      },
      {
        id: 'roles',
        accessorFn: (row) => row.roles.map((role) => t(`domain:contactRoles.${role}`)).join(', '),
        header: t('domain:contacts.columns.roles'),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.archived_at ? (
            <StatusBadge tone="neutral">{t('domain:contacts.archived')}</StatusBadge>
          ) : (
            <ContactRoleBadges roles={row.original.roles} />
          ),
      },
    ];
    if (showNumber) {
      list.push({
        id: 'number',
        accessorFn: (row) =>
          tab === 'customers' ? (row.customer_number ?? '') : (row.supplier_number ?? ''),
        header: t('domain:contacts.columns.number'),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground tabular-nums">{String(getValue() ?? '')}</span>
        ),
      });
    }
    list.push(
      {
        accessorKey: 'city',
        header: t('domain:contacts.columns.city'),
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.city}</span>,
      },
      {
        id: 'phone',
        accessorFn: (row) => row.phone || row.mobile,
        header: t('domain:contacts.columns.phone'),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{String(getValue() ?? '')}</span>
        ),
      },
      {
        accessorKey: 'email',
        header: t('domain:contacts.columns.email'),
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      },
    );
    return list;
  }, [t, tab, showNumber]);

  const header = (
    <PageHeader
      title={t('domain:contacts.listTitle')}
      description={t('domain:contacts.listDescription')}
      actions={
        canCreate ? <NewContactButton onNew={(role) => setDraft(emptyContact(role))} /> : null
      }
    />
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title={t('domain:contacts.loadErrorTitle')}
          description={t('domain:contacts.loadErrorDescription')}
          action={
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
          }
        />
      </div>
    );
  }

  const hasAny = (data?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabList
            selectedValue={showArchived ? 'all' : tab}
            onTabSelect={(_, { value }) =>
              updateParams({ tab: value as ContactTab, archived: false })
            }
          >
            {CONTACT_TABS.map((key) => (
              <Tab key={key} value={key} aria-controls={panelId}>
                {t(`domain:contacts.tabs.${key}`)}
                {counts[key] > 0 ? (
                  <span className="text-muted-foreground ml-1 tabular-nums">{counts[key]}</span>
                ) : null}
              </Tab>
            ))}
          </TabList>
          <Switch
            label={t('domain:contacts.showArchived')}
            checked={showArchived}
            onChange={(_, { checked }) => updateParams({ tab: 'all', archived: checked })}
          />
        </div>

        <div role="tabpanel" id={panelId}>
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            labels={labels}
            exportFileName="kontakte"
            onRowClick={(contact) => void navigate(routes.contact(contact.id))}
            empty={
              <EmptyState
                title={
                  hasAny ? t('domain:contacts.emptyResultsTitle') : t('domain:contacts.emptyTitle')
                }
                description={
                  hasAny
                    ? t('domain:contacts.emptyResultsDescription')
                    : t('domain:contacts.emptyDescription')
                }
              />
            }
          />
        </div>
      </div>

      <ContactSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        onSaved={(id) => void navigate(routes.contact(id))}
      />
    </div>
  );
}

/** „Neu“ mit Auswahl der Rolle — die Rolle entscheidet, welche Felder kommen. */
function NewContactButton({ onNew }: { onNew: (role: ContactRole) => void }) {
  const { t } = useTranslation();
  const canCustomers = usePermission('canManageCustomers');
  const canSuppliers = usePermission('canManageSuppliers');

  const options: ContactRole[] = [
    ...(canCustomers ? (['customer'] as const) : []),
    ...(canSuppliers ? (['supplier', 'subcontractor'] as const) : []),
    'other',
  ];

  return (
    <Menu positioning="below-end">
      <MenuTrigger disableButtonEnhancement>
        <Button appearance="primary" icon={<AddRegular />}>
          {t('domain:contacts.new')}
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {options.map((role) => (
            <MenuItem key={role} onClick={() => onNew(role)}>
              {t(`domain:contactRoles.${role}`)}
            </MenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
