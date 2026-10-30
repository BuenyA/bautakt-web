import { parseIsoDay } from '@bautakt/ui';
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Radio,
  RadioGroup,
  Select,
  Text,
} from '@fluentui/react-components';
import { ChevronDownRegular, ChevronUpRegular, QrCodeRegular } from '@fluentui/react-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { DatePicker } from '@/components/form/dateTime';
import { AuthCard } from '@/features/auth/pages/AuthCard';
import { useAuth } from '@/features/auth/useAuth';
import {
  COMPANY_COUNTRIES,
  type CompanyCountry,
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
} from '@/features/settings/companyValidation';
import { TradeCombobox } from '@/features/settings/TradeCombobox';
import { HOME_ROUTE } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { type BirthDateIssue, birthDateIssue } from '../birthDate';
import {
  COMPANY_TEAM_SIZES,
  type CompanyTeamSize,
  createOwnerCompany,
  isCompanyTeamSize,
  markOnboardingComplete,
  updateOwnerProfile,
} from '../createCompany';
import { extractInviteToken, invitationErrorKey, isCurrentInvitationToken } from '../invitations';
import { InviteQrDialog } from '../onboarding/InviteQrDialog';
import { type OnboardingRole, RoleChoice } from '../onboarding/RoleChoice';

type Step = 'profile' | 'choice' | 'company' | 'address' | 'join' | 'welcome';

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  birthday: string | null;
};

type Errors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'birthday'
    | 'role'
    | 'name'
    | 'type'
    | 'teamSize'
    | 'street'
    | 'postalCode'
    | 'city'
    | 'phone'
    | 'email'
    | 'code',
    string
  >
>;

type Welcome = { role: OnboardingRole; companyName: string };

