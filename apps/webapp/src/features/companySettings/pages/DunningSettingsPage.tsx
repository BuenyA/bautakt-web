import { SkeletonBlock } from '@bautakt/ui';
import { Field, Input, MessageBar, MessageBarBody, Switch, Text } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';

import { useCompanyAccess } from '../companyAccess';
import { useCardForm, useSave, useUpdateCompany } from '../companyForm';
import { FormCard } from '../FormCard';
import { SectionGuard } from '../SectionGuard';
import { type CompanyRecord, useCompanyRecord } from '../useCompanyRecord';

/**
 * Stufen in ihrer Reihenfolge, mit Spalten und Vorschlagswerten wie in der
 * App (`bautakt-app/app/lib/utils/companyInvoicingSettings.ts`).
 */
const STEPS = [
  {
    key: 'reminder',
    auto: 'auto_payment_reminder',
    days: 'reminder_days_after_due',
    placeholder: '19',
  },
  {
    key: 'first',
    auto: 'auto_first_dunning',
    days: 'first_dunning_days_after_due',
    placeholder: '29',
  },
  {
    key: 'second',
    auto: 'auto_second_dunning',
    days: 'second_dunning_days_after_due',
    placeholder: '39',
  },
  {
    key: 'collection',
    auto: 'auto_collection',
    days: 'collection_days_after_due',
    placeholder: '46',
  },
] as const;

type StepKey = (typeof STEPS)[number]['key'];
type Values = Record<`${StepKey}Auto`, boolean> & Record<`${StepKey}Days`, string>;

function initialValues(company: CompanyRecord): Values {
  return Object.fromEntries(
    STEPS.flatMap((step) => [
      [`${step.key}Auto`, Boolean(company[step.auto])],
      [`${step.key}Days`, company[step.days] == null ? '' : String(company[step.days])],
    ]),
  ) as Values;
}

/**
 * Regeln der App: aktive Stufen brauchen eine Frist größer 0, und die Fristen
 * steigen (Erinnerung → 1. Mahnung → 2. Mahnung → Inkasso).
 */
function validate(values: Values, t: (key: string) => string) {
  const errors: Partial<Record<keyof Values, string>> = {};
  let last = 0;
  for (const step of STEPS) {
    if (!values[`${step.key}Auto`]) continue;
    const raw = values[`${step.key}Days`].trim();
    const days = Number(raw);
    if (!raw || !Number.isInteger(days) || days <= 0) {
      errors[`${step.key}Days`] = t('companySettings:dunning.errors.required');
      continue;
    }
    if (days <= last) errors[`${step.key}Days`] = t('companySettings:dunning.errors.order');
    last = days;
  }
  return errors;
}

function DunningCard({ company, canEdit }: { company: CompanyRecord; canEdit: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateCompany();
  const form = useCardForm(initialValues(company), (v) => validate(v, t));
  const save = useSave(update, form.reset);
  const v = form.values;

  return (
    <FormCard
      title={t('companySettings:dunning.automation')}
      description={t('companySettings:dunning.automationHint')}
      canEdit={canEdit}
      dirty={form.dirty}
      saving={update.isPending}
      onReset={form.reset}
      onSave={() => {
        form.submit();
        if (form.hasErrors) return;
        const patch = Object.fromEntries(
          STEPS.flatMap((step) => {
            const auto = v[`${step.key}Auto`];
            const days = v[`${step.key}Days`].trim();
            // Wie die App: ohne Automatik keine Frist speichern.
            return [
              [step.auto, auto],
              [step.days, auto && days ? Number(days) : null],
            ];
          }),
        );
        void save(patch);
      }}
    >
      <div className="flex flex-col divide-y divide-border">
        {STEPS.map((step, index) => {
          const auto = v[`${step.key}Auto`];
          return (
            <div
              key={step.key}
              className="grid items-start gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <Text weight="semibold">
                  {index + 1}. {t(`companySettings:dunning.steps.${step.key}.label`)}
                </Text>
                <Text className="text-muted-foreground">
                  {t(`companySettings:dunning.steps.${step.key}.hint`)}
                </Text>
                <Switch
                  checked={auto}
                  disabled={!canEdit}
                  label={t('companySettings:dunning.auto')}
                  onChange={(_, d) =>
                    form.set({
                      [`${step.key}Auto`]: d.checked,
                      // Beim Einschalten den Vorschlag eintragen, wenn leer.
                      ...(d.checked && !v[`${step.key}Days`]
                        ? { [`${step.key}Days`]: step.placeholder }
                        : {}),
                    } as Partial<Values>)
                  }
                />
              </div>
              <Field
                label={t('companySettings:dunning.days')}
                validationMessage={form.errorFor(`${step.key}Days`)}
                className="w-44"
              >
                <Input
                  value={v[`${step.key}Days`]}
                  inputMode="numeric"
                  placeholder={step.placeholder}
                  disabled={!canEdit || !auto}
                  contentAfter={<Text>{t('companySettings:numbers.daysUnit')}</Text>}
                  onChange={(_, d) =>
                    form.set({ [`${step.key}Days`]: d.value.replace(/\D/g, '') } as Partial<Values>)
                  }
                />
              </Field>
            </div>
          );
        })}
      </div>
    </FormCard>
  );
}

/**
 * Mahnwesen: ab wann Bautakt erinnert und mahnt. Die Fristen zählen ab
 * Fälligkeit; die Mahnungen selbst stehen unter Rechnungen → Mahnwesen.
 */
export function DunningSettingsPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const { data, isLoading } = useCompanyRecord();

  return (
    <SectionGuard allowed={access.invoicing.view}>
      <SubPage
        title={t('companySettings:dunning.title')}
        description={t('companySettings:dunning.description')}
      >
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>{t('companySettings:dunning.info')}</MessageBarBody>
        </MessageBar>
        {isLoading || !data ? (
          <SkeletonBlock className="h-80 w-full" />
        ) : (
          <DunningCard
            key={JSON.stringify(initialValues(data))}
            company={data}
            canEdit={access.invoicing.edit}
          />
        )}
      </SubPage>
    </SectionGuard>
  );
}
