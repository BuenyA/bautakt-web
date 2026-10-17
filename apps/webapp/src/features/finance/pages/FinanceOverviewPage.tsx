import {
  eurosToMinor,
  formatMoney,
  INCOMING_GROUP_ORDER,
  type IncomingGroupKey,
  OUTGOING_GROUP_ORDER,
  type OutgoingDeskItem,
  type OutgoingGroupKey,
} from '@bautakt/finance';
import { cn } from '@bautakt/ui';
import {
  AddRegular,
  DocumentArrowDownRegular,
  DocumentArrowUpRegular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { usePermission } from '@/features/company/usePermission';
import { Row } from '@/features/overview/components/TodoPanel';
import { formatDate } from '@/lib/format';
import { routes, withCreate } from '@/lib/routes';

import { FinanceHeader } from '../FinanceHeader';
import { DeskCard, type DeskGroupView } from '../overview/DeskCard';
import { FinanceNumbersCard } from '../overview/FinanceNumbersCard';
import type { IncomingInvoiceListRow } from '../useExpenses';
import { useFinanceOverviewData } from '../useFinanceOverviewData';

/**
 * `/rechnungen` — der Arbeitsplatz des Büros.
 *
 * Aufgebaut wie die Startseite: oben eine Reihe aus drei Karten, links und in
 * der Mitte gleich breit Ausgangs- und Eingangsrechnungen (darum geht es hier
 * jeden Tag), rechts schmal die Zahlen. Verläufe stehen in den Auswertungen,
 * damit die Seite ohne Scrollen auskommt.
 *
 * ⚠️ Ohne Recht fehlt eine Karte ganz — keine Nullen, die wie „nichts offen“
 * aussähen. Führung, keine Kontrolle: die Grenze bleibt RLS.
 */
export function FinanceOverviewPage() {
  const { t } = useTranslation();
  const data = useFinanceOverviewData();
  const canManageOverheadCosts = usePermission('canManageOverheadCosts');
  const { access, outgoing, incoming, numbers } = data;

  const columns = [outgoing, incoming, numbers].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <FinanceHeader
        description={t('domain:invoiceDesk.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageOverheadCosts ? (
              <LinkButton to={withCreate(routes.expenses)} icon={<AddRegular />}>
                {t('domain:expenseForm.title')}
              </LinkButton>
            ) : null}
            {access.canWriteSalesDocuments ? (
              <>
                <LinkButton to={routes.quoteNew} icon={<AddRegular />}>
                  {t('domain:invoiceDesk.newQuote')}
                </LinkButton>
                <LinkButton appearance="primary" to={routes.invoiceNew} icon={<AddRegular />}>
                  {t('domain:invoiceDesk.newInvoice')}
                </LinkButton>
              </>
            ) : null}
          </div>
        }
      />

      {columns === 0 ? (
        <EmptyState
          title={t('common:hub.emptyTitle')}
          description={t('domain:invoiceDesk.nothingVisible')}
        />
      ) : (
        <div
          className={cn(
            'grid gap-4',
            columns === 3 && 'lg:grid-cols-2 xl:grid-cols-[5fr_5fr_3fr]',
            columns === 2 && 'lg:grid-cols-2',
          )}
        >
          {/* Erst was reinkommt, dann was rausgeht (Owner 17.10.2026). */}
          {incoming ? (
            <div className="min-w-0">
              <IncomingCard incoming={incoming} />
            </div>
          ) : null}
          {outgoing ? (
            <div className="min-w-0">
              <OutgoingCard outgoing={outgoing} />
            </div>
          ) : null}
          {numbers ? (
            <div className={cn('min-w-0', columns === 3 && 'lg:col-span-2 xl:col-span-1')}>
              <FinanceNumbersCard numbers={numbers} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function OutgoingCard({
  outgoing,
}: {
  outgoing: NonNullable<ReturnType<typeof useFinanceOverviewData>['outgoing']>;
}) {
  const { t } = useTranslation();
  const views: Record<OutgoingGroupKey, DeskGroupView> = {
    overdue: {
      label: t('domain:invoiceDesk.outgoing.groups.overdue'),
      empty: t('domain:invoiceDesk.outgoing.empty.overdue'),
      to: routes.receivables,
      urgent: true,
    },
    open: {
      label: t('domain:invoiceDesk.outgoing.groups.open'),
      empty: t('domain:invoiceDesk.outgoing.empty.open'),
      to: routes.receivables,
    },
    draft: {
      label: t('domain:invoiceDesk.outgoing.groups.draft'),
      empty: t('domain:invoiceDesk.outgoing.empty.draft'),
      to: `${routes.invoices}?status=entwurf`,
    },
  };

  const subtitleOf = (item: OutgoingDeskItem) => {
    const customer =
      outgoing.customerById.get(item.document.id) ||
      t('domain:invoiceDesk.outgoing.unknownCustomer');
    const { document } = item;
    const when =
      document.status === 'draft'
        ? null
        : item.daysOverdue > 0
          ? t('domain:invoiceDesk.outgoing.daysOverdue', { count: item.daysOverdue })
          : document.due_date
            ? t('domain:invoiceDesk.outgoing.due', { date: formatDate(document.due_date) })
            : t('domain:invoiceDesk.outgoing.noDue');
    return [customer, when].filter(Boolean).join(' · ');
  };

  return (
    <DeskCard
      title={t('domain:invoiceDesk.outgoing.title')}
      icon={DocumentArrowUpRegular}
      order={OUTGOING_GROUP_ORDER}
      groups={outgoing.desk}
      views={views}
      isLoading={outgoing.isLoading}
      isError={outgoing.isError}
      errorText={t('domain:invoiceDesk.loadError')}
      renderRow={(item) => (
        <Row
          key={item.document.id}
          to={
            item.document.status === 'draft'
              ? routes.invoiceEdit(item.document.id)
              : routes.invoice(item.document.id)
          }
          title={item.document.document_number || t('domain:invoiceDesk.outgoing.noNumber')}
          subtitle={subtitleOf(item)}
          trailing={
            <span className={cn('font-semibold', item.daysOverdue > 0 && 'text-destructive')}>
              {formatMoney(item.minor)}
            </span>
          }
        />
      )}
    />
  );
}

function IncomingCard({
  incoming,
}: {
  incoming: NonNullable<ReturnType<typeof useFinanceOverviewData>['incoming']>;
}) {
  const { t } = useTranslation();
  const view = (key: IncomingGroupKey, urgent?: boolean): DeskGroupView => ({
    label: t(`domain:invoiceDesk.incoming.groups.${key}`),
    empty: t(`domain:invoiceDesk.incoming.empty.${key}`),
    // Eine Detailseite für Eingangsrechnungen gibt es noch nicht.
    to: routes.expenses,
    urgent,
  });
  const views: Record<IncomingGroupKey, DeskGroupView> = {
    new: view('new'),
    overdue: view('overdue', true),
    dueSoon: view('dueSoon'),
    open: view('open'),
  };

  return (
    <DeskCard
      title={t('domain:invoiceDesk.incoming.title')}
      icon={DocumentArrowDownRegular}
      order={INCOMING_GROUP_ORDER}
      groups={incoming.desk}
      views={views}
      isLoading={incoming.isLoading}
      isError={incoming.isError}
      errorText={t('domain:invoiceDesk.loadError')}
      renderRow={(row: IncomingInvoiceListRow) => (
        <Row
          key={row.id}
          to={routes.expenses}
          title={row.vendor_name || t('domain:invoiceDesk.incoming.noVendor')}
          subtitle={[
            row.invoice_number,
            row.due_date ? t('domain:overview.todo.due', { date: formatDate(row.due_date) }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          trailing={
            <span className="font-semibold">{formatMoney(eurosToMinor(row.gross_total))}</span>
          }
        />
      )}
    />
  );
}
