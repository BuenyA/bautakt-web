import { Button, Input, Label } from '@fluentui/react-components';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { LinkButton } from '@/components/common/LinkButton';
import { RouterLink } from '@/components/common/RouterLink';
import { DatePicker } from '@/components/form/dateTime';
import { type BirthDateIssue, birthDateIssue } from '@/features/company/birthDate';
import { type LegalPageId, legalPath } from '@/lib/legal';
import { routes } from '@/lib/routes';

import { signUpSchema } from '../schema';
import { useAuth } from '../useAuth';
import { AuthCard } from './AuthCard';
import { FormError } from './FormError';

const BIRTHDAY_ERROR_KEYS: Record<BirthDateIssue, string> = {
  empty: 'auth:setup.errors.birthday',
  invalid: 'auth:setup.errors.birthday',
  future: 'auth:setup.errors.birthdayFuture',
  age: 'auth:setup.errors.birthdayAge',
};

/**
 * Registrierung wie in der App (`sign-up.tsx`): Vorname, Nachname,
 * Geburtsdatum, E-Mail und Passwort. Ob jemand einen Betrieb gründet oder
 * einem beitritt, fragt danach `/betrieb-einrichten` — erst dann gibt es eine
 * Sitzung, mit der sich Firma oder Beitritt schreiben lassen.
 */
export function RegisterPage() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorKey(null);

    const parsed = signUpSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
      passwordConfirm,
    });
    if (!parsed.success) {
      setErrorKey(parsed.error.issues[0]?.message ?? 'errors:generic');
      return;
    }
    const birthdayIssue = birthDateIssue(birthday);
    if (birthdayIssue) {
      setErrorKey(BIRTHDAY_ERROR_KEYS[birthdayIssue]);
      return;
    }

    setPending(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      birthday,
    });
    setPending(false);
    if (error) setErrorKey(error);
    else setDone(true);
  }

  if (done) {
    return (
      <AuthCard title={t('auth:signUp.title')}>
        <p className="text-sm text-muted-foreground">{t('auth:signUp.checkInbox')}</p>
        <LinkButton to={routes.login}>{t('auth:signUp.toSignIn')}</LinkButton>
      </AuthCard>
    );
  }

  const footer = (
    <Trans
      i18nKey="auth:signUp.hasAccount"
      components={{ signin: <RouterLink to={routes.login} /> }}
    />
  );

  return (
    <AuthCard title={t('auth:signUp.title')} subtitle={t('auth:signUp.subtitle')} footer={footer}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError messageKey={errorKey} />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">{t('auth:setup.firstName.label')}</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">{t('auth:setup.lastName.label')}</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="birthday">{t('auth:setup.birthDate.label')}</Label>
          <DatePicker
            id="birthday"
            aria-label={t('auth:setup.birthDate.label')}
            value={birthday}
            onChange={setBirthday}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('auth:field.email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('auth:field.password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="passwordConfirm">{t('auth:field.passwordConfirm')}</Label>
          <Input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
          />
        </div>

        <Button appearance="primary" type="submit" disabled={pending}>
          {t('auth:signUp.submit')}
        </Button>

        <p className="text-muted-foreground text-xs leading-relaxed">
          <Trans
            i18nKey="auth:signUp.legalHint"
            components={{
              privacy: <LegalTextLink page="privacy" />,
            }}
          />
        </p>
      </form>
    </AuthCard>
  );
}

/** Link im Fließtext; den Text setzt `<Trans>` als `children` ein. */
function LegalTextLink({ page, children }: { page: LegalPageId; children?: ReactNode }) {
  const path = legalPath(page);
  if (!path) return children;
  return (
    <RouterLink to={path} inline>
      {children}
    </RouterLink>
  );
}
