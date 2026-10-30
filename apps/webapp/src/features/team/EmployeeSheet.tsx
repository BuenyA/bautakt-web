import {
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import { Button, DrawerBody, DrawerHeader, Input, Label, Select } from '@fluentui/react-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import type { EmployeeDraft } from './employeeDraft';
import { useCompanyRoles } from './useCompanyRoles';

/**
 * Mitarbeiter aendern.
 *
 * Neu angelegt wird auf der eigenen Seite (`EmployeeNewPage`) — wie in der
 * App per QR-Code, Code oder ohne Konto.
 *
 * Der Name geht ueber `display_*`, nicht ueber das Profil: das Profil gehoert
 * der Person, die Anzeige im Betrieb dem Betrieb.
 */
function useSaveEmployee() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: EmployeeDraft & { id: string }) => {
      const { error } = await supabase
        .from('employments')
        .update({
          display_first_name: draft.firstName.trim() || null,
          display_last_name: draft.lastName.trim() || null,
          job_title: draft.jobTitle.trim() || null,
          contact_email: draft.email.trim() || null,
          contact_phone: draft.phone.trim() || null,
          role: draft.role,
        })
        .eq('id', draft.id)
        .eq('company_id', companyId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employments', companyId] });
    },
  });
}

export function EmployeeSheet({
  draft,
  open,
  onOpenChange,
}: {
  draft: EmployeeDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormDrawer open={open} onOpenChange={onOpenChange}>
      {open && draft ? <EmployeeForm initial={draft} onDone={() => onOpenChange(false)} /> : null}
    </FormDrawer>
  );
}

function EmployeeForm({ initial, onDone }: { initial: EmployeeDraft; onDone: () => void }) {
  const roleFieldId = useId();
  const { t } = useTranslation();
  const save = useSaveEmployee();
  const roles = useCompanyRoles();
  const ids = { first: useId(), last: useId(), job: useId(), email: useId(), phone: useId() };

  const [draft, setDraft] = useState<EmployeeDraft>(initial);
  const [error, setError] = useState<string | null>(null);

  function set(patch: Partial<EmployeeDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!`${draft.firstName}${draft.lastName}`.trim()) {
      setError(t('domain:employeeForm.nameRequired'));
      return;
    }
    if (!draft.role) {
      setError(t('domain:employeeForm.roleRequired'));
      return;
    }

    if (!draft.id) return;

    try {
      await save.mutateAsync({ ...draft, id: draft.id });
      toast.success(t('domain:employeeForm.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:employeeForm.saveError'));
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {t('domain:employeeForm.editTitle')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:employeeForm.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.first}>{t('domain:contactForm.firstName')}</Label>
            <Input
              id={ids.first}
              value={draft.firstName}
              onChange={(event) => set({ firstName: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.last}>{t('domain:contactForm.lastName')}</Label>
            <Input
              id={ids.last}
              value={draft.lastName}
              onChange={(event) => set({ lastName: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={roleFieldId}>{t('domain:employees.columns.role')}</Label>
          <Select
            id={roleFieldId}
            value={draft.role}
            onChange={(_, { value }) => set({ role: value })}
          >
            <option value="" disabled>
              {t('domain:timeForm.choose')}
            </option>
            {(roles.data ?? []).map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.job}>{t('domain:employees.columns.jobTitle')}</Label>
          <Input
            id={ids.job}
            value={draft.jobTitle}
            onChange={(event) => set({ jobTitle: event.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.email}>{t('domain:employees.columns.email')}</Label>
            <Input
              id={ids.email}
              type="email"
              value={draft.email}
              onChange={(event) => set({ email: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.phone}>{t('domain:employees.columns.phone')}</Label>
            <Input
              id={ids.phone}
              type="tel"
              value={draft.phone}
              onChange={(event) => set({ phone: event.target.value })}
            />
          </div>
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </DrawerBody>

      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={save.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}
