import { Navigate, type RouteObject } from 'react-router';

import { ErrorBoundaryPage } from '@/components/common/ErrorBoundaryPage';
import { NotFoundPage } from '@/components/common/NotFoundPage';
import { AppShell } from '@/components/layout/AppShell';
import { AssignmentDetailPage } from '@/features/assignments/pages/AssignmentDetailPage';
import { AssignmentsListPage } from '@/features/assignments/pages/AssignmentsListPage';
import { LegacyAssignmentRedirect } from '@/features/assignments/pages/LegacyAssignmentRedirect';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/features/auth/PublicOnlyRoute';
import { CalendarPage } from '@/features/calendar/pages/CalendarPage';
import { CompanySetupPage } from '@/features/company/pages/CompanySetupPage';
import { RequirePermission } from '@/features/company/RequirePermission';
import { CompanyLayout } from '@/features/companySettings/CompanyLayout';
import { AbsenceSettingsPage } from '@/features/companySettings/pages/AbsenceSettingsPage';
import {
  BankPage,
  DatevPage,
  LegalSettingsPage,
  MailPage,
  MasterDataPage,
} from '@/features/companySettings/pages/CompanyDataPages';
import { DeleteCompanyPage } from '@/features/companySettings/pages/DeleteCompanyPage';
import { DunningSettingsPage } from '@/features/companySettings/pages/DunningSettingsPage';
import { InvoiceTemplatePage } from '@/features/companySettings/pages/InvoiceTemplatePage';
import { NumbersPage } from '@/features/companySettings/pages/NumbersPage';
import { RatesPage } from '@/features/companySettings/pages/RatesPage';
import { RolesPage } from '@/features/companySettings/pages/RolesPage';
import { SetupStatusPage } from '@/features/companySettings/pages/SetupStatusPage';
import { ContactDetailPage } from '@/features/contacts/pages/ContactDetailPage';
import { ContactsListPage } from '@/features/contacts/pages/ContactsListPage';
import { LegacyCustomerRedirect } from '@/features/contacts/pages/LegacyCustomerRedirect';
import { LegacyExpensesRedirect } from '@/features/finance/LegacyExpensesRedirect';
import { DatevExportPage } from '@/features/finance/pages/DatevExportPage';
import { DocumentEditorPage } from '@/features/finance/pages/DocumentEditorPage';
import { DunningPage } from '@/features/finance/pages/DunningPage';
import { ExpensesPage } from '@/features/finance/pages/ExpensesPage';
import { FinanceOverviewPage } from '@/features/finance/pages/FinanceOverviewPage';
import { IncomingInvoicePage } from '@/features/finance/pages/IncomingInvoicePage';
import { InvoiceDetailPage } from '@/features/finance/pages/InvoiceDetailPage';
import { InvoicePrintPage } from '@/features/finance/pages/InvoicePrintPage';
import { InvoicesListPage } from '@/features/finance/pages/InvoicesListPage';
import { QuotesListPage } from '@/features/finance/pages/QuotesListPage';
import { ReceivablesPage } from '@/features/finance/pages/ReceivablesPage';
import { ReportsPage } from '@/features/finance/pages/ReportsPage';
import { MaterialHubPage, PersonalHubPage } from '@/features/hubs/HubPage';
import { LegalPage } from '@/features/legal/LegalPage';
import { CatalogPage } from '@/features/masterdata/pages/CatalogPage';
import { CostCentersPage } from '@/features/masterdata/pages/CostCentersPage';
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage';
import { OrdersListPage } from '@/features/orders/pages/OrdersListPage';
import { OverviewPage } from '@/features/overview/pages/OverviewPage';
import { AccountPage } from '@/features/profile/pages/AccountPage';
import { HelpPage } from '@/features/profile/pages/HelpPage';
import { LanguagePage } from '@/features/profile/pages/LanguagePage';
import { PersonalDataPage } from '@/features/profile/pages/PersonalDataPage';
import { ProfileLegalPage } from '@/features/profile/pages/ProfileLegalPage';
import { ProfileLayout } from '@/features/profile/ProfileLayout';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { AbsenceDetailPage } from '@/features/team/pages/AbsenceDetailPage';
import { AbsencesPage } from '@/features/team/pages/AbsencesPage';
import { EmployeeDetailPage } from '@/features/team/pages/EmployeeDetailPage';
import { EmployeesListPage } from '@/features/team/pages/EmployeesListPage';
import { LegacyTimesRedirect } from '@/features/times/LegacyTimesRedirect';
import { HOME_ROUTE, routes } from '@/lib/routes';

