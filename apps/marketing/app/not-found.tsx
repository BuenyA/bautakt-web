import Link from 'next/link';

import { PageIntro } from '@/components/cinema/Interior';
import { t } from '@/lib/i18n';
export default function MissingPage() {
  return (
    <div className="interior missing-page">
      <PageIntro
        label={t('site:missing.label')}
        title={t('site:missing.title')}
        description={t('site:missing.body')}
      />
      <Link className="solid-link" href="/">
        {t('site:action.back')} ↗
      </Link>
    </div>
  );
}
