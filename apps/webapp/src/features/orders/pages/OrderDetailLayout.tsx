import { Button, Link as FluentLink, Tab, TabList } from '@fluentui/react-components';
import { DocumentAddRegular, EditRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { useFinanceAccess } from '@/features/finance/useFinanceAccess';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { ORDER_SECTION_TITLE, ORDER_SECTIONS, useVisibleOrderSections } from '../orderSections';
import { OrderSheet } from '../OrderSheet';
import { OrderStatusBadge } from '../OrderStatusBadge';
import { orderAddress, orderPeriod } from '../orderSummary';
import { useOrder } from '../useOrder';

/**
 * Rahmen jeder Auftragsseite: Kopf mit Status, Kunde, Adresse und Zeitraum,
 * darunter die Reiter Übersicht, Fotos, Notizen … Jeder Reiter ist eine
 * eigene Adresse (`/auftraege/:id/fotos`). Übersicht und Unterseiten lesen
 * den geladenen Auftrag über `useOrderOutlet`.
 */
export function OrderDetailLayout() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const canManage = usePermission('canManageOrders');
  const { canWriteSalesDocuments } = useFinanceAccess();
  const [editing, setEditing] = useState(false);
  const order = useOrder(id);
  const { data, isError, refetch } = order;
  const isLoading = useCompanyListLoading(order);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:orders.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:orders.detailTitle')} />
        <EmptyState
          title={t('domain:orders.loadErrorTitle')}
          description={t('domain:orders.loadErrorDescription')}
          action={
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:orders.detailTitle')} />
        <EmptyState
          title={t('domain:orders.notFoundTitle')}
          description={t('domain:orders.notFoundDescription')}
          action={<LinkButton to={routes.orders}>{t('common:action.back')}</LinkButton>}
        />
      </div>
    );
  }

  const summary = [
    data.customer_label,
    orderAddress(data),
    orderPeriod(formatDate(data.start_date), formatDate(data.end_date)),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <PageHeader
          title={data.name}
          titleAddon={<OrderStatusBadge status={data.status} />}
          description={summary || undefined}
          actions={
            <div className="flex items-center gap-2">
              <LinkButton to={routes.orders}>{t('common:action.back')}</LinkButton>
              {canWriteSalesDocuments ? (
                <LinkButton to={routes.invoiceNewFromOrder(data.id)} icon={<DocumentAddRegular />}>
                  {t('domain:orders.createInvoice')}
                </LinkButton>
              ) : null}
              {canManage ? (
                <Button
                  appearance="primary"
                  onClick={() => setEditing(true)}
                  icon={<EditRegular />}
                >
                  {t('common:action.edit')}
                </Button>
              ) : null}
            </div>
          }
        />
        <OrderTabs orderId={data.id} />
      </div>

      <Outlet context={data} />

      <OrderSheet mode="edit" order={data} open={editing} onOpenChange={setEditing} />
    </div>
  );
}

function OrderTabs({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const visible = useVisibleOrderSections();
  // Solange die Rechte laden, spränge die Leiste danach. Lieber eine leere
  // Zeile gleicher Höhe — wie bei den Reitern im Bereich Rechnungen.
  if (!visible) return <div className="h-11" aria-hidden />;

  const overview = routes.order(orderId);
  const tabs = ORDER_SECTIONS.filter((section) => visible.has(section)).map((section) => ({
    to: routes.orderSection(orderId, section),
    label: t(ORDER_SECTION_TITLE[section]),
  }));
  const selected =
    tabs.find((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`))?.to ?? overview;

  return (
    <TabList
      // Ohne Rand links: die Reiter stehen bündig mit der Überschrift darüber.
      // Am Handy wischt man durch die Reiter; ein Scrollbalken wäre nur Lärm.
      className="-mx-2.5 overflow-x-auto [scrollbar-width:none]"
      selectedValue={selected}
      onTabSelect={(_, { value }) => void navigate(String(value))}
      aria-label={t('domain:orders.sectionsLabel')}
    >
      <Tab value={overview}>{t('domain:orders.overviewTab')}</Tab>
      {tabs.map((tab) => (
        <Tab key={tab.to} value={tab.to}>
          {tab.label}
        </Tab>
      ))}
    </TabList>
  );
}
