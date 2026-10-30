import {
  BookTemplate20Regular,
  Box20Regular,
  Building20Regular,
  BuildingBank20Regular,
  Clock20Regular,
  DataBarVertical20Regular,
  Delete20Regular,
  Gavel20Regular,
  Key20Regular,
  Layer20Regular,
  Mail20Regular,
  NumberSymbol20Regular,
  ReceiptMoney20Regular,
  TaskListLtr20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons';

import type { SubNavGroup } from '@/components/layout/SubNavLayout';
import { routes } from '@/lib/routes';

import { useCompanyAccess } from './companyAccess';
import { useCompanySetup } from './companySetup';

/**
 * Unternehmen: alles, was den Betrieb einrichtet. Gruppen wie in der App
 * (`bautakt-app/app/lib/utils/managementHub.ts`, `SETUP_SECTIONS`), häufig
 * vor selten. Was die App erst ankündigt (Lizenzen, Integrationen,
 * Ressourcen), steht hier nicht.
 */
export function useCompanyNavGroups(): { groups: SubNavGroup[]; ready: boolean } {
  const access = useCompanyAccess();
  const setup = useCompanySetup();
  const groups: SubNavGroup[] = [
    {
      // Nur bis der Betrieb eingerichtet ist (`useCompanySetup`).
      items: [
        {
          to: routes.companySetupStatus,
          labelKey: 'companySettings:nav.setupStatus',
          icon: TaskListLtr20Regular,
          visible: setup.pending,
        },
      ],
    },
    {
      titleKey: 'companySettings:nav.groupCompany',
      items: [
        {
          to: routes.companyMasterData,
          labelKey: 'companySettings:nav.masterData',
          icon: Building20Regular,
          visible: access.masterData.view,
        },
        {
          to: routes.companyLegal,
          labelKey: 'companySettings:nav.legal',
          icon: Gavel20Regular,
          visible: access.masterData.view,
        },
        {
          to: routes.companyBank,
          labelKey: 'companySettings:nav.bank',
          icon: BuildingBank20Regular,
          visible: access.masterData.view,
        },
      ],
    },
    {
      titleKey: 'companySettings:nav.groupFinance',
      items: [
        {
          to: routes.companyNumbers,
          labelKey: 'companySettings:nav.numbers',
          icon: NumberSymbol20Regular,
          visible: access.numbers.view,
        },
        {
          to: routes.companyInvoiceTemplate,
          labelKey: 'companySettings:nav.invoiceTemplate',
          icon: BookTemplate20Regular,
          visible: access.invoicing.view,
        },
        {
          to: routes.companyDunning,
          labelKey: 'companySettings:nav.dunning',
          icon: ReceiptMoney20Regular,
          visible: access.invoicing.view,
        },
        {
          to: routes.companyRates,
          labelKey: 'companySettings:nav.rates',
          icon: Clock20Regular,
          visible: access.rates.view,
        },
        {
          to: routes.costCenters,
          labelKey: 'companySettings:nav.costCenters',
          icon: Layer20Regular,
          visible: access.costCenters.view,
        },
        {
          to: routes.catalog,
          labelKey: 'companySettings:nav.catalog',
          icon: Box20Regular,
          visible: access.catalog.view,
        },
        {
          to: routes.companyMail,
          labelKey: 'companySettings:nav.mail',
          icon: Mail20Regular,
          visible: access.mail.view,
        },
        {
          to: routes.companyDatev,
          labelKey: 'companySettings:nav.datev',
          icon: DataBarVertical20Regular,
          visible: access.datev.view,
        },
      ],
    },
    {
      titleKey: 'companySettings:nav.groupTeam',
      items: [
        {
          to: routes.companyRoles,
          labelKey: 'companySettings:nav.roles',
          icon: Key20Regular,
          visible: access.roles.view,
        },
        {
          to: routes.companyAbsences,
          labelKey: 'companySettings:nav.absences',
          icon: WeatherSunny20Regular,
          visible: access.absences.view,
        },
      ],
    },
    {
      titleKey: 'companySettings:nav.groupDanger',
      items: [
        {
          to: routes.companyDelete,
          labelKey: 'companySettings:nav.delete',
          icon: Delete20Regular,
          visible: access.danger.view,
        },
      ],
    },
  ];
  // Erst wenn der Stand feststeht, darf `/unternehmen` zum ersten Abschnitt leiten.
  return { groups, ready: !setup.isLoading };
}
