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
            <li key={step.title} className="flex gap-5">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
              >
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {step.title}.{' '}
                  <span className="font-normal text-muted-foreground">{step.text}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
