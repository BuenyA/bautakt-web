import { createBrowserRouter, Navigate } from 'react-router';

import { ErrorBoundaryPage } from '@/components/common/ErrorBoundaryPage';
import { NotFoundPage } from '@/components/common/NotFoundPage';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { AppShell } from '@/components/layout/AppShell';
import { AssignmentDetailPage } from '@/features/assignments/pages/AssignmentDetailPage';
import { AssignmentsListPage } from '@/features/assignments/pages/AssignmentsListPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/features/auth/PublicOnlyRoute';
import { CustomerDetailPage } from '@/features/customers/pages/CustomerDetailPage';
import { CustomersListPage } from '@/features/customers/pages/CustomersListPage';
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage';
import { OrdersListPage } from '@/features/orders/pages/OrdersListPage';
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
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to={HOME_ROUTE} replace /> },
              {
                path: routes.overview,
                element: <PlaceholderPage titleKey="common:nav.overview" />,
              },
              { path: routes.orders, element: <OrdersListPage /> },
              { path: `${routes.orders}/:id`, element: <OrderDetailPage /> },
              { path: routes.assignments, element: <AssignmentsListPage /> },
              { path: `${routes.assignments}/:id`, element: <AssignmentDetailPage /> },
              { path: routes.times, element: <TimesListPage /> },
              {
                path: routes.invoices,
                element: <PlaceholderPage titleKey="common:nav.invoices" />,
              },
              { path: routes.customers, element: <CustomersListPage /> },
              { path: `${routes.customers}/:id`, element: <CustomerDetailPage /> },
              {
                path: routes.settings,
                element: <PlaceholderPage titleKey="common:nav.settings" />,
              },

              // Alte Pfade umleiten, damit Bookmarks nicht leer laufen.
              {
                path: routes.legacyEmployees,
                element: <Navigate to={routes.settings} replace />,
              },
              {
                path: routes.legacyFinance,
                element: <Navigate to={routes.invoices} replace />,
              },
              {
                path: routes.legacyCalendar,
                element: <Navigate to={routes.assignments} replace />,
              },
              {
                path: routes.legacyNotifications,
                element: <Navigate to={HOME_ROUTE} replace />,
              },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
