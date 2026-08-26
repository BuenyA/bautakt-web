import type { ReactNode } from 'react';

import { Container } from '@/components/layout/Container';

export default function RechtlichesLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <section className="py-20">
      <Container>
        <div
          className={[
            'mx-auto max-w-3xl',
            '[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight',
            '[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold',
            '[&_h3]:mt-6 [&_h3]:font-medium',
            '[&_p]:mt-4 [&_p]:text-muted-foreground',
            '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground',
            '[&_li]:mt-1',
          ].join(' ')}
        >
          {children}
        </div>
      </Container>
    </section>
  );
}
