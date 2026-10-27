import '@/lib/i18n';

import { readFileSync } from 'node:fs';

import { lightTheme } from '@bautakt/ui';
import { FluentProvider } from '@fluentui/react-components';
import { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ThemeContext } from '@/app/ThemeContext';
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthContext';
import { MarkdownDocument } from '@/features/legal/MarkdownDocument';
import { LEGAL_PAGES, legalPath } from '@/lib/legal';
import { appRoutes } from '@/router';

const MAPS_SENTENCE =
  'Über den Link „Maps“ beim Einsatzort im Einsatzplan können Sie eine Adresse in Google Maps öffnen.';

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

function componentName(element: ReactNode): string {
  if (!isValidElement(element)) return '';
  const type = element.type;
  return typeof type === 'function' ? type.name : '';
}

function routeAncestry(routes: RouteObject[], path: string, stack: string[] = []): string[] | null {
  for (const route of routes) {
    const name = componentName(route.element);
    const next = name ? [...stack, name] : stack;
    if (route.path === path) return next;
    if (route.children) {
      const hit = routeAncestry(route.children, path, next);
      if (hit) return hit;
    }
  }
  return null;
}

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

describe('Rechtsseiten ohne Sitzung', () => {
  it('hängen nicht an den Auth-Guards', () => {
    for (const path of ['/impressum', '/datenschutz']) {
      const names = routeAncestry(appRoutes, path);
      expect(names).toContain('LegalPage');
      expect(names).not.toContain('ProtectedRoute');
      expect(names).not.toContain('PublicOnlyRoute');
    }
  });

  it('rendert Impressum und Datenschutz, nicht die Anmeldung', () => {
    const imprint = renderAt('/impressum');
    const privacy = renderAt('/datenschutz');

    expect(imprint).toContain('Impressum');
    expect(imprint).toContain('Zur Anmeldung');
    expect(imprint).toContain('{{TELEFON}}');
    expect(imprint).toContain('<br');
    expect(imprint).not.toContain('Melde dich mit deinem Bautakt-Konto');
    expect(imprint).not.toContain('{{ANSCHRIFT}}');

    expect(privacy).toContain('Datenschutzerklärung');
    expect(privacy).toContain(MAPS_SENTENCE);
    expect(privacy.match(/<table/g)).toHaveLength(2);
    expect(privacy.match(/overflow-x-auto/g)).toHaveLength(2);
    expect(privacy).toContain('bautakt_sidebar_state');
    expect(privacy).toContain('bautakt-theme');
    expect(privacy).toContain('bautakt-calendar-settings:');
    expect(privacy).toContain('sb-…-auth-token');
    expect(privacy).toContain('sb-…-code-verifier');
    expect(privacy).toContain('<br');
    expect(privacy).not.toContain('{{ANSCHRIFT}}');
    expect(privacy).not.toContain('{{TELEFON}}');
    expect(privacy).not.toContain('Melde dich mit deinem Bautakt-Konto');
  });

  it('lässt eine geschützte Route ohne Sitzung leer', () => {
    const html = renderAt('/uebersicht');
    expect(html).not.toContain('Impressum');
    expect(html).not.toContain('Datenschutzerklärung');
  });

  it('verlinkt AGB nicht', () => {
    expect(LEGAL_PAGES).toEqual(['imprint', 'privacy']);
    expect(legalPath('terms')).toBeNull();
  });

  it('der SPA-Rewrite fängt Unterrouten ab', () => {
    const vercel = JSON.parse(
      readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'),
    ) as {
      rewrites: { source: string; destination: string }[];
    };
    expect(vercel.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' });
  });
});

describe('Markdown', () => {
  function html(source: string): string {
    return renderToStaticMarkup(
      <FluentProvider theme={lightTheme}>
        <MarkdownDocument source={source} />
      </FluentProvider>,
    );
  }

  it('behält Zeilenumbrüche und markiert den offenen Platzhalter', () => {
    const rendered = html('Firma\nZeile zwei\nTelefon: {{TELEFON}}');
    expect(rendered).toContain('<br');
    expect(rendered).toContain('{{TELEFON}}');
    expect(rendered).not.toContain('{{ANSCHRIFT}}');
  });

  it('öffnet https und mailto in einem neuen Tab und verwirft javascript', () => {
    const rendered = html(
      '[Seite](https://example.com) und [Mail](mailto:a@b.example)\n\n[nein](javascript:alert(1))',
    );
    expect(rendered).toContain('href="https://example.com"');
    expect(rendered).toContain('href="mailto:a@b.example"');
    expect(rendered).toContain('target="_blank"');
    expect(rendered).toContain('rel="noopener noreferrer"');
    expect(rendered).not.toContain('javascript:');
  });

  it('lässt HTML-Rohtext nicht als Markup durch', () => {
    const rendered = html('<script>alert(1)</script>');
    expect(rendered).not.toContain('<script>');
  });

  it('macht die Tabelle horizontal scrollbar', () => {
    const rendered = html('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(rendered).toContain('overflow-x-auto');
    expect(rendered).toContain('w-full');
    expect(rendered).not.toContain('w-max');
    expect(rendered).toContain('<table');
  });
});
