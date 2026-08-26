import Link from 'next/link';

import { legalNav, mainNav } from '@/content/nav';
import { site } from '@/lib/site';

import { Container } from './Container';

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-background-second">
      <Container className="flex flex-col gap-8 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <p className="text-lg font-semibold">{site.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">{site.tagline}</p>
          </div>

          <nav aria-label="Produkt" className="flex flex-col gap-2">
            <p className="text-sm font-medium">Produkt</p>
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Rechtliches" className="flex flex-col gap-2">
            <p className="text-sm font-medium">Rechtliches</p>
            {legalNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="text-sm text-text-subtle">
          © {new Date().getFullYear()} {site.name}
        </p>
      </Container>
    </footer>
  );
}
