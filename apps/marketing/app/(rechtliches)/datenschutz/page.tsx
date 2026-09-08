import type { Metadata } from 'next';

import { LegalDocument } from '@/components/cinema/Interior';
import { t } from '@/lib/i18n';
export const metadata: Metadata = {
  title: t('site:legal.privacy'),
  robots: { index: false, follow: false },
  alternates: { canonical: '/datenschutz' },
};
export default function PrivacyPage() {
  return <LegalDocument kind="privacy" />;
}