function metaText(meta: Record<string, unknown> | undefined, key: string): string {
  const value = meta?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Einrichtung nach der ersten Anmeldung — der Weg der App
 * (`app/index.tsx`, `role.tsx`, `company-*.tsx`, `join-company.tsx`,
 * `welcome-team.tsx`) als ein Assistent:
 *
 * 1. Über mich — nur, wenn Vor-/Nachname oder Geburtsdatum fehlen und die
 *    Registrierung sie nicht als `user_metadata` mitgebracht hat.
 * 2. Gründen oder beitreten.
 * 3a. Betrieb (Name, Gewerk, Größe) → Anschrift (+ Telefon/E-Mail optional).
 * 3b. Einladungscode oder QR-Code.
 * 4. Willkommen.
 *
 * ⚠️ Die Mitgliedschafts-Query wird erst auf „Los geht's“ invalidiert. Sonst
 * sieht `MembershipGate` den neuen Betrieb sofort und springt an der
 * Willkommensseite vorbei auf die Übersicht.
 */
export function CompanySetupPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submitting = useRef(false);
  const createdCompanyId = useRef<string | null>(null);

  const profile = useQuery({
    queryKey: ['my-profile', user?.id, 'setup'],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, birthday')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [step, setStep] = useState<Step | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [showProfileStep, setShowProfileStep] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');

  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [teamSize, setTeamSize] = useState<CompanyTeamSize | ''>('');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState<CompanyCountry>('DE');
  const [phone, setPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [code, setCode] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [welcome, setWelcome] = useState<Welcome | null>(null);

  // Einmal nach dem Laden des Profils: Werte aus `profiles`, sonst aus der
  // Registrierung (`user_metadata`). Fehlt danach noch etwas, kommt Schritt 1.
  if (step === null && profile.isSuccess && user) {
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const first = profile.data?.first_name?.trim() || metaText(meta, 'first_name');
    const last = profile.data?.last_name?.trim() || metaText(meta, 'last_name');
    const birth = parseIsoDay(profile.data?.birthday ?? metaText(meta, 'birthday')) ?? '';
    const stored =
      Boolean(profile.data?.first_name?.trim()) &&
      Boolean(profile.data?.last_name?.trim()) &&
      Boolean(profile.data?.birthday);
    const complete = Boolean(first) && Boolean(last) && birthDateIssue(birth) === null;
    setFirstName(first);
    setLastName(last);
    setBirthday(birth);
    setNeedsProfile(!stored);
    setShowProfileStep(!complete);
    setStep(complete ? 'choice' : 'profile');
  }

  function clearError(key: keyof Errors) {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function birthdayMessage(issue: BirthDateIssue): string {
    if (issue === 'future') return t('auth:setup.errors.birthdayFuture');
    if (issue === 'age') return t('auth:setup.errors.birthdayAge');
    return t('auth:setup.errors.birthday');
  }

  function validate(current: Step): Errors {
    const next: Errors = {};
    if (current === 'profile') {
      if (!firstName.trim()) next.firstName = t('auth:setup.errors.firstName');
      if (!lastName.trim()) next.lastName = t('auth:setup.errors.lastName');
      const issue = birthDateIssue(birthday);
      if (issue) next.birthday = birthdayMessage(issue);
    }
    if (current === 'choice' && !role) next.role = t('auth:setup.choice.error');
    if (current === 'company') {
      if (name.trim().length < 2) next.name = t('auth:setup.errors.name');
      if (trade.trim().length < 2) next.type = t('auth:setup.errors.type');
      if (!isCompanyTeamSize(teamSize)) next.teamSize = t('auth:setup.errors.teamSize');
    }
    if (current === 'address') {
      if (street.trim().length < 5) next.street = t('domain:settings.errors.street');
      if (!isValidPostalCode(postalCode, country)) {
        next.postalCode = t('domain:settings.errors.postalCode', {
          count: country === 'DE' ? 5 : 4,
        });
      }
      if (city.trim().length < 2) next.city = t('domain:settings.errors.city');
      if (phone.trim() && !isValidPhone(phone)) next.phone = t('domain:settings.errors.phone');
      if (companyEmail.trim() && !isValidEmail(companyEmail)) {
        next.email = t('domain:settings.errors.email');
      }
    }
    if (current === 'join' && !isCurrentInvitationToken(normalizedCode())) {
      next.code = t('auth:setup.join.invalid');
    }
    return next;
  }

  function normalizedCode(value = code): string {
    return (extractInviteToken(value) ?? value.replace(/[\s-]/g, '')).trim();
  }

  /** Name und Geburtsdatum nach `profiles`, bevor Firma oder Beitritt entstehen. */
  async function ensureProfile() {
    if (!user || !needsProfile) return;
    await updateOwnerProfile(user.id, { firstName, lastName, birthday });
    setNeedsProfile(false);
    await queryClient.invalidateQueries({ queryKey: ['my-profile', user.id] });
  }

  async function run(action: () => Promise<void>, errorKey: (error: unknown) => string) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setServerError(null);
    try {
      await action();
    } catch (error) {
      setServerError(errorKey(error));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  async function createCompany() {
    if (!user || !isCompanyTeamSize(teamSize)) return;
    await run(
      async () => {
        await ensureProfile();
        // Ein zweiter Versuch nach einem Fehler hinter dem Firmen-Insert legt
        // keine zweite Firma an.
        if (!createdCompanyId.current) {
          const created = await createOwnerCompany(user.id, {
            name,
            type: trade,
            teamSize,
            street,
            postalCode,
            city,
            country,
            phone,
            email: companyEmail,
          });
          createdCompanyId.current = created.id;
        }
        await markOnboardingComplete(user.id);
        setWelcome({ role: 'owner', companyName: name.trim() });
        setStep('welcome');
      },
      () => 'auth:setup.error',
    );
  }

  async function join(token: string) {
    if (!user) return;
    await run(
      async () => {
        await ensureProfile();
        const { data, error } = await supabase.rpc('accept_employment_invitation', {
          p_token: token,
        });
        if (error) throw error;
        const companyId = data?.[0]?.company_id;
        let companyName = '';
        if (companyId) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .maybeSingle();
          companyName = company?.name ?? '';
        }
        await markOnboardingComplete(user.id);
        setWelcome({ role: 'employee', companyName });
        setStep('welcome');
      },
      (error) => {
        const key = invitationErrorKey(error);
        return key === 'errors:generic' ? 'auth:setup.join.error' : key;
      },
    );
  }

  async function finish() {
    if (!user) return;
    await queryClient.invalidateQueries({ queryKey: ['membership', user.id] });
    navigate(HOME_ROUTE, { replace: true });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!step || step === 'welcome') return;
    const nextErrors = validate(step);
    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length > 0) {
      if (step === 'address' && (nextErrors.phone || nextErrors.email)) setShowMore(true);
      return;
    }
    if (step === 'profile') setStep('choice');
    else if (step === 'choice') setStep(role === 'owner' ? 'company' : 'join');
    else if (step === 'company') setStep('address');
    else if (step === 'address') void createCompany();
    else if (step === 'join') void join(normalizedCode());
  }

  function back() {
    setErrors({});
    setServerError(null);
    if (step === 'choice' && showProfileStep) setStep('profile');
    else if (step === 'company' || step === 'join') setStep('choice');
    else if (step === 'address') setStep('company');
  }

  if (profile.isPending || (profile.isSuccess && step === null)) return <FullPageSpinner />;

  if (profile.isError) {
    return (
      <AuthCard title={t('auth:setup.title')}>
        <MessageBar intent="error" role="alert">
          <MessageBarBody>{t('errors:generic')}</MessageBarBody>
        </MessageBar>
        <Button appearance="primary" onClick={() => void profile.refetch()}>
          {t('common:action.retry')}
        </Button>
        <Button appearance="subtle" onClick={() => void signOut()}>
          {t('common:action.signOut')}
        </Button>
      </AuthCard>
    );
  }

  if (step === 'welcome' && welcome) {
    const title =
      welcome.role === 'owner'
        ? t('auth:setup.welcome.ownerTitle', { company: welcome.companyName })
        : welcome.companyName
          ? t('auth:setup.welcome.employeeTitle', { company: welcome.companyName })
          : t('auth:setup.welcome.employeeTitleFallback');
    return (
      <AuthCard
        title={title}
        subtitle={
          welcome.role === 'owner'
            ? t('auth:setup.welcome.ownerText')
            : t('auth:setup.welcome.employeeText')
        }
      >
        <Button appearance="primary" onClick={() => void finish()}>
          {t('auth:setup.welcome.start')}
        </Button>
      </AuthCard>
    );
  }

  // Schrittzähler über den gewählten Zweig: Chef hat zwei Schritte mehr.
  const flow: Step[] = [
    ...(showProfileStep ? (['profile'] as const) : []),
    'choice',
    ...(role === 'employee' ? (['join'] as const) : (['company', 'address'] as const)),
  ];
  const stepNumber = flow.indexOf(step!) + 1;
  const canGoBack = step !== 'profile' && !(step === 'choice' && !showProfileStep);

  const heading: Record<Exclude<Step, 'welcome'>, { title: string; subtitle?: string }> = {
    profile: { title: t('auth:setup.profile.title'), subtitle: t('auth:setup.profile.subtitle') },
    choice: { title: t('auth:setup.choice.title') },
    company: { title: t('auth:setup.company.title') },
    address: { title: t('auth:setup.address.title'), subtitle: t('auth:setup.address.subtitle') },
    join: { title: t('auth:setup.join.title'), subtitle: t('auth:setup.join.subtitle') },
  };
  const current = heading[step as Exclude<Step, 'welcome'>];

  const primaryLabel =
    step === 'address'
      ? t('auth:setup.submit')
      : step === 'join'
        ? t('auth:setup.join.submit')
        : t('auth:setup.next');

  const signOutButton = (
    <Button appearance="transparent" size="small" disabled={pending} onClick={() => void signOut()}>
      {t('common:action.signOut')}
    </Button>
  );

  return (
    <AuthCard
      title={current.title}
      subtitle={current.subtitle}
      titleSize={600}
      headerAction={signOutButton}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <Text size={200} className="text-muted-foreground">
          {t('auth:setup.stepOf', { step: stepNumber, total: flow.length })}
        </Text>

        {serverError ? (
          <MessageBar intent="error" role="alert">
            <MessageBarBody>{t(serverError)}</MessageBarBody>
          </MessageBar>
        ) : null}

        {step === 'profile' ? (
          <>
            <TextInput
              label={t('auth:setup.firstName.label')}
              autoComplete="given-name"
              value={firstName}
              error={errors.firstName}
              onChange={(value) => {
                setFirstName(value);
                if (value.trim()) clearError('firstName');
              }}
            />
            <TextInput
              label={t('auth:setup.lastName.label')}
              autoComplete="family-name"
              value={lastName}
              error={errors.lastName}
              onChange={(value) => {
                setLastName(value);
                if (value.trim()) clearError('lastName');
              }}
            />
            <Field
              label={t('auth:setup.birthDate.label')}
              required
              validationMessage={errors.birthday}
              validationState={errors.birthday ? 'error' : 'none'}
            >
              <DatePicker
                aria-label={t('auth:setup.birthDate.label')}
                value={birthday}
                onChange={(value) => {
                  setBirthday(value);
                  if (!birthDateIssue(value)) clearError('birthday');
                }}
              />
            </Field>
          </>
        ) : null}

        {step === 'choice' ? (
          <Field validationMessage={errors.role} validationState={errors.role ? 'error' : 'none'}>
            <RoleChoice
              value={role}
              onChange={(value) => {
                setRole(value);
                clearError('role');
              }}
            />
          </Field>
        ) : null}

        {step === 'company' ? (
          <>
            <TextInput
              label={t('auth:setup.name.label')}
              autoComplete="organization"
              placeholder={t('auth:setup.name.placeholder')}
              value={name}
              error={errors.name}
              onChange={(value) => {
                setName(value);
                if (value.trim().length >= 2) clearError('name');
              }}
            />
            <Field
              label={t('auth:setup.trade.label')}
              required
              validationMessage={errors.type}
              validationState={errors.type ? 'error' : 'none'}
            >
              <TradeCombobox
                placeholder={t('auth:setup.trade.placeholder')}
                value={trade}
                onChange={(value) => {
                  setTrade(value);
                  if (value.trim().length >= 2) clearError('type');
                }}
              />
            </Field>
            <Field
              label={t('auth:setup.size.label')}
              required
              validationMessage={errors.teamSize}
              validationState={errors.teamSize ? 'error' : 'none'}
            >
              <RadioGroup
                value={teamSize}
                onChange={(_, data) => {
                  if (!isCompanyTeamSize(data.value)) return;
                  setTeamSize(data.value);
                  clearError('teamSize');
                }}
              >
                {COMPANY_TEAM_SIZES.map((size) => (
                  <Radio key={size} value={size} label={t(`auth:setup.sizes.${size}`)} />
                ))}
              </RadioGroup>
            </Field>
          </>
        ) : null}

        {step === 'address' ? (
          <>
            <TextInput
              label={t('domain:settings.street')}
              autoComplete="street-address"
              value={street}
              error={errors.street}
              disabled={pending}
              onChange={(value) => {
                setStreet(value);
                if (value.trim().length >= 5) clearError('street');
              }}
            />
            <div className="grid grid-cols-[6rem_1fr] gap-3">
              <TextInput
                label={t('domain:settings.postalCode')}
                autoComplete="postal-code"
                inputMode="numeric"
                value={postalCode}
                error={errors.postalCode}
                disabled={pending}
                onChange={(value) => {
                  const digits = value.replace(/\D/g, '');
                  setPostalCode(digits);
                  if (isValidPostalCode(digits, country)) clearError('postalCode');
                }}
              />
              <TextInput
                label={t('domain:settings.city')}
                autoComplete="address-level2"
                value={city}
                error={errors.city}
                disabled={pending}
                onChange={(value) => {
                  setCity(value);
                  if (value.trim().length >= 2) clearError('city');
                }}
              />
            </div>
            <Field label={t('domain:settings.country')} required>
              <Select
                value={country}
                disabled={pending}
                onChange={(_, data) => {
                  setCountry(data.value as CompanyCountry);
                  clearError('postalCode');
                }}
              >
                {COMPANY_COUNTRIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`domain:settings.countries.${value}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <Button
              type="button"
              appearance="subtle"
              className="self-start"
              icon={showMore ? <ChevronUpRegular /> : <ChevronDownRegular />}
              iconPosition="after"
              aria-expanded={showMore}
              aria-controls="setup-more"
              onClick={() => setShowMore((open) => !open)}
            >
              {t('auth:setup.address.more')}
            </Button>
            {showMore ? (
              <div id="setup-more" className="flex flex-col gap-4">
                <TextInput
                  label={t('domain:settings.phone')}
                  autoComplete="tel"
                  type="tel"
                  required={false}
                  value={phone}
                  error={errors.phone}
                  disabled={pending}
                  onChange={(value) => {
                    const cleaned = value.replace(/[^\d\s\-+()]/g, '');
                    setPhone(cleaned);
                    if (!cleaned.trim() || isValidPhone(cleaned)) clearError('phone');
                  }}
                />
                <TextInput
                  label={t('domain:settings.email')}
                  autoComplete="email"
                  type="email"
                  required={false}
                  value={companyEmail}
                  error={errors.email}
                  disabled={pending}
                  onChange={(value) => {
                    setCompanyEmail(value);
                    if (!value.trim() || isValidEmail(value)) clearError('email');
                  }}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {step === 'join' ? (
          <>
            <TextInput
              label={t('auth:setup.join.label')}
              placeholder={t('auth:setup.join.placeholder')}
              autoComplete="off"
              value={code}
              error={errors.code}
              disabled={pending}
              onChange={(value) => {
                setCode(value);
                if (isCurrentInvitationToken(normalizedCode(value))) clearError('code');
              }}
            />
            <Text size={200} align="center" className="text-muted-foreground">
              {t('auth:setup.join.or')}
            </Text>
            <Button
              type="button"
              icon={<QrCodeRegular />}
              disabled={pending}
              onClick={() => setQrOpen(true)}
            >
              {t('auth:setup.join.scanQr')}
            </Button>
            {qrOpen ? (
              <InviteQrDialog
                onClose={() => setQrOpen(false)}
                onToken={(token) => {
                  setQrOpen(false);
                  setCode(token);
                  clearError('code');
                  void join(token);
                }}
              />
            ) : null}
          </>
        ) : null}

        <div className="flex gap-2">
          {canGoBack ? (
            <Button type="button" disabled={pending} onClick={back}>
              {t('common:action.back')}
            </Button>
          ) : null}
          <Button appearance="primary" type="submit" disabled={pending} className="grow">
            {pending ? t('common:state.loading') : primaryLabel}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}

/** Pflicht-Textfeld mit Fehlermeldung; `required={false}` für optionale. */
function TextInput({
  label,
  value,
  error,
  onChange,
  required = true,
  ...input
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
  inputMode?: 'numeric';
  disabled?: boolean;
}): ReactNode {
  return (
    <Field
      label={label}
      required={required}
      validationMessage={error}
      validationState={error ? 'error' : 'none'}
    >
      <Input
        {...input}
        value={value}
        onChange={(_, data) => onChange(data.value)}
        onBlur={() => onChange(value.trim())}
      />
    </Field>
  );
}
