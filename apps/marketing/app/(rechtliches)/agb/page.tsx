import type { Metadata } from 'next';

import { LegalDocument } from '@/components/cinema/Interior';
import { t } from '@/lib/i18n';
export const metadata: Metadata = {
  title: t('site:legal.terms'),
  robots: { index: false, follow: false },
  alternates: { canonical: '/agb' },
};
export default function TermsPage() {
  return <LegalDocument kind="terms" />;
}
