import { StatusBadge, toast } from '@bautakt/ui';
import {
  Button,
  Link as FluentLink,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  ArchiveRegular,
  ArrowUndoRegular,
  DeleteRegular,
  EditRegular,
  MergeRegular,
  MoreHorizontalRegular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { RouterLink } from '@/components/common/RouterLink';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { useCostCategories } from '@/features/finance/useCostCategories';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { BankAccountsCard } from '../BankAccountsCard';
import { ContactDeleteDialog, MergeContactsDialog } from '../ContactDialogs';
import { type ContactDetail, type ContactDraft, draftFromContact } from '../contactDraft';
import {
  activeRoles,
  contactDisplayName,
  type ContactRole,
  formatContactAddress,
} from '../contactModel';
import { ContactPersonsCard } from '../ContactPersonsCard';
import { ContactRoleBadges } from '../ContactRoleBadges';
import { ContactSheet } from '../ContactSheet';
import { ExemptionCertificatesSection } from '../ExemptionCertificatesSection';
import { SectionCard } from '../SectionCard';
import { canViewBankAccounts, useContact, useContactUsage } from '../useContact';
import { useRemoveRole } from '../useContactDetailMutations';
import { useArchiveContact } from '../useContactMutations';

export function ContactDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: membership } = useMembership();
  const canCustomers = usePermission('canManageCustomers');
  const canSuppliers = usePermission('canManageSuppliers');
  const canViewFinance = usePermission('canViewCompanyFinance');
  const canOverhead = usePermission('canManageOverheadCosts');
  const canFinance = canViewFinance || canOverhead;
  const canBilling = usePermission('canUseBillingModule');
  const contact = useContact(id);
  const usage = useContactUsage(id);
  const archive = useArchiveContact();
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  const [dialog, setDialog] = useState<'delete' | 'merge' | null>(null);
  const isLoading = useCompanyListLoading(contact);
  const { data, isError, refetch } = contact;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:contacts.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:contacts.detailTitle')} />
        <EmptyState
          title={isError ? t('domain:contacts.loadErrorTitle') : t('domain:contacts.notFoundTitle')}
          description={
            isError
              ? t('domain:contacts.loadErrorDescription')
              : t('domain:contacts.notFoundDescription')
          }
          action={
            isError ? (
              <FluentLink as="button" onClick={() => void refetch()}>
                {t('common:action.retry')}
              </FluentLink>
            ) : (
              <LinkButton to={routes.contacts}>{t('common:action.back')}</LinkButton>
            )
          }
        />
      </div>
    );
  }

  const name = contactDisplayName(data) || t('domain:contacts.unnamed');
  const roles = activeRoles({
    customer: data.customer,
    supplier: data.supplier
      ? { archived_at: data.supplier.archived_at, subcontractor: data.supplier.subcontractor }
      : null,
    other: data.other,
  });
  const canEdit = canCustomers || canSuppliers;
  const isCreditor = Boolean(data.supplier);
  const mayEditBank = isCreditor ? canSuppliers && canFinance : canCustomers && canBilling;
  const used = usage.data
    ? usage.data.orders.length +
        usage.data.salesDocuments +
        usage.data.incomingInvoices +
        usage.data.expenses +
        usage.data.orderInvolvements.length >
      0
    : true;

  async function setArchived(archived: boolean) {
    try {
      await archive.mutateAsync({ contactId: data!.id, archived });
      toast.success(
        archived ? t('domain:contacts.archivedToast') : t('domain:contacts.restoredToast'),
      );
    } catch (caught) {
      toast.error(readableDbError(caught) ?? t('domain:contacts.archiveError'));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name}
        actions={
          <div className="flex items-center gap-2">
            <LinkButton to={routes.contacts}>{t('common:action.back')}</LinkButton>
            {canEdit ? (
              <>
                <Button
                  appearance="primary"
                  icon={<EditRegular />}
                  onClick={() => setDraft(draftFromContact(data))}
                >
                  {t('common:action.edit')}
                </Button>
                <Menu positioning="below-end">
                  <MenuTrigger disableButtonEnhancement>
                    <Button
                      appearance="subtle"
                      icon={<MoreHorizontalRegular />}
                      aria-label={t('common:action.more')}
                    />
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem icon={<MergeRegular />} onClick={() => setDialog('merge')}>
                        {t('domain:contactMerge.action')}
                      </MenuItem>
                      {data.archived_at ? (
                        <MenuItem
                          icon={<ArrowUndoRegular />}
                          onClick={() => void setArchived(false)}
                        >
                          {t('domain:contacts.restore')}
                        </MenuItem>
                      ) : (
                        <MenuItem icon={<ArchiveRegular />} onClick={() => void setArchived(true)}>
                          {t('domain:contacts.archive')}
                        </MenuItem>
                      )}
                      {!used ? (
                        <>
                          <MenuDivider />
                          <MenuItem icon={<DeleteRegular />} onClick={() => setDialog('delete')}>
                            {t('domain:contactDelete.action')}
                          </MenuItem>
                        </>
                      ) : null}
                    </MenuList>
                  </MenuPopover>
                </Menu>
              </>
            ) : null}
          </div>
        }
      />

      {roles.length > 0 ? <ContactRoleBadges roles={roles} /> : null}

      {data.archived_at ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            {t('domain:contacts.archivedBanner', { date: formatDate(data.archived_at) })}
          </MessageBarBody>
          {canEdit ? (
            <MessageBarActions>
              <Button onClick={() => void setArchived(false)}>
                {t('domain:contacts.restore')}
              </Button>
            </MessageBarActions>
          ) : null}
        </MessageBar>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <MasterDataCard contact={data} />
          {data.customer ? <CustomerRoleCard contact={data} canManage={canCustomers} /> : null}
          {data.supplier ? <SupplierRoleCard contact={data} canManage={canSuppliers} /> : null}
          {data.other ? <OtherRoleCard contact={data} canManage={canEdit} /> : null}
        </div>

        <div className="flex flex-col gap-6">
          <ContactPersonsCard contactId={data.id} canManage={canEdit} />
          {canViewBankAccounts(membership?.permissions) ? (
            <BankAccountsCard contactId={data.id} canManage={mayEditBank} isCreditor={isCreditor} />
          ) : null}
          <UsageCard contactId={data.id} />
        </div>
      </div>

      <ContactSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(o) => !o && setDraft(null)}
      />
      <ContactDeleteDialog
        contactId={data.id}
        name={name}
        open={dialog === 'delete'}
        onOpenChange={(o) => !o && setDialog(null)}
      />
      <MergeContactsDialog
        keepId={data.id}
        keepName={name}
        open={dialog === 'merge'}
        onOpenChange={(o) => !o && setDialog(null)}
      />
    </div>
  );
}

