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
  Link,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { DoorArrowLeft20Regular, Mail20Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { SubPage } from '@/components/layout/SubNavLayout';
import { emailSchema, PASSWORD_MIN_LENGTH } from '@/features/auth/schema';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { useLeaveCompany } from '@/features/company/useMyCompanies';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { HOME_ROUTE } from '@/lib/routes';
import { SUPPORT_EMAIL } from '@/lib/support';

import { useChangeEmail } from '../useProfile';

function EmailCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const change = useChangeEmail();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const trimmed = email.trim();
  const invalid = !emailSchema.safeParse(trimmed).success;
  const same = trimmed.toLowerCase() === (user?.email ?? '').toLowerCase();
  const error = !submitted
    ? undefined
    : invalid
      ? t('validation:email')
      : same
        ? t('account:security.emailSame')
        : undefined;
  // Wartet eine Änderung auf Bestätigung, steht sie am Nutzer.
  const pending = user?.new_email ?? sentTo;

  return (
    <SectionCard title={t('account:security.email')} description={t('account:security.emailHint')}>
      <Text>
        {t('account:security.currentEmail')} <strong>{user?.email}</strong>
      </Text>
      {pending ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>{t('account:security.emailPending', { email: pending })}</MessageBarBody>
        </MessageBar>
      ) : null}
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (invalid || same) return;
          change.mutate(trimmed, {
            onSuccess: () => {
              setSentTo(trimmed);
              setEmail('');
              setSubmitted(false);
              toast.success(t('account:security.emailSent'));
            },
            onError: (caught) =>
              toast.error(t('account:security.emailError'), {
                description: readableDbError(caught) ?? undefined,
              }),
          });
        }}
      >
        <Field label={t('account:security.newEmail')} validationMessage={error}>
          <Input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(_, d) => setEmail(d.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Button
            appearance="primary"
            type="submit"
            disabled={!trimmed || change.isPending}
            icon={change.isPending ? <Spinner size="tiny" /> : undefined}
          >
            {t('account:security.changeEmail')}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function PasswordCard() {
  const { t } = useTranslation();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const tooShort = password.length < PASSWORD_MIN_LENGTH;
  const mismatch = password !== confirm;

  async function submit() {
    setSubmitted(true);
    if (tooShort || mismatch) return;
    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);
    if (error) {
      toast.error(t('account:security.passwordError'), { description: t(error) });
      return;
    }
    toast.success(t('account:security.passwordSaved'));
    setPassword('');
    setConfirm('');
    setSubmitted(false);
  }

  return (
    <SectionCard
      title={t('account:security.password')}
      description={t('account:security.passwordHint', { count: PASSWORD_MIN_LENGTH })}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label={t('account:security.newPassword')}
            validationMessage={submitted && tooShort ? t('validation:passwordMin') : undefined}
          >
            <Input
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(_, d) => setPassword(d.value)}
            />
          </Field>
          <Field
            label={t('account:security.confirmPassword')}
            validationMessage={
              submitted && !tooShort && mismatch ? t('validation:passwordMismatch') : undefined
            }
          >
            <Input
              type="password"
              value={confirm}
              autoComplete="new-password"
              onChange={(_, d) => setConfirm(d.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            appearance="primary"
            type="submit"
            disabled={!password || saving}
            icon={saving ? <Spinner size="tiny" /> : undefined}
          >
            {t('account:security.changePassword')}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

/**
 * Den aktiven Betrieb verlassen (`leave_company`). Der letzte Inhaber kann
 * das nicht — die Datenbank lehnt ab, die Meldung sagt warum.
 */
function MembershipCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: membership } = useMembership();
  const leave = useLeaveCompany();
  const [open, setOpen] = useState(false);
  if (!membership) return null;

  async function confirmLeave() {
    try {
      await leave.mutateAsync(membership!.companyId);
      toast.success(t('account:security.left', { name: membership!.companyName }));
      setOpen(false);
      void navigate(HOME_ROUTE, { replace: true });
    } catch (caught) {
      const message = String((caught as { message?: string })?.message ?? '');
      toast.error(t('account:security.leaveError'), {
        description: message.includes('last owner')
          ? t('account:security.leaveLastOwner')
          : (readableDbError(caught) ?? undefined),
      });
    }
  }

  return (
    <SectionCard
      title={t('account:security.membership')}
      description={t('account:security.membershipHint')}
    >
      <Text>
        {t('account:security.memberOf', { name: membership.companyName, role: membership.role })}
      </Text>
      <div>
        <Button icon={<DoorArrowLeft20Regular />} onClick={() => setOpen(true)}>
          {t('account:security.leave')}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={(_, d) => !leave.isPending && setOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {t('account:security.leaveTitle', { name: membership.companyName })}
            </DialogTitle>
            <DialogContent>{t('account:security.leaveText')}</DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                disabled={leave.isPending}
                onClick={() => setOpen(false)}
              >
                {t('common:action.cancel')}
              </Button>
              <DangerButton
                disabled={leave.isPending}
                icon={leave.isPending ? <Spinner size="tiny" /> : undefined}
                onClick={() => void confirmLeave()}
              >
                {t('account:security.leave')}
              </DangerButton>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </SectionCard>
  );
}

/**
 * Konto löschen geht wie in der App per Anfrage an den Support: ein Konto
 * hängt an Belegen mit Aufbewahrungsfrist, die anonymisiert statt gelöscht
 * werden müssen.
 */
function DeleteAccountCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const subject = encodeURIComponent(t('account:security.deleteMailSubject'));
  const body = encodeURIComponent(
    t('account:security.deleteMailBody', { account: user?.email ?? '' }),
  );

  return (
    <SectionCard
      title={t('account:security.deleteAccount')}
      description={t('account:security.deleteAccountHint')}
    >
      <ul className="text-muted-foreground list-disc pl-5 text-sm">
        <li>{t('account:security.deleteProfile')}</li>
        <li>{t('account:security.deleteMemberships')}</li>
        <li>{t('account:security.deleteRetention')}</li>
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          as="a"
          icon={<Mail20Regular />}
          href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}
        >
          {t('account:security.deleteRequest')}
        </Button>
        <Text size={200} className="text-muted-foreground">
          {t('account:security.deleteDirect')}{' '}
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Text>
      </div>
    </SectionCard>
  );
}

/** Konto & Sicherheit: E-Mail, Passwort, Mitgliedschaft, Konto löschen. */
export function AccountPage() {
  const { t } = useTranslation();
  return (
    <SubPage title={t('account:security.title')} description={t('account:security.description')}>
      <EmailCard />
      <PasswordCard />
      <MembershipCard />
      <DeleteAccountCard />
    </SubPage>
  );
}
