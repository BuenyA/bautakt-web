import { DangerButton, toast } from '@bautakt/ui';
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
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components';
import { Delete20Regular } from '@fluentui/react-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { SubPage } from '@/components/layout/SubNavLayout';
import { useMembership } from '@/features/company/useMembership';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { HOME_ROUTE } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { useCompanyAccess } from '../companyAccess';
import { SectionGuard } from '../SectionGuard';

/**
 * Betrieb endgültig löschen (`delete_company_as_owner`, nur Inhaber). Die
 * Datenbank löscht kaskadierend alles, was am Betrieb hängt. Danach gilt der
 * nächste Betrieb des Nutzers; ohne einen führt `MembershipGate` zur
 * Einrichtung.
 */
function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.rpc('delete_company_as_owner', { p_company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.resetQueries(),
  });
}

export function DeleteCompanyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const access = useCompanyAccess();
  const { data: membership } = useMembership();
  const remove = useDeleteCompany();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const name = membership?.companyName ?? '';
  // Erst wenn der Name exakt dasteht — ein versehentlicher Klick reicht nicht.
  const confirmed = name.length > 0 && confirmation.trim() === name.trim();

  async function deleteCompany() {
    if (!membership || !confirmed) return;
    try {
      await remove.mutateAsync(membership.companyId);
      toast.success(t('companySettings:delete.done', { name }));
      void navigate(HOME_ROUTE, { replace: true });
    } catch (caught) {
      toast.error(t('companySettings:delete.error'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  }

  return (
    <SectionGuard allowed={access.danger.view}>
      <SubPage
        title={t('companySettings:delete.title')}
        description={t('companySettings:delete.description')}
      >
        <SectionCard title={t('companySettings:delete.cardTitle', { name })}>
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>
              <MessageBarTitle>{t('companySettings:delete.warningTitle')}</MessageBarTitle>
              {t('companySettings:delete.warning')}
            </MessageBarBody>
          </MessageBar>
          <ul className="text-muted-foreground list-disc pl-5 text-sm">
            <li>{t('companySettings:delete.consequences.data')}</li>
            <li>{t('companySettings:delete.consequences.team')}</li>
            <li>{t('companySettings:delete.consequences.archive')}</li>
          </ul>
          <div>
            <DangerButton icon={<Delete20Regular />} onClick={() => setOpen(true)}>
              {t('companySettings:delete.action')}
            </DangerButton>
          </div>
        </SectionCard>

        <Dialog
          open={open}
          onOpenChange={(_, data) => {
            if (remove.isPending) return;
            setOpen(data.open);
            if (!data.open) setConfirmation('');
          }}
        >
          <DialogSurface>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void deleteCompany();
              }}
            >
              <DialogBody>
                <DialogTitle>{t('companySettings:delete.confirmTitle')}</DialogTitle>
                <DialogContent className="flex flex-col gap-3">
                  <p>{t('companySettings:delete.confirmText', { name })}</p>
                  <Field label={t('companySettings:delete.confirmLabel')}>
                    <Input
                      value={confirmation}
                      autoComplete="off"
                      placeholder={name}
                      onChange={(_, d) => setConfirmation(d.value)}
                    />
                  </Field>
                </DialogContent>
                <DialogActions>
                  <Button
                    appearance="secondary"
                    disabled={remove.isPending}
                    onClick={() => {
                      setOpen(false);
                      setConfirmation('');
                    }}
                  >
                    {t('common:action.cancel')}
                  </Button>
                  <DangerButton
                    type="submit"
                    disabled={!confirmed || remove.isPending}
                    icon={remove.isPending ? <Spinner size="tiny" /> : undefined}
                  >
                    {t('companySettings:delete.confirmAction')}
                  </DangerButton>
                </DialogActions>
              </DialogBody>
            </form>
          </DialogSurface>
        </Dialog>
      </SubPage>
    </SectionGuard>
  );
}