function MasterDataCard({ contact }: { contact: ContactDetail }) {
  const { t } = useTranslation();
  const address = formatContactAddress({
    street: contact.street_address,
    postalCode: contact.postal_code,
    city: contact.city,
    country: contact.country,
  });
  const contactPerson =
    contact.kind === 'company'
      ? [contact.salutation, contact.first_name, contact.last_name]
          .map((p) => p.trim())
          .filter(Boolean)
          .join(' ')
      : '';

  return (
    <SectionCard title={t('domain:contacts.masterData')}>
      <dl className="flex flex-col gap-4">
        <DetailRow
          label={t('domain:contactForm.kind')}
          value={t(`domain:contactKind.${contact.kind}`)}
        />
        <DetailRow label={t('domain:contacts.contactPerson')} value={contactPerson} />
        <DetailRow label={t('domain:contacts.address')} value={address} />
        <DetailRow
          label={t('domain:contactForm.phone')}
          value={
            contact.phone ? (
              <FluentLink href={`tel:${contact.phone}`}>{contact.phone}</FluentLink>
            ) : (
              ''
            )
          }
        />
        <DetailRow
          label={t('domain:contactForm.mobile')}
          value={
            contact.mobile ? (
              <FluentLink href={`tel:${contact.mobile}`}>{contact.mobile}</FluentLink>
            ) : (
              ''
            )
          }
        />
        <DetailRow
          label={t('domain:contactForm.email')}
          value={
            contact.email ? (
              <FluentLink href={`mailto:${contact.email}`}>{contact.email}</FluentLink>
            ) : (
              ''
            )
          }
        />
        <DetailRow label={t('domain:contactForm.website')} value={contact.website} />
        <DetailRow label={t('domain:contactForm.vatId')} value={contact.vat_id} />
        <DetailRow label={t('domain:contactForm.taxNumber')} value={contact.tax_number} />
        <DetailRow label={t('domain:contactForm.notes')} value={contact.notes.trim()} />
        <DetailRow label={t('domain:contacts.created')} value={formatDate(contact.created_at)} />
      </dl>
    </SectionCard>
  );
}

