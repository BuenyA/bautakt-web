import { SkeletonBlock, toast } from '@bautakt/ui';
import { Field, Input, Switch, Text } from '@fluentui/react-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';
import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import { useCompanyAccess } from '../companyAccess';
import { useCardForm } from '../companyForm';
import { FormCard } from '../FormCard';
import { SectionGuard } from '../SectionGuard';

type AbsenceSettings = { annualLeaveDays: number; countsWeekendsAsLeave: boolean };

/** Standard der App, solange der Betrieb keine Zeile hat. */
const DEFAULTS: AbsenceSettings = { annualLeaveDays: 24, countsWeekendsAsLeave: false };

function useAbsenceSettings() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['company-absence-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<AbsenceSettings> => {
      const { data, error } = await supabase
        .from('company_absence_settings')
        .select('annual_leave_days, counts_weekends_as_leave')
        .eq('company_id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            annualLeaveDays: Number(data.annual_leave_days),
            countsWeekendsAsLeave: data.counts_weekends_as_leave,
          }
        : DEFAULTS;
    },
  });
}

function useSaveAbsenceSettings() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useMutation({
    mutationFn: async (next: AbsenceSettings) => {
      const { error } = await supabase.from('company_absence_settings').upsert(
        [
          {
            company_id: companyId!,
            annual_leave_days: next.annualLeaveDays,
            counts_weekends_as_leave: next.countsWeekendsAsLeave,
            modified_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'company_id' },
      );
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['company-absence-settings', companyId] }),
  });
}

/** 0 bis 365, halbe Tage erlaubt — wie `validateAnnualLeaveDays` der App. */
function parseDays(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const days = Number(trimmed);
  return Number.isFinite(days) && days >= 0 && days <= 365 ? days : null;
}

function LeaveCard({ settings, canEdit }: { settings: AbsenceSettings; canEdit: boolean }) {
  const { t } = useTranslation();
  const save = useSaveAbsenceSettings();
  const form = useCardForm(
    {
      days: String(settings.annualLeaveDays).replace('.', ','),
      weekends: settings.countsWeekendsAsLeave,
    },
    (v) => ({
      days: parseDays(v.days) === null ? t('companySettings:absences.daysInvalid') : undefined,
    }),
  );
  const v = form.values;

  return (
    <FormCard
      title={t('companySettings:absences.leave')}
      description={t('companySettings:absences.leaveHint')}
      canEdit={canEdit}
      dirty={form.dirty}
      saving={save.isPending}
      onReset={form.reset}
      onSave={() => {
        form.submit();
        const days = parseDays(v.days);
        if (days === null) return;
        save.mutate(
          { annualLeaveDays: days, countsWeekendsAsLeave: v.weekends },
          {
            onSuccess: () => {
              toast.success(t('domain:settings.saved'));
              form.reset();
            },
            onError: (caught) =>
              toast.error(t('domain:settings.saveError'), {
                description: readableDbError(caught) ?? undefined,
              }),
          },
        );
      }}
    >
      <Field
        label={t('companySettings:absences.days')}
        validationMessage={form.errorFor('days')}
        className="max-w-56"
      >
        <Input
          value={v.days}
          inputMode="decimal"
          disabled={!canEdit}
          contentAfter={<Text size={200}>{t('companySettings:absences.daysUnit')}</Text>}
          onChange={(_, d) => form.set({ days: d.value.replace(/[^\d,.]/g, '') })}
        />
      </Field>
      <Field hint={t('companySettings:absences.weekendsHint')}>
        <Switch
          checked={v.weekends}
          disabled={!canEdit}
          label={t('companySettings:absences.weekends')}
          onChange={(_, d) => form.set({ weekends: d.checked })}
        />
      </Field>
    </FormCard>
  );
}

/**
 * Urlaub & Abwesenheit: Jahresurlaub und Wochenend-Regel als Standard für
 * alle. Abweichungen je Person stehen auf der Mitarbeiterseite.
 */
export function AbsenceSettingsPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const settings = useAbsenceSettings();

  return (
    <SectionGuard allowed={access.absences.view}>
      <SubPage
        title={t('companySettings:absences.title')}
        description={t('companySettings:absences.description')}
      >
        {settings.data ? (
          <LeaveCard
            key={JSON.stringify(settings.data)}
            settings={settings.data}
            canEdit={access.absences.edit}
          />
        ) : (
          <SkeletonBlock className="h-48 w-full" />
        )}
      </SubPage>
    </SectionGuard>
  );
}
