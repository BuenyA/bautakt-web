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
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/useAuth';
import { COMPANY_TYPES } from '@/features/settings/companyValidation';
import { HOME_ROUTE } from '@/lib/routes';

import {
  COMPANY_TEAM_SIZES,
  type CompanyTeamSize,
  createOwnerCompany,
  isCompanyTeamSize,
  markOnboardingComplete,
} from '../createCompany';

type FieldErrors = {
  name?: string;
  type?: string;
  teamSize?: string;
};

/**
 * Eine Seite fuer die drei Pflichtfragen des Chef-Onboardings
 * (Name, Gewerk, Groesse). Dieselben Grenzen wie
 * `company-name` (mindestens 2 Zeichen) und `company-trade`
 * (Gewerk aus der Liste oder eigener Text ab 2 Zeichen).
 */
export function CompanySetupPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submitting = useRef(false);

  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [teamSize, setTeamSize] = useState<CompanyTeamSize | ''>('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState(false);
  const [pending, setPending] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
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
      await queryClient.invalidateQueries({ queryKey: ['membership', user.id] });
      navigate(HOME_ROUTE, { replace: true });
    } catch {
      setServerError(true);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
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
                disabled={pending || companyId != null}
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
                disabled={pending || companyId != null}
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
                disabled={pending || companyId != null}
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
            <Button
              appearance="subtle"
              type="button"
              disabled={pending}
              onClick={() => void signOut()}
            >
              {t('common:action.signOut')}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
