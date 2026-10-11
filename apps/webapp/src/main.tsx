import '@/lib/i18n';
import '@/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { Providers } from '@/app/Providers';
import { ThemeProvider } from '@/app/ThemeProvider';
import { BootErrorPage } from '@/components/common/BootErrorPage';
import { supabaseBootError } from '@/lib/supabase';
import { router } from '@/router';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root nicht gefunden.');

const root = createRoot(rootElement);

/**
 * Messseite für den Kalender. Nur im Dev-Server, ohne Anmeldung.
 * `import.meta.env.DEV` ist im Produktionsbuild `false`, der Import fällt weg.
 */
if (import.meta.env.DEV && window.location.pathname.startsWith('/dev/datum')) {
  void import('@/dev/DatePickerHarness').then(({ DatePickerHarness }) => {
    root.render(
      <StrictMode>
        <ThemeProvider>
          <DatePickerHarness />
        </ThemeProvider>
      </StrictMode>,
    );
  });
} else if (supabaseBootError) {
  root.render(
    <StrictMode>
      {/* Ohne Provider gäbe es die Fluent-Variablen nicht, auf die die Klassen zeigen. */}
      <ThemeProvider>
        <BootErrorPage message={supabaseBootError} />
      </ThemeProvider>
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
}
