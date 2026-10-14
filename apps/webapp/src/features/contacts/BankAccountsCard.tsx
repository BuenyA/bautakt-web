import {
  DangerIconButton,
  FormDrawer,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  Checkbox,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  MessageBar,
  MessageBarBody,
  Text,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular, EditRegular, StarFilled } from '@fluentui/react-icons';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import { formatIban, isValidIban, normalizeIban } from './contactModel';
import { SectionCard } from './SectionCard';
import { type ContactBankAccount, useContactBankAccounts } from './useContact';
import {
  type BankAccountDraft,
  useDeleteBankAccount,
  useSaveBankAccount,
} from './useContactDetailMutations';

/**
 * Bankverbindungen eines Kontakts. Sichtbar nur mit Finanzrecht; die
 * Seite blendet die Karte sonst ganz aus. Jede Änderung einer Lieferanten-IBAN
 * meldet die Datenbank dem Inhaber (Schutz vor Rechnungsbetrug).
 */
export function BankAccountsCard({
  contactId,
  canManage,
  isCreditor,
}: {
  contactId: string;
  canManage: boolean;
  /** Lieferant/Subunternehmer: Hinweis auf die Inhaber-Benachrichtigung. */
  isCreditor: boolean;
}) {
  const { t } = useTranslation();
  const accounts = useContactBankAccounts(contactId);
  const remove = useDeleteBankAccount();
  const [draft, setDraft] = useState<BankAccountDraft | null>(null);
  const list = accounts.data ?? [];

  async function onDelete(account: ContactBankAccount) {
    try {
      await remove.mutateAsync(account.id);
      toast.success(t('domain:bankAccounts.deleted'));
    } catch (caught) {
      toast.error(readableDbError(caught) ?? t('domain:bankAccounts.deleteError'));
    }
  }

  return (
    <SectionCard
      title={t('domain:bankAccounts.title')}
      action={
        canManage ? (
          <Button
            appearance="subtle"
            icon={<AddRegular />}
            onClick={() =>
              setDraft({
                account_holder: '',
                iban: '',
                bic: '',
                bank_name: '',
                is_default: list.length === 0,
              })
            }
          >
            {t('domain:bankAccounts.add')}
          </Button>
        ) : null
      }
    >
      {list.length === 0 ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:bankAccounts.empty')}
        </Text>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {list.map((account) => (
            <li key={account.id} className="flex items-start justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                <span className="flex items-center gap-1 font-medium tabular-nums">
                  {formatIban(account.iban)}
                  {account.is_default ? (
                    <StarFilled
                      aria-label={t('domain:bankAccounts.default')}
                      className="text-brand size-4"
                    />
                  ) : null}
                </span>
                <span className="text-muted-foreground">
                  {[account.bank_name, account.bic, account.account_holder]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              {canManage ? (
                <div className="flex shrink-0 gap-1">
                  <Button
                    appearance="subtle"
                    icon={<EditRegular />}
                    aria-label={t('common:action.edit')}
                    onClick={() => setDraft({ ...account })}
                  />
                  <DangerIconButton
                    aria-label={t('common:action.delete')}
                    icon={<DeleteRegular />}
                    onClick={() => void onDelete(account)}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <FormDrawer
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        size="small"
      >
        {draft ? (
          <BankAccountForm
            contactId={contactId}
            initial={draft}
            isCreditor={isCreditor}
            onDone={() => setDraft(null)}
          />
        ) : null}
      </FormDrawer>
    </SectionCard>
  );
}

function BankAccountForm({
  contactId,
  initial,
  isCreditor,
  onDone,
}: {
  contactId: string;
  initial: BankAccountDraft;
  isCreditor: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveBankAccount(contactId);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const set = (patch: Partial<BankAccountDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const ibanChanged =
    Boolean(initial.id) && normalizeIban(initial.iban) !== normalizeIban(draft.iban);

  /** BIC und Bank aus der IBAN nachschlagen (Edge Function `lookup-iban`). */
  async function lookup() {
    if (!isValidIban(draft.iban) || (draft.bic && draft.bank_name)) return;
    const { data } = await supabase.functions.invoke<{ bic?: string; bankName?: string }>(
      'lookup-iban',
      { body: { iban: normalizeIban(draft.iban) } },
    );
    if (data) {
      setDraft((d) => ({
        ...d,
        bic: d.bic || data.bic || '',
        bank_name: d.bank_name || data.bankName || '',
      }));
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidIban(draft.iban)) {
      setError(t('domain:bankAccounts.ibanInvalid'));
      return;
    }
    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:bankAccounts.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:bankAccounts.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {draft.id ? t('domain:bankAccounts.editTitle') : t('domain:bankAccounts.newTitle')}
        </FormDrawerTitle>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={f('iban')}>{t('domain:bankAccounts.iban')}</Label>
          <Input
            id={f('iban')}
            value={draft.iban}
            onChange={(event) => set({ iban: event.target.value })}
            onBlur={() => void lookup()}
            input={{ className: 'tabular-nums', autoComplete: 'off' }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={f('bic')}>{t('domain:bankAccounts.bic')}</Label>
            <Input id={f('bic')} value={draft.bic} onChange={(e) => set({ bic: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={f('bank')}>{t('domain:bankAccounts.bankName')}</Label>
            <Input
              id={f('bank')}
              value={draft.bank_name}
              onChange={(e) => set({ bank_name: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={f('holder')}>{t('domain:bankAccounts.holder')}</Label>
          <Input
            id={f('holder')}
            value={draft.account_holder}
            onChange={(e) => set({ account_holder: e.target.value })}
          />
        </div>
        <Checkbox
          checked={draft.is_default}
          onChange={(_, { checked }) => set({ is_default: checked === true })}
          label={t('domain:bankAccounts.default')}
        />
        {isCreditor && (ibanChanged || !initial.id) ? (
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>{t('domain:bankAccounts.fraudHint')}</MessageBarBody>
          </MessageBar>
        ) : null}
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
