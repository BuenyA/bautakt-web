import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  toast,
} from '@bautakt/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import type { EmployeeDraft } from './employeeDraft';

/** Rollen dieses Betriebs — die Auswahl kommt aus der Datenbank, nicht aus einer Liste im Code. */
function useCompanyRoles() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['company-roles', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_roles')
        .select('id, name, sort_order')
        .eq('company_id', companyId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Mitarbeiter anlegen oder aendern.
 *
 * ⚠️ Angelegt wird ueber `create_manual_employment`, nicht per `insert`: die
 * Funktion prueft, ob der Aufrufer diese Rolle ueberhaupt vergeben darf
 * (`can_assign_employment_role`), und haengt die Beschaeftigung an den richtigen
 * Betrieb. Ein Handwerker ohne Konto bekommt so eine Beschaeftigung ohne
 * `user_id` — eingeladen wird getrennt davon.
 *
 * Beim Aendern geht der Name ueber `display_*`, nicht ueber das Profil: das
 * Profil gehoert der Person, die Anzeige im Betrieb dem Betrieb.
 */
function useSaveEmployee() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: EmployeeDraft) => {
      if (draft.id) {
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
        return;
      }

      const { error } = await supabase.rpc('create_manual_employment', {
        p_first_name: draft.firstName.trim(),
        p_last_name: draft.lastName.trim(),
        p_role: draft.role,
        p_contact_email: draft.email.trim() || undefined,
        p_contact_phone: draft.phone.trim() || undefined,
        p_job_title: draft.jobTitle.trim() || undefined,
      });
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open && draft ? <EmployeeForm initial={draft} onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function EmployeeForm({ initial, onDone }: { initial: EmployeeDraft; onDone: () => void }) {
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

    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:employeeForm.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:employeeForm.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>
          {draft.id ? t('domain:employeeForm.editTitle') : t('domain:employeeForm.newTitle')}
        </SheetTitle>
        <SheetDescription>{t('domain:employeeForm.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.first}>{t('domain:customerForm.firstName')}</Label>
            <Input
              id={ids.first}
              value={draft.firstName}
              onChange={(event) => set({ firstName: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.last}>{t('domain:customerForm.lastName')}</Label>
            <Input
              id={ids.last}
              value={draft.lastName}
              onChange={(event) => set({ lastName: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>{t('domain:employees.columns.role')}</Label>
          <Select value={draft.role} onValueChange={(value) => set({ role: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('domain:timeForm.choose')} />
            </SelectTrigger>
            <SelectContent>
              {(roles.data ?? []).map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
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

        {!draft.id ? (
          <p className="text-text-subtle text-xs">{t('domain:employeeForm.inviteHint')}</p>
        ) : null}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {t('common:action.save')}
        </Button>
      </SheetFooter>
    </form>
  );
}
