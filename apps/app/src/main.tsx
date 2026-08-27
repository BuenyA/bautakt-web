import '@/lib/i18n';
import '@/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { Providers } from '@/app/Providers';
import { router } from '@/router';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root nicht gefunden.');

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
