import { Button, Input, Label } from '@bautakt/ui';
import { type FormEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { routes } from '@/lib/routes';

import { signInSchema } from '../schema';
import { useAuth } from '../useAuth';
import { AuthCard } from './AuthCard';
import { FormError } from './FormError';

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorKey(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorKey(parsed.error.issues[0]?.message ?? 'errors:generic');
      return;
    }

    setPending(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setPending(false);
    // Bei Erfolg uebernimmt PublicOnlyRoute die Weiterleitung.
    if (error) setErrorKey(error);
  }

  const footer = (
    <Trans
      i18nKey="auth:signIn.noAccount"
      components={{
        register: <Link to={routes.register} className="text-primary hover:underline" />,
      }}
    />
  );

  return (
    <AuthCard title={t('auth:signIn.title')} subtitle={t('auth:signIn.subtitle')} footer={footer}>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('auth:field.password')}</Label>
            <Link to={routes.forgotPassword} className="text-sm text-primary hover:underline">
              {t('auth:signIn.forgotPassword')}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" disabled={pending}>
          {t('auth:signIn.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
