import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';

import { customerDisplayName, useCustomers } from '../useCustomers';

export function CustomersListPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useCustomers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:customers.listTitle')}
        description={t('domain:customers.listDescription')}
      />

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <EmptyState
          title={t('domain:customers.loadErrorTitle')}
          description={t('domain:customers.loadErrorDescription')}
          action={
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => void refetch()}
            >
              {t('common:action.retry')}
            </button>
          }
        />
      ) : !data?.length ? (
        <EmptyState
          title={t('domain:customers.emptyTitle')}
          description={t('domain:customers.emptyDescription')}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t('domain:customers.columns.name')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:customers.columns.number')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:customers.columns.city')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:customers.columns.email')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:customers.columns.phone')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((customer) => {
                const name = customerDisplayName(customer);
                return (
                  <tr key={customer.id} className="border-t border-border hover:bg-surface/60">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {name || t('domain:customers.unnamed')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {customer.customer_number || t('domain:customers.noNumber')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {customer.city || t('domain:customers.noCity')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {customer.email || t('domain:customers.noContact')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {customer.phone || t('domain:customers.noContact')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
