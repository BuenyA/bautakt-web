import { toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Switch,
} from '@fluentui/react-components';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';

import { formatDays } from './leaveQuota';
import { useUpdateLeaveSettings } from './useEmployeeProfile';
import type { EmployeeRow } from './useEmployees';

/**
 * Eigener Urlaubsanspruch oder der des Betriebs (anteilig ab Eintritt). Ein
 * manueller Wert braucht `annual_leave_days_override_is_manual = true`, sonst
 * bleibt er wirkungslos — wie `updateEmploymentLeaveSettings` der App.
 */
export function LeaveQuotaDialog({
  employee,
  companyDays,
  year,
  open,
  onOpenChange,
}: {
  employee: EmployeeRow;
  /** Anspruch ohne eigenen Wert, schon anteilig. */
  companyDays: number;
  year: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface className="max-w-md!">
        {open ? (
          <LeaveQuotaForm
            employee={employee}
            companyDays={companyDays}
            year={year}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogSurface>
    </Dialog>
  );
}

function LeaveQuotaForm({
  employee,
  companyDays,
  year,
  onDone,
}: {
  employee: EmployeeRow;
  companyDays: number;
  year: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useUpdateLeaveSettings();
  const [manual, setManual] = useState(employee.annualLeaveDaysOverrideIsManual);
  const [days, setDays] = useState(
    String(employee.annualLeaveDaysOverride ?? companyDays).replace('.', ','),
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(days.trim().replace(',', '.'));
    if (manual && (!Number.isFinite(value) || value < 0 || value > 365 || (value * 2) % 1 !== 0)) {
      setError(t('domain:employeeProfile.leave.invalid'));
      return;
    }
    try {
      await save.mutateAsync({
        id: employee.id,
        input: {
          annualLeaveDaysOverride: manual ? value : null,
          annualLeaveDaysOverrideIsManual: manual,
        },
      });
      toast.success(t('domain:employeeProfile.leave.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:employeeProfile.leave.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      <DialogBody>
        <DialogTitle>{t('domain:employeeProfile.leave.title')}</DialogTitle>
        <DialogContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            {t('domain:employeeProfile.leave.companyDefault', {
              days: formatDays(companyDays),
              year,
            })}
          </p>
          <Switch
            checked={manual}
            label={t('domain:employeeProfile.leave.useCustom')}
            onChange={(_, data) => setManual(data.checked)}
          />
          {manual ? (
            <Field label={t('domain:employeeProfile.leave.daysLabel')} validationMessage={error}>
              <Input
                inputMode="decimal"
                value={days}
                onChange={(_, data) => {
                  setDays(data.value);
                  setError(null);
                }}
              />
            </Field>
          ) : error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button appearance="secondary" onClick={onDone}>
            {t('common:action.cancel')}
          </Button>
          <Button appearance="primary" type="submit" disabled={save.isPending}>
            {t('common:action.save')}
          </Button>
        </DialogActions>
      </DialogBody>
    </form>
  );
}
