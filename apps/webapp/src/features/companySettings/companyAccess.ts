import { type EmployeePermissions, hasPermission } from '@bautakt/core';

import { useMembership } from '@/features/company/useMembership';

/**
 * Wer welchen Abschnitt unter „Unternehmen“ sieht und bearbeitet.
 *
 * Die Regeln spiegeln die RLS-Policies und RPCs (Stand 2026-10-30), damit
 * die Oberfläche nichts anbietet, was die Datenbank ablehnt:
 * - `companies` UPDATE: `canEditCompanyMasterData`, `canManageCompanySettings`
 *   oder Inhaber (`is_company_owner`, Rolle mit `system_key = 'owner'`).
 * - `set_document_number_start`: nur `canEditCompanyMasterData`.
 * - `set_company_labor_rate` / `set_role_labor_rate`: `canManageRates`.
 * - `company_roles`: `canManageRoles` oder Inhaber.
 * - `company_absence_settings`: `canManageAbsences`.
 * - Storage `company-images` (Logo): `canManageCompanySettings`.
 * - `delete_company_as_owner`: nur Inhaber.
 *
 * ⚠️ Führung, keine Kontrolle. Wer die Adresse kennt, ruft den Abschnitt
 * trotzdem auf — die verbindliche Grenze ist die Datenbank.
 */
export type CompanyAccess = ReturnType<typeof companyAccess>;

export function companyAccess(
  permissions: Partial<EmployeePermissions> | null | undefined,
  isOwner: boolean,
) {
  const can = (key: keyof EmployeePermissions) => hasPermission(permissions, key);

  const editCompany = isOwner || can('canEditCompanyMasterData') || can('canManageCompanySettings');
  const billing = can('canUseBillingModule');
  const finance = can('canViewCompanyFinance');

  return {
    isOwner,
    masterData: {
      view: editCompany || billing || finance,
      edit: editCompany,
    },
    numbers: {
      view: editCompany || billing,
      /** Nummernkreise: die RPC verlangt ausdrücklich dieses Recht. */
      editSequences: can('canEditCompanyMasterData'),
      edit: editCompany,
    },
    invoicing: {
      view: editCompany || billing,
      edit: editCompany,
      /** Storage `company-images` verlangt genau dieses Recht. */
      editLogo: can('canManageCompanySettings'),
    },
    rates: {
      view: can('canViewWageCosts') || can('canManageRates'),
      edit: can('canManageRates'),
      /** Kostensätze sind die empfindlichere Zahl. */
      viewCosts: can('canViewWageCosts') || can('canManageRates'),
    },
    costCenters: { view: can('canManageCostCenters') },
    catalog: { view: can('canManageCatalog') },
    mail: { view: can('canManageCompanySettings') || billing },
    datev: {
      view: can('canManageCompanySettings') || finance || billing || can('canManageOverheadCosts'),
    },
    roles: {
      view: isOwner || can('canManageRoles') || can('canManageEmployees'),
      edit: isOwner || can('canManageRoles'),
    },
    absences: { view: can('canManageAbsences'), edit: can('canManageAbsences') },
    danger: { view: isOwner },
  };
}

/** Sieht der Angemeldete irgendeinen Abschnitt? Dann gibt es den Menüpunkt. */
export function anyCompanySection(access: CompanyAccess): boolean {
  return (
    access.masterData.view ||
    access.numbers.view ||
    access.invoicing.view ||
    access.rates.view ||
    access.costCenters.view ||
    access.catalog.view ||
    access.mail.view ||
    access.datev.view ||
    access.roles.view ||
    access.absences.view ||
    access.danger.view
  );
}

export function useCompanyAccess(): CompanyAccess {
  const { data: membership } = useMembership();
  return companyAccess(membership?.permissions, membership?.systemKey === 'owner');
}
