import type { Metadata } from 'next';

import { LegalDocument } from '@/components/cinema/Interior';
import { t } from '@/lib/i18n';
export const metadata: Metadata = {
  title: t('site:legal.imprint'),
  robots: { index: false, follow: false },
  alternates: { canonical: '/impressum' },
};
export default function ImprintPage() {
  return <LegalDocument kind="imprint" />;
}
