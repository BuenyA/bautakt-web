import { Container } from '@/components/layout/Container';
import { faq } from '@/content/faq';

import { SectionHeading } from './SectionHeading';

export function Faq() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading title="Häufige Fragen" />
        <dl className="mx-auto mt-14 flex max-w-3xl flex-col gap-8">
          {faq.map((item) => (
            <div key={item.question}>
              <dt className="font-medium">{item.question}</dt>
              <dd className="mt-2 text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
