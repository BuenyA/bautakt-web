import Link from 'next/link';
import type { ReactNode } from 'react';

import { t } from '@/lib/i18n';

export function PageIntro({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-intro">
      <p className="eyeline">
        <span />
        {label}
      </p>
      <h1>{title}</h1>
      {description && <p className="page-description">{description}</p>}
    </div>
  );
}
export function ContactStrip({ children }: { children?: ReactNode }) {
  return (
    <section className="contact-strip">
      <p>{children ?? t('site:action.talk')}</p>
      <Link href="/kontakt">
        {t('site:action.talk')} <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
export function LegalDocument({ kind }: { kind: 'imprint' | 'privacy' | 'terms' }) {
  const headings = t(`site:legal.${kind}Sections`, { returnObjects: true }) as string[];
  return (
    <div className="interior legal-document">
      <PageIntro label={t('site:nav.legal')} title={t(`site:legal.${kind}`)} />
      <div className="legal-notice" role="note">
        <strong>{t('site:legal.note')}</strong>
        <p>{t('site:legal.explanation')}</p>
      </div>
      <div className="legal-sections">
        {headings.map((heading, index) => (
          <section key={heading}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{heading}</h2>
              <p>{t('site:legal.missing')}</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
