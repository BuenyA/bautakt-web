import { useTranslation } from 'react-i18next';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { RouterLink } from '@/components/common/RouterLink';
import { formatCurrency, formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { OrderContacts } from '../OrderContacts';
import { FinancePreview } from '../OrderFinance';
import {
  ChecklistPreview,
  DocumentsPreview,
  MaterialsPreview,
  NotesPreview,
  PhotosPreview,
  ReportsPreview,
  TimesPreview,
} from '../OrderPreviews';
import { useOrderOutlet, useVisibleOrderSections } from '../orderSections';
import { orderAddress, orderPeriod } from '../orderSummary';

/**
 * Startseite eines Auftrags: Stammdaten und Ansprechpartner nebeneinander,
 * darunter die Finanzkarte (mit Recht) und je Bereich eine kurze Vorschau. Die vollen Listen stehen auf den
 * Unterseiten (`/auftraege/:id/fotos` …).
 */
export function OrderOverviewPage() {
  const { t } = useTranslation();
  const data = useOrderOutlet();
  const visible = useVisibleOrderSections();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <DetailCard title={t('domain:orders.preview.masterData')}>
          <DetailRow
            label={t('domain:orders.fields.customer')}
            value={
              data.customer_id ? (
                <RouterLink to={routes.contact(data.customer_id)}>
                  {data.customer_label || t('domain:orders.noCustomer')}
                </RouterLink>
              ) : (
                data.customer_label || t('domain:orders.noCustomer')
              )
            }
          />
          <DetailRow label={t('domain:orders.fields.address')} value={orderAddress(data)} />
          <DetailRow label={t('domain:orders.fields.country')} value={data.country.trim()} />
          <DetailRow
            label={t('domain:orders.fields.period')}
            value={orderPeriod(formatDate(data.start_date), formatDate(data.end_date))}
          />
          <DetailRow
            label={t('domain:orders.fields.contractSum')}
            value={formatCurrency(data.contract_sum)}
          />
          <DetailRow label={t('domain:orders.fields.costCenter')} value={data.cost_center_label} />
          <DetailRow
            label={t('domain:orders.fields.description')}
            value={data.description.trim()}
          />
          <DetailRow
            label={t('domain:orders.fields.created')}
            value={formatDate(data.created_at)}
          />
        </DetailCard>
        <OrderContacts orderId={data.id} />
      </div>

      <FinancePreview order={data} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PhotosPreview orderId={data.id} />
        {visible?.has('documents') ? <DocumentsPreview orderId={data.id} /> : null}
        <NotesPreview orderId={data.id} />
        {visible?.has('checklist') ? <ChecklistPreview orderId={data.id} /> : null}
        <TimesPreview orderId={data.id} />
        <MaterialsPreview orderId={data.id} />
        {visible?.has('reports') ? <ReportsPreview orderId={data.id} /> : null}
      </div>
    </div>
  );
}
