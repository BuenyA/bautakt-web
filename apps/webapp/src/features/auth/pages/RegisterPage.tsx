import { Button, Input, Label } from '@bautakt/ui';
import { type FormEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { routes } from '@/lib/routes';

import { signUpSchema } from '../schema';
import { useAuth } from '../useAuth';
import { AuthCard } from './AuthCard';
import { FormError } from './FormError';

export function RegisterPage() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorKey(null);

    const parsed = signUpSchema.safeParse({ email, password, passwordConfirm });
    if (!parsed.success) {
      setErrorKey(parsed.error.issues[0]?.message ?? 'errors:generic');
      return;
    }

    setPending(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password);
    setPending(false);
    if (error) setErrorKey(error);
    else setDone(true);
  }

  if (done) {
    return (
      <AuthCard title={t('auth:signUp.title')}>
        <p className="text-sm text-muted-foreground">{t('auth:signUp.checkInbox')}</p>
        <Button asChild variant="outline">
          <Link to={routes.login}>{t('auth:signUp.toSignIn')}</Link>
        </Button>
      </AuthCard>
    );
  }

  const footer = (
    <Trans
      i18nKey="auth:signUp.hasAccount"
      components={{ signin: <Link to={routes.login} className="text-primary hover:underline" /> }}
    />
  );

  return (
    <AuthCard title={t('auth:signUp.title')} subtitle={t('auth:signUp.subtitle')} footer={footer}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError messageKey={errorKey} />

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

        <Button type="submit" disabled={pending}>
          {t('auth:signUp.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
