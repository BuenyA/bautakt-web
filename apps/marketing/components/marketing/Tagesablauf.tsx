import { Container } from '@/components/layout/Container';
import { tagesablauf } from '@/content/tagesablauf';

import { SectionHeading } from './SectionHeading';

export function Tagesablauf() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow={tagesablauf.eyebrow}
          title={tagesablauf.title}
          description={tagesablauf.intro}
        />
        <ol className="mx-auto mt-14 flex max-w-3xl flex-col gap-8">
          {tagesablauf.steps.map((step, index) => (
            <li key={step.text} className="flex gap-5">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
              >
                {index + 1}
              </span>
              <p className="text-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
