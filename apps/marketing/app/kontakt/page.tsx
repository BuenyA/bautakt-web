import type { Metadata } from 'next';

import { Container } from '@/components/layout/Container';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'So erreichen Sie das Team hinter Bautakt.',
  alternates: { canonical: '/kontakt' },
};

export default function KontaktPage() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          title="Kontakt"
          description="Wir melden uns in der Regel am selben Werktag."
        />
        <div className="mx-auto mt-12 max-w-md text-center">
          <p className="text-sm text-muted-foreground">E-Mail</p>
          <a
            href={`mailto:${site.supportEmail}`}
            className="text-lg font-medium text-primary hover:underline"
          >
            {site.supportEmail}
          </a>
        </div>
      </Container>
    </section>
  );
}
