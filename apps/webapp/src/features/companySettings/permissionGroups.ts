import type { PermissionKey } from '@bautakt/core';
import {
  Book20Regular,
  Briefcase20Regular,
  type FluentIcon,
  HatGraduation20Regular,
  Person20Regular,
  Ribbon20Regular,
  Wrench20Regular,
} from '@fluentui/react-icons';

/**
 * Rechte nach Gruppen, Reihenfolge wie in der App
 * (`bautakt-app/app/lib/employees/permissions.ts`, `PERMISSION_GROUPS`).
 * Titel und Beschreibung stehen im Katalog unter
 * `companySettings:permissions.<key>`.
 */
export const PERMISSION_GROUPS: { key: string; items: PermissionKey[] }[] = [
  {
    key: 'site',
    items: [
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
  { key: 'documents', items: ['canViewDocuments', 'canUploadAndEditDocuments'] },
  {
    key: 'orders',
    items: [
      'canCreateOrders',
      'canManageOrders',
      'canCompleteOrders',
      'canManageAllCalendar',
      'canManageWorkAssignments',
    ],
  },
  {
    key: 'finance',
    items: [
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
    key: 'company',
    items: [
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

/**
 * Icons eigener Rollen. Gespeichert wird der Schlüssel der App
 * (`ROLE_ICON_CHOICES`), damit beide dieselbe Rolle gleich zeigen.
 */
export const ROLE_ICONS: { value: string; icon: FluentIcon }[] = [
  { value: 'user', icon: Person20Regular },
  { value: 'hammer', icon: Wrench20Regular },
  { value: 'briefcase', icon: Briefcase20Regular },
  { value: 'badge-check', icon: Ribbon20Regular },
  { value: 'book', icon: Book20Regular },
  { value: 'graduation-cap', icon: HatGraduation20Regular },
];

export function roleIcon(icon: string | null | undefined): FluentIcon {
  return ROLE_ICONS.find((entry) => entry.value === icon)?.icon ?? Person20Regular;
}
