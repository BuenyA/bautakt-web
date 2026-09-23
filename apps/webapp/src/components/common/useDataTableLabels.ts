import type { DataTableLabels } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

/**
 * Beschriftungen der gemeinsamen Tabelle. Die Komponente liegt in
 * `packages/ui` und kennt i18next nicht — uebersetzt wird deshalb hier, einmal
 * fuer alle Listen.
 */
export function useDataTableLabels(): DataTableLabels {
  const { t } = useTranslation();
  return {
    search: t('common:action.search'),
    columns: t('common:action.columns'),
    export: t('common:action.export'),
    of: t('common:table.of'),
    rows: t('common:table.rows'),
    previous: t('common:table.previous'),
    next: t('common:table.next'),
  };
}
