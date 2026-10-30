import type { PermissionKey } from '@bautakt/core';

/**
 * Rechte in Gruppen, Reihenfolge wie `PERMISSION_GROUPS` der App
 * (`lib/employees/permissions.ts`, Stand 2026-10-30). Texte stehen unter
 * `domain:employeeProfile.permissions`.
 */
export const PERMISSION_GROUPS: { id: string; keys: PermissionKey[] }[] = [
  {
    id: 'site',
    keys: [
      'canTrackTime',
      'canTrackTimeForTeam',
      'canCreateAndViewReports',
      'canRecordMaterials',
      'canViewChecklist',
      'canEditChecklist',
      'canViewNotes',
      'canCreateNotes',
      'canTakePhotos',
    ],
  },
  {
    id: 'documents',
    keys: ['canViewDocuments', 'canUploadAndEditDocuments'],
  },
  {
    id: 'orders',
    keys: [
      'canCreateOrders',
      'canManageOrders',
      'canCompleteOrders',
      'canManageAllCalendar',
      'canManageWorkAssignments',
    ],
  },
  {
    id: 'finance',
    keys: [
      'canUseBillingModule',
      'canViewManagementInvoices',
      'canViewOrderFinance',
      'canViewWageCosts',
      'canManageRates',
      'canManageOverheadCosts',
      'canViewCompanyFinance',
    ],
  },
  {
    id: 'company',
    keys: [
      'canManageCustomers',
      'canManageSuppliers',
      'canManageCostCenters',
      'canManageEmployees',
      'canManageAbsences',
      'canManageRoles',
      'canSendNotifications',
      'canEditCompanyMasterData',
      'canManageCompanySettings',
      'canManageCatalog',
      'canManageLicenses',
    ],
  },
];
