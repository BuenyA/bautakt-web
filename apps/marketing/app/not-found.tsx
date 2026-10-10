import Link from 'next/link';

import { Container } from '@/components/layout/Container';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <section className="py-32">
      <Container className="flex flex-col items-center text-center">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Seite nicht gefunden</h1>
        <p className="mt-4 text-muted-foreground">Diese Adresse gibt es nicht (mehr).</p>
        <Link href="/" className={buttonVariants({ className: 'mt-8' })}>
          Zur Startseite
        </Link>
      </Container>
    </section>
  );
}
