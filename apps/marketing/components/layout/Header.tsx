import { Button } from '@bautakt/ui';
import Link from 'next/link';

import { mainNav } from '@/content/nav';
import { LOGIN_URL, REGISTER_URL, site } from '@/lib/site';

import { Container } from './Container';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {site.name}
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden items-center gap-6 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Externe Links: die App liegt auf einer anderen Domain, deshalb <a> statt <Link>. */}
          <Button asChild variant="ghost" size="sm">
            <a href={LOGIN_URL}>Anmelden</a>
          </Button>
          <Button asChild size="sm">
            <a href={REGISTER_URL}>Kostenlos testen</a>
          </Button>
        </div>
      </Container>
    </header>
  );
}
