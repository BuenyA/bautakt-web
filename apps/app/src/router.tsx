import { createBrowserRouter, Navigate } from 'react-router';

import { ErrorBoundaryPage } from '@/components/common/ErrorBoundaryPage';
import { NotFoundPage } from '@/components/common/NotFoundPage';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { AppShell } from '@/components/layout/AppShell';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/features/auth/PublicOnlyRoute';
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
              { path: routes.orders, element: <PlaceholderPage titleKey="common:nav.orders" /> },
              {
                path: routes.customers,
                element: <PlaceholderPage titleKey="common:nav.customers" />,
              },
              {
                path: routes.employees,
                element: <PlaceholderPage titleKey="common:nav.employees" />,
              },
              { path: routes.finance, element: <PlaceholderPage titleKey="common:nav.finance" /> },
              {
                path: routes.calendar,
                element: <PlaceholderPage titleKey="common:nav.calendar" />,
              },
              {
                path: routes.notifications,
                element: <PlaceholderPage titleKey="common:nav.notifications" />,
              },
              {
                path: routes.settings,
                element: <PlaceholderPage titleKey="common:nav.settings" />,
              },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
