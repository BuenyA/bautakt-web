import '@/lib/i18n';
import '@/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { Providers } from '@/app/Providers';
import { BootErrorPage } from '@/components/common/BootErrorPage';
import { supabaseBootError } from '@/lib/supabase';
import { router } from '@/router';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root nicht gefunden.');

const root = createRoot(rootElement);

/**
 * Fehlende VITE_* zur Build-Zeit darf keine weisse Seite erzeugen.
 * Frueher warf `supabase.ts` beim Import — bevor React mountet.
 */
if (supabaseBootError) {
  root.render(
    <StrictMode>
      <BootErrorPage message={supabaseBootError} />
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
