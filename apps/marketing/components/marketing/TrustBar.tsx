import { Container } from '@/components/layout/Container';
import { trustItems } from '@/content/trust';

export function TrustBar() {
  return (
    <section className="border-y border-border bg-background-second py-8" aria-label="Vertrauen">
      <Container>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 text-sm font-medium text-text-secondary animate-[hero-rise_0.55s_ease-out_both]"
            >
              <span
                aria-hidden
                className="inline-block size-1.5 shrink-0 rounded-full bg-[#1C1F26]/45"
              />
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
