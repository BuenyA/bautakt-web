import { SkeletonBlock } from '@bautakt/ui';
import { Card, CardHeader, Field, Link, ProgressBar, Text } from '@fluentui/react-components';
import {
  CheckmarkCircle20Filled,
  ChevronRight16Regular,
  Circle20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useRouterLink } from '@/components/common/useRouterLink';
import { type SubNavItem, SubPage } from '@/components/layout/SubNavLayout';
import { useLegalFooterMissing } from '@/features/company/useLegalFooter';
import { SectionCard } from '@/features/contacts/SectionCard';
import { routes } from '@/lib/routes';

import { useCompanyAccess } from '../companyAccess';
import { useCompanyNavGroups } from '../companyNav';
import { type CompanyRecord, useCompanyRecord } from '../useCompanyRecord';

type Check = { key: string; done: boolean; to: string };

const filled = (...values: (string | null | undefined)[]) =>
  values.every((value) => Boolean(value?.trim()));

/**
 * Was eine Rechnung und eine Mail aus Bautakt brauchen. Dieselben Regeln wie
 * beim Freigeben (`MISSING_SELLER_TAX_ID`) und beim Versand
 * (`company_legal_footer_missing`) — die Übersicht sagt vorher, was dort
 * scheitern würde.
 */
function checksFor(company: CompanyRecord, legalMissing: readonly string[]): Check[] {
  return [
    {
      key: 'address',
      done: filled(
        company.name,
        company.street_address,
        company.postal_code,
        company.city,
        company.email,
        company.phone_number,
      ),
      to: routes.companyMasterData,
    },
    {
      key: 'tax',
      done: filled(company.tax_number) || filled(company.vat_id),
      to: routes.companyLegal,
    },
    { key: 'register', done: legalMissing.length === 0, to: routes.companyLegal },
    { key: 'bank', done: filled(company.iban, company.bank_name), to: routes.companyBank },
    { key: 'logo', done: filled(company.logo_image_url), to: routes.companyInvoiceTemplate },
  ];
}

function CheckRow({ check }: { check: Check }) {
  const { t } = useTranslation();
  const link = useRouterLink(check.to);
  return (
    <li>
      <a
        href={link.href}
        onClick={link.onClick}
        className="hover:bg-muted flex items-center gap-3 rounded-md px-2 py-2 no-underline"
      >
        {check.done ? (
          <CheckmarkCircle20Filled className="text-success shrink-0" aria-hidden />
        ) : (
          <Circle20Regular className="text-muted-foreground shrink-0" aria-hidden />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <Text weight={check.done ? 'regular' : 'semibold'}>
            {t(`companySettings:overview.checks.${check.key}.title`)}
          </Text>
          {check.done ? null : (
            <Text size={200} className="text-muted-foreground">
              {t(`companySettings:overview.checks.${check.key}.hint`)}
            </Text>
          )}
        </span>
        <span className="sr-only">
          {t(check.done ? 'companySettings:overview.done' : 'companySettings:overview.open')}
        </span>
        <ChevronRight16Regular className="text-muted-foreground shrink-0" aria-hidden />
      </a>
    </li>
  );
}

/** Kachel wie im Hub: der Titel ist ein echter Link, ein Klick auf die Karte führt mit. */
function SectionTile({ item }: { item: SubNavItem }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const link = useRouterLink(item.to);
  const Icon = item.icon;
  const key = item.labelKey.replace('companySettings:nav.', '');
  return (
    <Card size="small" appearance="filled-alternative" onClick={() => navigate(item.to)}>
      <CardHeader
        image={<Icon className="text-brand" />}
        header={
          <Link
            href={link.href}
            appearance="subtle"
            onClick={(event) => {
              event.stopPropagation();
              link.onClick(event);
            }}
          >
            <Text weight="semibold">{t(item.labelKey)}</Text>
          </Link>
        }
        description={
          <Text size={200} className="text-muted-foreground">
            {t(`companySettings:overview.tiles.${key}`)}
          </Text>
        }
      />
    </Card>
  );
}

/**
 * Startseite des Unternehmensbereichs: der Einrichtungsstand für Rechnungen
 * und Mails, darunter alle Abschnitte, die der Angemeldete sehen darf.
 */
export function CompanyOverviewPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const company = useCompanyRecord();
  const legal = useLegalFooterMissing();
  const groups = useCompanyNavGroups();
  const sections = groups
    // Die Gefahrenzone gehört nicht zwischen die Kacheln; sie bleibt in der Leiste.
    .filter((group) => group.titleKey && group.titleKey !== 'companySettings:nav.groupDanger')
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.visible !== false),
    }))
    .filter((group) => group.items.length > 0);

  const checks =
    company.data && access.masterData.view ? checksFor(company.data, legal.data ?? []) : [];
  const done = checks.filter((check) => check.done).length;

  return (
    <SubPage
      title={t('companySettings:overview.title')}
      description={t('companySettings:overview.description')}
      wide
    >
      {access.masterData.view ? (
        <div className="max-w-3xl">
          <SectionCard
            title={t('companySettings:overview.setup')}
            description={t('companySettings:overview.setupHint')}
          >
            {company.isLoading || legal.isLoading ? (
              <SkeletonBlock className="h-56 w-full" />
            ) : (
              <>
                <Field
                  validationMessage={t('companySettings:overview.progress', {
                    done,
                    total: checks.length,
                  })}
                  validationState={done === checks.length ? 'success' : 'none'}
                >
                  <ProgressBar
                    value={checks.length ? done / checks.length : 0}
                    thickness="large"
                    color={done === checks.length ? 'success' : 'brand'}
                  />
                </Field>
                <ul className="flex flex-col">
                  {checks.map((check) => (
                    <CheckRow key={check.key} check={check} />
                  ))}
                </ul>
              </>
            )}
          </SectionCard>
        </div>
      ) : null}

      {sections.map((group) => (
        <section key={group.titleKey} className="flex flex-col gap-2">
          <Text as="h2" size={400} weight="semibold">
            {t(group.titleKey!)}
          </Text>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <SectionTile key={item.to} item={item} />
            ))}
          </div>
        </section>
      ))}
    </SubPage>
  );
}
