import '@/lib/i18n';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lightTheme } from '@bautakt/ui';
import { FluentProvider } from '@fluentui/react-components';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ThemeContext } from '@/app/ThemeContext';
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthContext';
import { appRoutes } from '@/router';

const signedOut: AuthContextValue = {
  session: null,
  user: null,
  initializing: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  requestPasswordReset: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
};

const templatesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../supabase/templates',
);

function renderAt(path: string): string {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return renderToStaticMarkup(
    <FluentProvider theme={lightTheme}>
      <ThemeContext.Provider value={{ theme: 'light', resolved: 'light', setTheme: () => {} }}>
        <AuthContext.Provider value={signedOut}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </FluentProvider>,
  );
}

describe('Registrierung', () => {
  it('nennt die Adresse persönlich und erklärt sie über den Hilfe-Knopf', () => {
    const html = renderAt('/registrieren');

    expect(html).toContain('Persönliche E-Mail-Adresse');
    expect(html).toContain('aria-label="Hilfe zu Persönliche E-Mail-Adresse"');
    expect(html).not.toContain('auth:field.email');
    expect(html).not.toContain('>E-Mail<');
  });

  it('lässt die Anmeldung bei „E-Mail“', () => {
    const html = renderAt('/login');

    expect(html).toContain('>E-Mail<');
    expect(html).not.toContain('Persönliche E-Mail-Adresse');
    expect(html).not.toContain('Firmen-E-Mail');
  });
});

describe('Confirm-signup-Vorlage', () => {
  it('ist deutsch, nutzt ConfirmationURL und die Markenfarbe', () => {
    const subject = readFileSync(join(templatesDir, 'confirm-signup.subject.txt'), 'utf8').trim();
    const html = readFileSync(join(templatesDir, 'confirm-signup.html'), 'utf8');

    expect(subject).toBe('Bitte bestätigen Sie Ihre E-Mail-Adresse für Bautakt');
    expect(html).toContain('{{ .ConfirmationURL }}');
    expect(html).toContain('#0f6cbd');
    expect(html).toContain('E-Mail-Adresse bestätigen');
    expect(html).not.toContain('Follow this link to confirm your user');
    expect(html).not.toContain('.TokenHash');
    expect(html).not.toContain('.SiteURL');
  });
});
