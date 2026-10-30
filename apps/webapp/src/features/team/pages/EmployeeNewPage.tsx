import { toast } from '@bautakt/ui';
import {
  Button,
  Divider,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Select,
  Spinner,
  Tab,
  TabList,
  Text,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, CheckmarkRegular, CopyRegular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import {
  type EmploymentInvitation,
  formatInvitationToken,
  getOrCreateInvitation,
  type InvitationMethod,
  inviteAppUrl,
} from '../invitations';
import { assignableRoles, useCompanyRoles } from '../useCompanyRoles';

type AddMethod = InvitationMethod | 'manual';

/**
 * Mitarbeiter hinzufügen — dieselben drei Wege wie in der App
 * (`bautakt-app/app/app/(tabs)/management/employees/new-employee.tsx`):
 *
 * - **QR-Code:** die Person scannt ihn mit der Bautakt-App und tritt bei.
 * - **Code:** der Einladungscode wird weitergegeben und in der App eingegeben.
 * - **Ohne Konto:** nur Name und Rolle; die Person steht in der Teamliste,
 *   hat aber kein Login.
 *
 * Die Einladung entsteht, sobald ein Weg gewählt ist, und hängt an der Rolle:
 * Eine andere Rolle widerruft die alte Einladung und erzeugt eine neue.
 */
export function EmployeeNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: membership } = useMembership();
  const roles = useCompanyRoles();
  const [method, setMethod] = useState<AddMethod>('qr');
  const [pickedRole, setPickedRole] = useState('');

  const options = useMemo(
    () => assignableRoles(roles.data ?? [], membership?.role),
    [roles.data, membership?.role],
  );
  // Vorauswahl wie in der App: „Mitarbeiter“, sonst die erste erlaubte Rolle.
  const fallbackRole =
    options.find((role) => role.system_key === 'employee')?.name ?? options[0]?.name ?? '';
  const role = options.some((option) => option.name === pickedRole) ? pickedRole : fallbackRole;

  const isManual = method === 'manual';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isManual ? t('domain:employeeNew.titleManual') : t('domain:employeeNew.titleInvite')}
        description={t('domain:employeeNew.description')}
        actions={<LinkButton to={routes.employees}>{t('common:action.back')}</LinkButton>}
      />

      <div className="flex max-w-2xl flex-col gap-6">
        <TabList
          // Wie die Reiter unter „Rechnungen“: bündig mit der Überschrift,
          // am Handy wischt man durch statt umzubrechen.
          className="-mx-2.5 overflow-x-auto [scrollbar-width:none]"
          aria-label={t('domain:employeeNew.methodLabel')}
          selectedValue={method}
          onTabSelect={(_, data) => setMethod(data.value as AddMethod)}
        >
          <Tab value="qr">{t('domain:employeeNew.methods.qr')}</Tab>
          <Tab value="token">{t('domain:employeeNew.methods.token')}</Tab>
          <Tab value="manual">{t('domain:employeeNew.methods.manual')}</Tab>
        </TabList>

        <Field
          className="max-w-xs"
          label={t('domain:employees.columns.role')}
          hint={isManual ? undefined : t('domain:employeeNew.roleHint')}
          validationMessage={
            roles.isSuccess && options.length === 0 ? t('domain:employeeNew.noRoles') : undefined
          }
        >
          <Select
            value={role}
            disabled={options.length === 0}
            onChange={(_, { value }) => setPickedRole(value)}
          >
            {options.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>

        <Divider />

        {method === 'manual' ? (
          <ManualPanel role={role} onDone={() => void navigate(routes.employees)} />
        ) : (
          <InvitationPanel key={method} method={method} role={role} />
        )}
      </div>
    </div>
  );
}

