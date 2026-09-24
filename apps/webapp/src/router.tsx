import { createBrowserRouter, Navigate } from 'react-router';

import { ErrorBoundaryPage } from '@/components/common/ErrorBoundaryPage';
import { NotFoundPage } from '@/components/common/NotFoundPage';
import { AppShell } from '@/components/layout/AppShell';
import { AssignmentDetailPage } from '@/features/assignments/pages/AssignmentDetailPage';
import { AssignmentsListPage } from '@/features/assignments/pages/AssignmentsListPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/features/auth/PublicOnlyRoute';
import { CalendarPage } from '@/features/calendar/pages/CalendarPage';
import { RequirePermission } from '@/features/company/RequirePermission';
import { CustomerDetailPage } from '@/features/customers/pages/CustomerDetailPage';
import { CustomersListPage } from '@/features/customers/pages/CustomersListPage';
import { DunningPage } from '@/features/finance/pages/DunningPage';
import { ExpensesPage } from '@/features/finance/pages/ExpensesPage';
import { InvoiceDetailPage } from '@/features/finance/pages/InvoiceDetailPage';
import { InvoicePrintPage } from '@/features/finance/pages/InvoicePrintPage';
import { InvoicesListPage } from '@/features/finance/pages/InvoicesListPage';
import { QuotesListPage } from '@/features/finance/pages/QuotesListPage';
import { ReceivablesPage } from '@/features/finance/pages/ReceivablesPage';
import { ReportsPage } from '@/features/finance/pages/ReportsPage';
import { CatalogPage } from '@/features/masterdata/pages/CatalogPage';
import { CostCentersPage } from '@/features/masterdata/pages/CostCentersPage';
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage';
import { OrdersListPage } from '@/features/orders/pages/OrdersListPage';
import { OverviewPage } from '@/features/overview/pages/OverviewPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { AbsencesPage } from '@/features/team/pages/AbsencesPage';
import { EmployeesListPage } from '@/features/team/pages/EmployeesListPage';
import { PayrollPage } from '@/features/team/pages/PayrollPage';
import { TimesListPage } from '@/features/times/pages/TimesListPage';
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
export const router = createBrowserRouter([
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

      {
        element: <ProtectedRoute />,
        children: [
          // Druckansicht bewusst ausserhalb der Shell: auf Papier gehoert kein
          // Menue. Der Schutz durch ProtectedRoute bleibt.
          {
            path: `${routes.invoices}/:id/druck`,
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
              { path: routes.times, element: <TimesListPage /> },

              // --- Finanzen ---
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
                path: `${routes.invoices}/:id`,
                element: (
                  <RequirePermission anyOf={['canUseBillingModule', 'canViewManagementInvoices']}>
                    <InvoiceDetailPage />
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

              // --- Team ---
              {
                path: routes.employees,
                element: (
                  <RequirePermission anyOf={['canManageEmployees']}>
                    <EmployeesListPage />
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
                path: routes.payroll,
                element: (
                  <RequirePermission anyOf={['canViewWageCosts', 'canManageRates']}>
                    <PayrollPage />
                  </RequirePermission>
                ),
              },

              // --- Stammdaten ---
              { path: routes.customers, element: <CustomersListPage /> },
              { path: `${routes.customers}/:id`, element: <CustomerDetailPage /> },
              {
                path: routes.catalog,
                element: (
                  <RequirePermission anyOf={['canManageCatalog']}>
                    <CatalogPage />
                  </RequirePermission>
                ),
              },
              {
                path: routes.costCenters,
                element: (
                  <RequirePermission anyOf={['canManageCostCenters']}>
                    <CostCentersPage />
                  </RequirePermission>
                ),
              },

              { path: routes.settings, element: <SettingsPage /> },

              // Alte Pfade umleiten, damit Bookmarks nicht leer laufen.
              // `/mitarbeiter` und `/kalender` sind inzwischen eigene Bereiche.
              { path: routes.legacyFinance, element: <Navigate to={routes.invoices} replace /> },
              { path: routes.legacyNotifications, element: <Navigate to={HOME_ROUTE} replace /> },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