function paymentTermsText(
  t: (key: string, options?: Record<string, unknown>) => string,
  terms: {
    payment_term_days: number | null;
    discount_percent: number | null;
    discount_days: number | null;
  },
): string {
  const parts: string[] = [];
  if (terms.payment_term_days != null) {
    parts.push(t('domain:contacts.termDays', { count: terms.payment_term_days }));
  }
  if (terms.discount_percent != null && terms.discount_days != null) {
    parts.push(
      t('domain:contacts.discount', {
        percent: String(terms.discount_percent).replace('.', ','),
        days: terms.discount_days,
      }),
    );
  }
  return parts.join(' · ');
}

/** Menü je Rolle: archivieren/zurückholen, oder entfernen, solange nichts daran hängt. */
function RoleActions({
  contactId,
  contactRole: role,
  archived,
  canManage,
}: {
  contactId: string;
  contactRole: ContactRole;
  archived: boolean;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const archive = useArchiveContact();
  const remove = useRemoveRole();
  if (!canManage) return null;

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
    } catch (caught) {
      toast.error(readableDbError(caught) ?? t('domain:contacts.roleActionError'));
    }
  }

  return (
    <Menu positioning="below-end">
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          icon={<MoreHorizontalRegular />}
          aria-label={t('domain:contacts.roleActions')}
        />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {archived ? (
            <MenuItem
              icon={<ArrowUndoRegular />}
              onClick={() =>
                void run(
                  () => archive.mutateAsync({ contactId, role, archived: false }),
                  t('domain:contacts.roleRestored'),
                )
              }
            >
              {t('domain:contacts.restoreRole')}
            </MenuItem>
          ) : (
            <MenuItem
              icon={<ArchiveRegular />}
              onClick={() =>
                void run(
                  () => archive.mutateAsync({ contactId, role, archived: true }),
                  t('domain:contacts.roleArchived'),
                )
              }
            >
              {t('domain:contacts.archiveRole')}
            </MenuItem>
          )}
          <MenuItem
            icon={<DeleteRegular />}
            onClick={() =>
              void run(
                () => remove.mutateAsync({ contactId, role }),
                t('domain:contacts.roleRemoved'),
              )
            }
          >
            {t('domain:contacts.removeRole')}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

function ArchivedBadge({ archivedAt }: { archivedAt: string | null }) {
  const { t } = useTranslation();
  return archivedAt ? (
    <StatusBadge tone="neutral">{t('domain:contacts.archived')}</StatusBadge>
  ) : null;
}

function CustomerRoleCard({ contact, canManage }: { contact: ContactDetail; canManage: boolean }) {
  const { t } = useTranslation();
  const customer = contact.customer!;
  const billing = customer.billing_street.trim()
    ? formatContactAddress({
        street: customer.billing_street,
        postalCode: customer.billing_postal_code,
        city: customer.billing_city,
        country: customer.billing_country,
      })
    : '';

  return (
    <SectionCard
      title={t('domain:contactRoles.customer')}
      description={<ArchivedBadge archivedAt={customer.archived_at} />}
      action={
        <RoleActions
          contactId={contact.id}
          contactRole="customer"
          archived={Boolean(customer.archived_at)}
          canManage={canManage}
        />
      }
    >
      <dl className="flex flex-col gap-4">
        <DetailRow
          label={t('domain:contactForm.customerNumber')}
          value={customer.customer_number}
        />
        <DetailRow
          label={t('domain:contactForm.buyerReference')}
          value={customer.buyer_reference}
        />
        <DetailRow
          label={t('domain:contacts.paymentTerms')}
          value={paymentTermsText(t, customer)}
        />
        <DetailRow
          label={t('domain:contactForm.constructionBusiness')}
          value={
            customer.is_construction_business
              ? customer.tax_exemption_valid_until
                ? t('domain:contacts.constructionUntil', {
                    date: formatDate(customer.tax_exemption_valid_until),
                  })
                : t('common:answer.yes')
              : ''
          }
        />
        <DetailRow label={t('domain:contactForm.billingAddress')} value={billing} />
      </dl>
    </SectionCard>
  );
}

function SupplierRoleCard({ contact, canManage }: { contact: ContactDetail; canManage: boolean }) {
  const { t } = useTranslation();
  const costCategories = useCostCategories();
  const supplier = contact.supplier!;
  const sub = supplier.subcontractor;
  const costCategory = costCategories.data?.find((c) => c.id === supplier.default_cost_category_id);

  return (
    <SectionCard
      title={sub ? t('domain:contactRoles.subcontractor') : t('domain:contactRoles.supplier')}
      description={<ArchivedBadge archivedAt={sub?.archived_at ?? supplier.archived_at} />}
      action={
        <RoleActions
          contactId={contact.id}
          contactRole={sub ? 'subcontractor' : 'supplier'}
          archived={Boolean(sub ? sub.archived_at : supplier.archived_at)}
          canManage={canManage}
        />
      }
    >
      <dl className="flex flex-col gap-4">
        <DetailRow
          label={t('domain:contactForm.supplierNumber')}
          value={supplier.supplier_number}
        />
        <DetailRow
          label={t('domain:contactForm.ourCustomerNumber')}
          value={supplier.our_customer_number}
        />
        <DetailRow
          label={t('domain:contacts.paymentTerms')}
          value={paymentTermsText(t, supplier)}
        />
        <DetailRow
          label={t('domain:contactForm.defaultCostCategory')}
          value={costCategory?.name ?? ''}
        />
        {sub ? (
          <>
            <DetailRow label={t('domain:contactForm.trade')} value={sub.trade} />
            <DetailRow
              label={t('domain:contactForm.reverseCharge13b')}
              value={sub.reverse_charge_13b ? t('common:answer.yes') : t('common:answer.no')}
            />
          </>
        ) : null}
      </dl>
      {sub ? <ExemptionCertificatesSection contactId={contact.id} canManage={canManage} /> : null}
    </SectionCard>
  );
}

function OtherRoleCard({ contact, canManage }: { contact: ContactDetail; canManage: boolean }) {
  const { t } = useTranslation();
  const other = contact.other!;
  return (
    <SectionCard
      title={t('domain:contactRoles.other')}
      description={<ArchivedBadge archivedAt={other.archived_at} />}
      action={
        <RoleActions
          contactId={contact.id}
          contactRole="other"
          archived={Boolean(other.archived_at)}
          canManage={canManage}
        />
      }
    >
      <dl className="flex flex-col gap-4">
        <DetailRow
          label={t('domain:contactForm.function')}
          value={t(`domain:otherFunction.${other.function}`)}
        />
      </dl>
    </SectionCard>
  );
}

/** Wo der Kontakt vorkommt — Aufträge als Links, Belege als Anzahl. */
function UsageCard({ contactId }: { contactId: string }) {
  const { t } = useTranslation();
  const usage = useContactUsage(contactId);
  const data = usage.data;
  if (!data) return null;

  const hasAny =
    data.orders.length +
      data.orderInvolvements.length +
      data.salesDocuments +
      data.incomingInvoices +
      data.expenses >
    0;

  return (
    <SectionCard title={t('domain:contacts.usage')}>
      {!hasAny ? (
        <p className="text-muted-foreground text-sm">{t('domain:contacts.unused')}</p>
      ) : (
        <dl className="flex flex-col gap-4">
          <DetailRow
            label={t('domain:contacts.usageOrders')}
            value={
              data.orders.length > 0 ? (
                <span className="flex flex-col gap-1">
                  {data.orders.slice(0, 8).map((order) => (
                    <RouterLink key={order.id} to={routes.order(order.id)}>
                      {order.name}
                    </RouterLink>
                  ))}
                  {data.orders.length > 8 ? (
                    <span className="text-muted-foreground">
                      {t('domain:contacts.andMore', { count: data.orders.length - 8 })}
                    </span>
                  ) : null}
                </span>
              ) : (
                ''
              )
            }
          />
          <DetailRow
            label={t('domain:contacts.usageInvolved')}
            value={
              data.orderInvolvements.length > 0 ? (
                <span className="flex flex-col gap-1">
                  {data.orderInvolvements.map((entry) => (
                    <RouterLink
                      key={`${entry.order_id}-${entry.role}`}
                      to={routes.order(entry.order_id)}
                    >
                      {entry.order_name} · {t(`domain:orderContactRole.${entry.role}`)}
                    </RouterLink>
                  ))}
                </span>
              ) : (
                ''
              )
            }
          />
          <DetailRow
            label={t('domain:contacts.usageSales')}
            value={data.salesDocuments > 0 ? String(data.salesDocuments) : ''}
          />
          <DetailRow
            label={t('domain:contacts.usageIncoming')}
            value={data.incomingInvoices > 0 ? String(data.incomingInvoices) : ''}
          />
          <DetailRow
            label={t('domain:contacts.usageExpenses')}
            value={data.expenses > 0 ? String(data.expenses) : ''}
          />
        </dl>
      )}
    </SectionCard>
  );
}
