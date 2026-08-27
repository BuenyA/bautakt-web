import { Button, Input, Label } from '@bautakt/ui';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { routes } from '@/lib/routes';

import { resetPasswordSchema } from '../schema';
import { useAuth } from '../useAuth';
import { AuthCard } from './AuthCard';
import { FormError } from './FormError';

/**
 * Ziel des Links aus der Zuruecksetzen-Mail.
 *
 * Der Link traegt die Recovery-Session im URL-Fragment. Sie wird von
 * supabase-js eingeloest, weil der Client mit `detectSessionInUrl: true` laeuft
 * — genau dafuer weicht der Web-Client hier von dem der Mobile-App ab. Wenn
 * `session` null bleibt, war der Link abgelaufen oder ungueltig.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { session, initializing, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorKey(null);

    const parsed = resetPasswordSchema.safeParse({ password, passwordConfirm });
    if (!parsed.success) {
      setErrorKey(parsed.error.issues[0]?.message ?? 'errors:generic');
      return;
    }

    setPending(true);
    const { error } = await updatePassword(parsed.data.password);
    setPending(false);

    if (error) {
      setErrorKey(error);
      return;
    }

    // Bewusst abmelden: die Recovery-Session ist eine Sonderform. Nach dem
    // Wechsel soll sich der Nutzer regulaer mit dem neuen Passwort anmelden.
    await signOut();
    void navigate(routes.login, { replace: true });
  }

  if (!initializing && !session) {
    return (
      <AuthCard
        title={t('auth:resetPassword.title')}
        footer={
          <Link to={routes.forgotPassword} className="text-primary hover:underline">
            {t('auth:forgotPassword.submit')}
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">{t('auth:resetPassword.noSession')}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth:resetPassword.title')} subtitle={t('auth:resetPassword.subtitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError messageKey={errorKey} />

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
          {t('auth:resetPassword.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
