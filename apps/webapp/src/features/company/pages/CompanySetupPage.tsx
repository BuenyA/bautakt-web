import { parseIsoDay } from '@bautakt/ui';
import {
  Button,
  Card,
  CardHeader,
  Combobox,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Radio,
  RadioGroup,
  Text,
} from '@fluentui/react-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { DatePicker } from '@/components/form/dateTime';
import { useAuth } from '@/features/auth/useAuth';
import { COMPANY_TYPES } from '@/features/companySettings/companyValidation';
import { additionalCompanyParam, HOME_ROUTE } from '@/lib/routes';
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

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  name?: string;
  type?: string;
  teamSize?: string;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  birthday: string | null;
};

/**
 * Eine Seite fuer die drei Pflichtfragen des Chef-Onboardings
 * (Name, Gewerk, Groesse). Fehlen Vor- oder Nachname, kommen dieselben
 * Pflichtfelder dazu wie beim Sign-up der App.
 */
export function CompanySetupPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  // Aus dem Profilmenü: ein weiterer Betrieb neben dem bestehenden.
  const [searchParams] = useSearchParams();
  const additional = searchParams.get(additionalCompanyParam) === '1';
  const queryClient = useQueryClient();
  const submitting = useRef(false);

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

  const needsName =
    profile.isSuccess && (!profile.data?.first_name?.trim() || !profile.data?.last_name?.trim());

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [seeded, setSeeded] = useState(false);
  if (needsName && !seeded && profile.data) {
    setFirstName(profile.data.first_name ?? '');
    setLastName(profile.data.last_name ?? '');
    setBirthday(parseIsoDay(profile.data.birthday) ?? '');
    setSeeded(true);
  } else if (needsName && !seeded && profile.isSuccess) {
    setSeeded(true);
  }

  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [teamSize, setTeamSize] = useState<CompanyTeamSize | ''>('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState(false);
  const [pending, setPending] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  function birthdayMessage(issue: BirthDateIssue): string {
    if (issue === 'future') return t('auth:setup.errors.birthdayFuture');
    if (issue === 'age') return t('auth:setup.errors.birthdayAge');
    return t('auth:setup.errors.birthday');
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (needsName) {
      if (!firstName.trim()) next.firstName = t('auth:setup.errors.firstName');
      if (!lastName.trim()) next.lastName = t('auth:setup.errors.lastName');
      const issue = birthDateIssue(birthday);
      if (issue) next.birthday = birthdayMessage(issue);
    }
    if (name.trim().length < 2) next.name = t('auth:setup.errors.name');
    if (trade.trim().length < 2) next.type = t('auth:setup.errors.type');
    if (!isCompanyTeamSize(teamSize)) next.teamSize = t('auth:setup.errors.teamSize');
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !user) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setServerError(false);
    if (Object.keys(nextErrors).length > 0 || !isCompanyTeamSize(teamSize)) return;

    submitting.current = true;
    setPending(true);
    try {
      if (needsName) {
        await updateOwnerProfile(user.id, {
          firstName,
          lastName,
          birthday,
        });
        await queryClient.invalidateQueries({ queryKey: ['my-profile', user.id] });
      }
      let createdId = companyId;
      if (!createdId) {
        const created = await createOwnerCompany(user.id, {
          name,
          type: trade,
          teamSize,
        });
        createdId = created.id;
        setCompanyId(createdId);
      }
      await markOnboardingComplete(user.id);
      if (additional) {
        // Bei einem weiteren Betrieb darf `createOwnerCompany` die alte
        // Hauptbeschäftigung oft nicht zurücksetzen (RLS auf `employments`
        // verlangt Personalrechte im alten Betrieb). `switch_primary_company`
        // läuft als SECURITY DEFINER und setzt genau eine Zeile aktiv.
        const { error } = await supabase.rpc('switch_primary_company', {
          p_company_id: createdId,
        });
        if (error) throw error;
        await queryClient.resetQueries();
      } else {
        await queryClient.invalidateQueries({ queryKey: ['membership', user.id] });
      }
      navigate(HOME_ROUTE, { replace: true });
    } catch {
      setServerError(true);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (profile.isPending) return <FullPageSpinner />;

  if (profile.isError) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-4">
          <MessageBar intent="error" role="alert">
            <MessageBarBody>{t('errors:generic')}</MessageBarBody>
          </MessageBar>
          <Button appearance="primary" onClick={() => void profile.refetch()}>
            {t('common:action.retry')}
          </Button>
          <Button appearance="subtle" onClick={() => void signOut()}>
            {t('common:action.signOut')}
          </Button>
        </div>
      </main>
    );
  }

  const locked = pending || companyId != null;

  return (
    <main className="flex min-h-svh items-center justify-center overflow-auto p-6">
      <div className="w-full max-w-md">
        <Card size="large">
          <CardHeader
            header={
              <Text as="h1" size={500} weight="semibold">
                {t('auth:setup.title')}
              </Text>
            }
            description={<Text>{t('auth:setup.subtitle')}</Text>}
          />
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
          >
            {serverError ? (
              <MessageBar intent="error" role="alert">
                <MessageBarBody>{t('auth:setup.error')}</MessageBarBody>
              </MessageBar>
            ) : null}

            {needsName ? (
              <>
                <Field
                  label={t('auth:setup.firstName.label')}
                  required
                  validationMessage={errors.firstName}
                  validationState={errors.firstName ? 'error' : 'none'}
                >
                  <Input
                    name="given-name"
                    autoComplete="given-name"
                    value={firstName}
                    disabled={locked}
                    onChange={(_, data) => {
                      setFirstName(data.value);
                      if (errors.firstName && data.value.trim()) {
                        setErrors((current) => ({ ...current, firstName: undefined }));
                      }
                    }}
                    onBlur={() => setFirstName((current) => current.trim())}
                  />
                </Field>
                <Field
                  label={t('auth:setup.lastName.label')}
                  required
                  validationMessage={errors.lastName}
                  validationState={errors.lastName ? 'error' : 'none'}
                >
                  <Input
                    name="family-name"
                    autoComplete="family-name"
                    value={lastName}
                    disabled={locked}
                    onChange={(_, data) => {
                      setLastName(data.value);
                      if (errors.lastName && data.value.trim()) {
                        setErrors((current) => ({ ...current, lastName: undefined }));
                      }
                    }}
                    onBlur={() => setLastName((current) => current.trim())}
                  />
                </Field>
                <Field
                  label={t('auth:setup.birthDate.label')}
                  required
                  validationMessage={errors.birthday}
                  validationState={errors.birthday ? 'error' : 'none'}
                >
                  <DatePicker
                    aria-label={t('auth:setup.birthDate.label')}
                    value={birthday}
                    disabled={locked}
                    onChange={(value) => {
                      setBirthday(value);
                      if (!birthDateIssue(value)) {
                        setErrors((current) => ({ ...current, birthday: undefined }));
                      }
                    }}
                  />
                </Field>
              </>
            ) : null}

            <Field
              label={t('auth:setup.name.label')}
              required
              validationMessage={errors.name}
              validationState={errors.name ? 'error' : 'none'}
            >
              <Input
                name="organization"
                autoComplete="organization"
                placeholder={t('auth:setup.name.placeholder')}
                value={name}
                disabled={locked}
                onChange={(_, data) => {
                  setName(data.value);
                  if (errors.name && data.value.trim().length >= 2) {
                    setErrors((current) => ({ ...current, name: undefined }));
                  }
                }}
                onBlur={() => setName((current) => current.trim())}
              />
            </Field>

            <Field
              label={t('auth:setup.trade.label')}
              required
              validationMessage={errors.type}
              validationState={errors.type ? 'error' : 'none'}
            >
              <Combobox
                freeform
                placeholder={t('auth:setup.trade.placeholder')}
                value={trade}
                selectedOptions={trade ? [trade] : []}
                disabled={locked}
                onChange={(event) => {
                  const value = event.target.value;
                  setTrade(value);
                  if (errors.type && value.trim().length >= 2) {
                    setErrors((current) => ({ ...current, type: undefined }));
                  }
                }}
                onOptionSelect={(_, data) => {
                  const value = data.optionText ?? '';
                  setTrade(value);
                  if (value.trim().length >= 2) {
                    setErrors((current) => ({ ...current, type: undefined }));
                  }
                }}
              >
                {COMPANY_TYPES.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Combobox>
            </Field>

            <Field
              label={t('auth:setup.size.label')}
              required
              validationMessage={errors.teamSize}
              validationState={errors.teamSize ? 'error' : 'none'}
            >
              <RadioGroup
                value={teamSize}
                disabled={locked}
                onChange={(_, data) => {
                  if (!isCompanyTeamSize(data.value)) return;
                  setTeamSize(data.value);
                  setErrors((current) => ({ ...current, teamSize: undefined }));
                }}
              >
                {COMPANY_TEAM_SIZES.map((size) => (
                  <Radio key={size} value={size} label={t(`auth:setup.sizes.${size}`)} />
                ))}
              </RadioGroup>
            </Field>

            <Button appearance="primary" type="submit" disabled={pending}>
              {pending ? t('common:state.loading') : t('auth:setup.submit')}
            </Button>
            {additional ? (
              <Button
                appearance="subtle"
                type="button"
                disabled={pending}
                onClick={() => navigate(HOME_ROUTE)}
              >
                {t('common:action.cancel')}
              </Button>
            ) : (
              <Button
                appearance="subtle"
                type="button"
                disabled={pending}
                onClick={() => void signOut()}
              >
                {t('common:action.signOut')}
              </Button>
            )}
          </form>
        </Card>
      </div>
    </main>
  );
}
