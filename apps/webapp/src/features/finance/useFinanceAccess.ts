import { hasPermission } from '@bautakt/core';

import { useMembership } from '@/features/company/useMembership';

export type FinanceAccess = {
  /** Firmenweite Zahlen: Umsatz, offene Posten, Auswertungen. */
  canViewCompanyFinance: boolean;
  canReadSalesDocuments: boolean;
  canWriteSalesDocuments: boolean;
  canViewExpenses: boolean;
  canManageRates: boolean;
  /** Reicht fuer irgendeine Finanzseite? Steuert die Gruppe in der Nav. */
  canViewFinanceArea: boolean;
};

/**
 * Rechte der Finanzseiten, gebuendelt wie `useFinanceAccess` in der Handy-App.
 *
 * ⚠️ Fuehrung, keine Kontrolle: die verbindliche Grenze sind RLS und die
 * `enforce_*`-Trigger. Wer eine Adresse kennt, ruft sie trotzdem auf.
 */
export function useFinanceAccess(): FinanceAccess {
  const { data: membership } = useMembership();
  const permissions = membership?.permissions;

  const canViewCompanyFinance = hasPermission(permissions, 'canViewCompanyFinance');
  const canWriteSalesDocuments = hasPermission(permissions, 'canUseBillingModule');
  const canReadSalesDocuments =
    canWriteSalesDocuments || hasPermission(permissions, 'canViewManagementInvoices');
  const canViewExpenses =
    canViewCompanyFinance || hasPermission(permissions, 'canManageOverheadCosts');
  const canManageRates = hasPermission(permissions, 'canManageRates');

  return {
    canViewCompanyFinance,
    canReadSalesDocuments,
    canWriteSalesDocuments,
    canViewExpenses,
    canManageRates,
    canViewFinanceArea:
      canViewCompanyFinance || canReadSalesDocuments || canViewExpenses || canManageRates,
  };
}
