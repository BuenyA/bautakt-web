import { cn } from '@bautakt/ui';
import {
  AddRegular,
  DocumentArrowDownRegular,
  DocumentArrowUpRegular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { FILL_VIEWPORT_LG } from '@/components/layout/fillViewport';
import { usePermission } from '@/features/company/usePermission';
import { formatDate } from '@/lib/format';
import { createIncomingInvoice, routes, withCreate } from '@/lib/routes';

import { FinanceHeader } from '../FinanceHeader';
import { DeskCard, DeskRow } from '../overview/DeskCard';
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
  const { access, outgoing, incoming } = data;

  const columns = [outgoing, incoming].filter(Boolean).length;

  return (
    // Ab `lg` reichen die Rechnungskarten bis zum unteren Fensterrand.
    <div className={cn('flex flex-col gap-6', columns > 0 && FILL_VIEWPORT_LG)}>
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
            'grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]',
            columns === 2 && 'lg:grid-cols-2',
          )}
        >
          {/* Erst was reinkommt, dann was rausgeht (Owner 17.10.2026). */}
          {incoming ? (
            <div className="min-w-0">
              <IncomingCard incoming={incoming} canCreate={canManageOverheadCosts} />
            </div>
          ) : null}
          {outgoing ? (
            <div className="min-w-0">
              <OutgoingCard outgoing={outgoing} canWrite={access.canWriteSalesDocuments} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function OutgoingCard({
  outgoing,
  canWrite,
}: {
  outgoing: NonNullable<ReturnType<typeof useFinanceOverviewData>['outgoing']>;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const { entries, minor } = outgoing.desk;

  return (
    <DeskCard
      title={t('domain:invoiceDesk.outgoing.title')}
      icon={DocumentArrowUpRegular}
      minor={minor}
      sumLabel={t('domain:invoiceDesk.outgoing.sumLabel')}
      allTo={routes.receivables}
      empty={t('domain:invoiceDesk.outgoing.empty')}
      emptyAction={
        canWrite ? (
          <LinkButton to={routes.invoiceNew} appearance="primary" icon={<AddRegular />}>
            {t('domain:invoiceDesk.outgoing.create')}
          </LinkButton>
        ) : undefined
      }
      isLoading={outgoing.isLoading}
      isError={outgoing.isError}
      errorText={t('domain:invoiceDesk.loadError')}
      rows={entries.map(({ item, minor: amount, due }) => (
        <DeskRow
          key={item.id}
          to={item.status === 'draft' ? routes.invoiceEdit(item.id) : routes.invoice(item.id)}
          title={item.document_number || t('domain:invoiceDesk.outgoing.noNumber')}
          subtitle={[
            outgoing.customerById.get(item.id) || t('domain:invoiceDesk.outgoing.unknownCustomer'),
            item.status !== 'draft' && item.due_date
              ? t('domain:invoiceDesk.outgoing.due', { date: formatDate(item.due_date) })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          minor={amount}
          due={due}
        />
      ))}
    />
  );
}

function IncomingCard({
  incoming,
  canCreate,
}: {
  incoming: NonNullable<ReturnType<typeof useFinanceOverviewData>['incoming']>;
  canCreate: boolean;
}) {
  const { t } = useTranslation();
  const { entries, minor } = incoming.desk;

  return (
    <DeskCard
      title={t('domain:invoiceDesk.incoming.title')}
      icon={DocumentArrowDownRegular}
      minor={minor}
      sumLabel={t('domain:invoiceDesk.incoming.sumLabel')}
      // Eine Detailseite für Eingangsrechnungen gibt es noch nicht.
      allTo={routes.expenses}
      empty={t('domain:invoiceDesk.incoming.empty')}
      emptyAction={
        canCreate ? (
          <LinkButton
            to={withCreate(routes.expenses, createIncomingInvoice)}
            appearance="primary"
            icon={<AddRegular />}
          >
            {t('domain:invoiceDesk.incoming.create')}
          </LinkButton>
        ) : undefined
      }
      isLoading={incoming.isLoading}
      isError={incoming.isError}
      errorText={t('domain:invoiceDesk.loadError')}
      rows={entries.map(({ item, minor: amount, due }) => (
        <DeskRow
          key={item.id}
          to={routes.expenses}
          title={item.vendor_name || t('domain:invoiceDesk.incoming.noVendor')}
          subtitle={[
            item.invoice_number,
            item.due_date
              ? t('domain:overview.todo.due', { date: formatDate(item.due_date) })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          minor={amount}
          due={due}
        />
      ))}
    />
  );
}
