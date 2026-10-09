import Link from 'next/link';

import { Logo } from '@/components/brand/Logo';
import { mainNav } from '@/content/nav';
import { LOGIN_URL } from '@/lib/site';

import { Container } from './Container';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

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

        {/* Anmelden nur im Header, als Textlink. Kein Registrieren. */}
        <a
          href={LOGIN_URL}
          className="text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          Anmelden
        </a>
      </Container>
    </header>
  );
}