function InvitationPanel({ method, role }: { method: InvitationMethod; role: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const [copied, setCopied] = useState<'code' | 'text' | null>(null);

  const queryKey = ['employment-invitation', companyId, method, role];
  const invitation = useQuery({
    queryKey,
    enabled: Boolean(companyId && role),
    // Inaktive Einträge sofort weg: Nach einem Rollenwechsel ist die alte
    // Einladung widerrufen und darf beim Zurückwechseln nicht kurz aufblitzen.
    gcTime: 0,
    queryFn: () => getOrCreateInvitation(companyId!, method, role, false),
  });

  const regenerate = useMutation({
    mutationFn: () => getOrCreateInvitation(companyId!, method, role, true),
    onSuccess: (fresh) => {
      queryClient.setQueryData<EmploymentInvitation>(queryKey, fresh);
      setCopied(null);
    },
  });

  const current = invitation.data;
  const pending = invitation.isPending || regenerate.isPending;
  const error = regenerate.error ?? invitation.error;

  async function copy(kind: 'code' | 'text', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      toast.error(t('domain:employeeNew.copyError'));
    }
  }

  const isQr = method === 'qr';

  return (
    <div className="flex flex-col gap-4">
      {error && !pending ? (
        <MessageBar intent="error">
          <MessageBarBody>
            {readableDbError(error) ?? t('domain:employeeNew.inviteError')}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {isQr ? (
          // Weißer Rand um den Code: Scanner brauchen die helle Ruhezone,
          // auch im dunklen Design.
          <div className="border-border flex size-44 shrink-0 items-center justify-center rounded-lg border bg-white p-2">
            {pending || !current ? (
              <Spinner size="small" />
            ) : (
              <QRCodeSVG
                value={inviteAppUrl(current.token)}
                size={156}
                marginSize={1}
                title={t('domain:employeeNew.qrTitle')}
              />
            )}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Text as="h2" size={400} weight="semibold">
              {isQr ? t('domain:employeeNew.qrHeading') : t('domain:employeeNew.tokenHeading')}
            </Text>
            <Text as="p" className="text-muted-foreground">
              {isQr ? t('domain:employeeNew.qrInfo') : t('domain:employeeNew.tokenInfo')}
            </Text>
          </div>

          {isQr ? null : (
            <div className="flex flex-col gap-3">
              <div className="bg-muted flex min-h-12 w-fit max-w-full items-center rounded-lg px-5 py-2">
                {pending || !current ? (
                  <Spinner size="tiny" />
                ) : (
                  <Text
                    size={500}
                    weight="semibold"
                    font="monospace"
                    className="break-all select-all"
                  >
                    {formatInvitationToken(current.token)}
                  </Text>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={copied === 'code' ? <CheckmarkRegular /> : <CopyRegular />}
                  disabled={pending || !current}
                  onClick={() => current && void copy('code', current.token)}
                >
                  {copied === 'code'
                    ? t('domain:employeeNew.copied')
                    : t('domain:employeeNew.copyCode')}
                </Button>
                <Button
                  icon={copied === 'text' ? <CheckmarkRegular /> : <CopyRegular />}
                  disabled={pending || !current}
                  onClick={() =>
                    current &&
                    void copy(
                      'text',
                      t('domain:employeeNew.shareText', {
                        code: formatInvitationToken(current.token),
                        date: formatDate(current.expiresAt),
                      }),
                    )
                  }
                >
                  {copied === 'text'
                    ? t('domain:employeeNew.copied')
                    : t('domain:employeeNew.copyText')}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Text size={200} className="text-muted-foreground">
              {current && !pending
                ? t('domain:employeeNew.validUntil', { date: formatDate(current.expiresAt) })
                : t('domain:employeeNew.creating')}
            </Text>
            <Button
              appearance="transparent"
              size="small"
              icon={<ArrowClockwiseRegular />}
              disabled={pending || !role}
              onClick={() => regenerate.mutate()}
            >
              {t('domain:employeeNew.regenerate')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Anlegen ohne Konto über `create_manual_employment`, nicht per `insert`: die
 * Funktion prüft, ob ich diese Rolle vergeben darf
 * (`can_assign_employment_role`), und hängt die Beschäftigung an den
 * richtigen Betrieb — ohne `user_id`. Weitere Angaben (Tätigkeit, Kontakt)
 * kommen bei Bedarf danach über „Bearbeiten“.
 */
function ManualPanel({ role, onDone }: { role: string; onDone: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const { error: rpcError } = await supabase.rpc('create_manual_employment', {
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_role: role,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employments', companyId] });
    },
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('domain:employeeNew.nameRequired'));
      return;
    }
    if (!role) {
      setError(t('domain:employeeForm.roleRequired'));
      return;
    }
    setError(null);
    try {
      await create.mutateAsync();
      toast.success(t('domain:employeeNew.created'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:employeeForm.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Text as="h2" size={400} weight="semibold">
          {t('domain:employeeNew.manualHeading')}
        </Text>
        <Text as="p" className="text-muted-foreground">
          {t('domain:employeeNew.manualInfo')}
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('domain:contactForm.firstName')} required>
          <Input
            value={firstName}
            placeholder={t('domain:employeeNew.firstNamePlaceholder')}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </Field>
        <Field label={t('domain:contactForm.lastName')} required>
          <Input
            value={lastName}
            placeholder={t('domain:employeeNew.lastNamePlaceholder')}
            onChange={(event) => setLastName(event.target.value)}
          />
        </Field>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div>
        <Button appearance="primary" type="submit" disabled={create.isPending || !role}>
          {t('domain:employeeNew.create')}
        </Button>
      </div>
    </form>
  );
}