/**
 * React Router im Data Mode.
 *
 * Bewusst nicht im Framework-Mode: der bringt einen Server-Build mit und
 * widerspricht dem statischen Deployment auf Vercel (siehe vercel.json, dort
 * wird alles auf index.html umgeschrieben).
 *
 * Die Guards sind Komponenten und keine Loader. Loader laufen ausserhalb von
 * React und koennen den AuthProvider-Context nicht lesen.
 *
 * Die Bereiche, deren Inhalt noch entsteht, haengen bereits als Platzhalter im
 * Baum — samt Rechte-Waechter. So laesst sich die Navigation vollstaendig
 * pruefen, bevor die Seiten da sind.
 */
export const appRoutes: RouteObject[] = [
  {
    errorElement: <ErrorBoundaryPage />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: routes.login, element: <LoginPage /> },
          { path: routes.register, element: <RegisterPage /> },
          { path: routes.forgotPassword, element: <ForgotPasswordPage /> },
        ],
      },

      // Bewusst ohne PublicOnlyRoute: der Link aus der Mail traegt bereits eine
      // Recovery-Session, ein Redirect wuerde die Seite unerreichbar machen.
      { path: routes.resetPassword, element: <ResetPasswordPage /> },

      // Rechtsseiten: weder PublicOnlyRoute (Angemeldete sollen sie öffnen
      // können) noch ProtectedRoute (ohne Sitzung kein Sprung zum Login).
      { path: routes.imprint, element: <LegalPage page="imprint" /> },
      { path: routes.privacy, element: <LegalPage page="privacy" /> },

      {
        element: <ProtectedRoute />,
        children: [
          { path: routes.companySetup, element: <CompanySetupPage /> },
          // Druckansicht bewusst ausserhalb der Shell: auf Papier gehoert kein
          // Menue. Der Schutz durch ProtectedRoute bleibt.
          {
            path: `${routes.financeHub}/:id/druck`,
            element: (
              <RequirePermission anyOf={['canUseBillingModule', 'canViewManagementInvoices']}>
                <InvoicePrintPage />
              </RequirePermission>
            ),
          },
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to={HOME_ROUTE} replace /> },
              { path: routes.overview, element: <OverviewPage /> },

              // --- Arbeit ---
              { path: routes.orders, element: <OrdersListPage /> },
              { path: `${routes.orders}/:id`, element: <OrderDetailPage /> },
              { path: routes.assignments, element: <AssignmentsListPage /> },
              { path: `${routes.assignments}/:id`, element: <AssignmentDetailPage /> },
              { path: routes.calendar, element: <CalendarPage /> },

              // --- Rechnungen: Übersicht und Listen. Die Reiter stehen im Kopf
              // jeder Seite (`FinanceHeader`), unter der Überschrift. ---
              { path: routes.financeHub, element: <FinanceOverviewPage /> },
              {
                path: routes.quotes,
                element: (
                  <RequirePermission anyOf={['canUseBillingModule', 'canViewManagementInvoices']}>
                    <QuotesListPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.invoices,
                element: (
                  <RequirePermission anyOf={['canUseBillingModule', 'canViewManagementInvoices']}>
                    <InvoicesListPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.receivables,
                element: (
                  <RequirePermission anyOf={['canViewCompanyFinance']}>
                    <ReceivablesPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.expenses,
                element: (
                  <RequirePermission anyOf={['canViewCompanyFinance', 'canManageOverheadCosts']}>
                    <ExpensesPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.incomingInvoiceNew,
                element: (
                  <RequirePermission anyOf={['canManageOverheadCosts']}>
                    <IncomingInvoicePage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.incomingInvoice(':id'),
                element: (
                  <RequirePermission anyOf={['canManageOverheadCosts']}>
                    <IncomingInvoicePage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.dunning,
                element: (
                  <RequirePermission anyOf={['canUseBillingModule', 'canViewCompanyFinance']}>
                    <DunningPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.reports,
                element: (
                  <RequirePermission anyOf={['canViewCompanyFinance']}>
                    <ReportsPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.datevExport,
                element: (
                  <RequirePermission
                    anyOf={[
                      'canUseBillingModule',
                      'canViewCompanyFinance',
                      'canViewManagementInvoices',
                    ]}
                  >
                    <DatevExportPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.invoiceNew,
                element: (
                  <RequirePermission anyOf={['canUseBillingModule']}>
                    <DocumentEditorPage type="invoice" />
                  </RequirePermission>
                ),
              },
              {
                path: routes.quoteNew,
                element: (
                  <RequirePermission anyOf={['canUseBillingModule']}>
                    <DocumentEditorPage type="quote" />
                  </RequirePermission>
                ),
              },
              {
                path: `${routes.financeHub}/:id/bearbeiten`,
                element: (
                  <RequirePermission anyOf={['canUseBillingModule']}>
                    <DocumentEditorPage type="invoice" />
                  </RequirePermission>
                ),
              },
              {
                path: `${routes.financeHub}/:id`,
                element: (
                  <RequirePermission anyOf={['canUseBillingModule', 'canViewManagementInvoices']}>
                    <InvoiceDetailPage />
                  </RequirePermission>
                ),
              },

              // --- Team: Hub, Verzeichnis bleibt `/mitarbeiter` ---
              { path: routes.personalHub, element: <PersonalHubPage /> },
              {
                path: routes.employees,
                element: (
                  <RequirePermission anyOf={['canManageEmployees']}>
                    <EmployeesListPage />
                  </RequirePermission>
                ),
              },
              {
                path: `${routes.employees}/:id`,
                element: (
                  <RequirePermission anyOf={['canManageEmployees']}>
                    <EmployeeDetailPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.absences,
                element: (
                  <RequirePermission anyOf={['canManageAbsences']}>
                    <AbsencesPage />
                  </RequirePermission>
                ),
              },
              {
                path: `${routes.absences}/:id`,
                element: (
                  <RequirePermission anyOf={['canManageAbsences']}>
                    <AbsenceDetailPage />
                  </RequirePermission>
                ),
              },

              // --- Kontakte direkt, Material als Hub ---
              // Lesen dürfen alle Mitglieder (RLS); Anlegen und Ändern prüft
              // die Seite über canManageCustomers / canManageSuppliers.
              { path: routes.materialHub, element: <MaterialHubPage /> },
              { path: routes.contacts, element: <ContactsListPage /> },
              { path: `${routes.contacts}/:id`, element: <ContactDetailPage /> },
              // --- Profilmenü unten links: Mein Profil, Unternehmen, Einstellungen ---
              {
                path: routes.profile,
                element: <ProfileLayout />,
                children: [
                  // Breit leitet das Layout auf den ersten Abschnitt um, schmal zeigt es die Liste.
                  { index: true, element: null },
                  { path: routes.profilePersonal, element: <PersonalDataPage /> },
                  { path: routes.profileAccount, element: <AccountPage /> },
                  { path: routes.profileLanguage, element: <LanguagePage /> },
                  { path: routes.profileHelp, element: <HelpPage /> },
                  { path: routes.profileLegal, element: <ProfileLegalPage /> },
                ],
              },
              {
                // Jeder Abschnitt prüft seine Rechte selbst (`SectionGuard`).
                path: routes.company,
                element: <CompanyLayout />,
                children: [
                  { index: true, element: null },
                  { path: routes.companySetupStatus, element: <SetupStatusPage /> },
                  { path: routes.companyMasterData, element: <MasterDataPage /> },
                  { path: routes.companyLegal, element: <LegalSettingsPage /> },
                  { path: routes.companyBank, element: <BankPage /> },
                  { path: routes.companyNumbers, element: <NumbersPage /> },
                  { path: routes.companyInvoiceTemplate, element: <InvoiceTemplatePage /> },
                  { path: routes.companyDunning, element: <DunningSettingsPage /> },
                  { path: routes.companyRates, element: <RatesPage /> },
                  {
                    path: routes.costCenters,
                    element: (
                      <RequirePermission anyOf={['canManageCostCenters']}>
                        <CostCentersPage />
                      </RequirePermission>
                    ),
                  },
                  {
                    path: routes.catalog,
                    element: (
                      <RequirePermission anyOf={['canManageCatalog']}>
                        <CatalogPage />
                      </RequirePermission>
                    ),
                  },
                  { path: routes.companyMail, element: <MailPage /> },
                  { path: routes.companyDatev, element: <DatevPage /> },
                  { path: routes.companyRoles, element: <RolesPage /> },
                  { path: routes.companyAbsences, element: <AbsenceSettingsPage /> },
                  { path: routes.companyDelete, element: <DeleteCompanyPage /> },
                ],
              },
              { path: routes.settings, element: <SettingsPage /> },

              // Alte Pfade umleiten, damit Bookmarks nicht leer laufen.
              { path: routes.legacyFinance, element: <Navigate to={routes.financeHub} replace /> },
              { path: routes.legacyExpenses, element: <LegacyExpensesRedirect /> },
              { path: routes.legacyNotifications, element: <Navigate to={HOME_ROUTE} replace /> },
              {
                path: routes.legacyAssignments,
                element: <Navigate to={routes.assignments} replace />,
              },
              { path: `${routes.legacyAssignments}/:id`, element: <LegacyAssignmentRedirect /> },
              { path: routes.legacyTimes, element: <LegacyTimesRedirect /> },
              { path: routes.legacyCustomers, element: <LegacyCustomerRedirect /> },
              { path: routes.legacyCatalog, element: <Navigate to={routes.catalog} replace /> },
              {
                path: routes.legacyCostCenters,
                element: <Navigate to={routes.costCenters} replace />,
              },
              {
                path: routes.legacyPayroll,
                element: <Navigate to={routes.companyRates} replace />,
              },
              { path: `${routes.legacyCustomers}/:id`, element: <LegacyCustomerRedirect /> },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
