import { Card, CardHeader, Link, Text } from '@fluentui/react-components';
import { ChevronRight16Regular, DocumentText20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useRouterLink } from '@/components/common/useRouterLink';
import { SubPage } from '@/components/layout/SubNavLayout';
import { LEGAL_PAGES, type LegalPageId, legalPath } from '@/lib/legal';

function LegalLink({ page }: { page: LegalPageId }) {
  const { t } = useTranslation();
  const path = legalPath(page);
  const navigate = useNavigate();
  const link = useRouterLink(path ?? '/');
  if (!path) return null;
  return (
    <Card size="small" onClick={() => navigate(path)}>
      <CardHeader
        image={<DocumentText20Regular />}
        header={
          <Link
            href={link.href}
            appearance="subtle"
            onClick={(event) => {
              event.stopPropagation();
              link.onClick(event);
            }}
          >
            <Text weight="semibold">{t(`common:legal.${page}`)}</Text>
          </Link>
        }
        action={<ChevronRight16Regular aria-hidden />}
      />
    </Card>
  );
}

/**
 * Rechtliches: dieselben Seiten wie unter der Anmeldung. Die AGB fehlen,
 * solange es keine Seite gibt (`lib/legal.ts`).
 */
export function ProfileLegalPage() {
  const { t } = useTranslation();
  return (
    <SubPage title={t('account:legal.title')} description={t('account:legal.description')}>
      <div className="flex flex-col gap-2">
        {LEGAL_PAGES.map((page) => (
          <LegalLink key={page} page={page} />
        ))}
      </div>
    </SubPage>
  );
}
