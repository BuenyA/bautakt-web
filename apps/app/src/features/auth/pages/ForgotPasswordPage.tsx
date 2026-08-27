import { Button, Input, Label } from '@bautakt/ui';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { routes } from '@/lib/routes';

import { forgotPasswordSchema } from '../schema';
import { useAuth } from '../useAuth';
import { AuthCard } from './AuthCard';
import { FormError } from './FormError';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorKey(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrorKey(parsed.error.issues[0]?.message ?? 'errors:generic');
      return;
    }

    setPending(true);
    const { error } = await requestPasswordReset(parsed.data.email);
    setPending(false);

    // Auch bei Fehlern bestaetigen: ob es zu einer Adresse ein Konto gibt,
    // darf die Seite nicht verraten. Nur Rate-Limits werden gezeigt.
    if (error === 'errors:auth.rateLimited') setErrorKey(error);
    else setSent(true);
  }

  const footer = (
    <Link to={routes.login} className="text-primary hover:underline">
      {t('auth:forgotPassword.backToSignIn')}
    </Link>
  );

  if (sent) {
    return (
      <AuthCard title={t('auth:forgotPassword.title')} footer={footer}>
        <p className="text-sm text-muted-foreground">{t('auth:forgotPassword.sent')}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('auth:forgotPassword.title')}
      subtitle={t('auth:forgotPassword.subtitle')}
      footer={footer}
    >
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

        <Button type="submit" disabled={pending}>
          {t('auth:forgotPassword.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
