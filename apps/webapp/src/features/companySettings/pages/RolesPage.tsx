import type { EmployeePermissions, PermissionKey } from '@bautakt/core';
import { DangerButton, SkeletonBlock, StatusBadge, toast } from '@bautakt/ui';
import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Add20Regular,
  CheckmarkCircle20Filled,
  Delete20Regular,
  DismissCircle20Regular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SwitchRow } from '@/components/common/SwitchRow';
import { SubPage } from '@/components/layout/SubNavLayout';
import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';

import { useCompanyAccess } from '../companyAccess';
import { FormCard } from '../FormCard';
import { PERMISSION_GROUPS, ROLE_ICONS, roleIcon } from '../permissionGroups';
import { SectionGuard } from '../SectionGuard';
import {
  type CompanyRole,
  useCompanyRoles,
  useCreateRole,
  useDeleteRole,
  useUpdateRolePermissions,
} from '../useCompanyRoles';

const useStyles = makeStyles({
  roleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    justifyContent: 'flex-start',
    minHeight: '44px',
    textAlign: 'left',
  },
  roleSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    color: tokens.colorNeutralForeground1Selected,
  },
});

/**
 * Die Inhaber-Rolle bleibt unangetastet: Würde sie sich `canManageRoles`
 * oder `canEditCompanyMasterData` nehmen, sperrte sich der Betrieb aus
 * Teilen der eigenen Einrichtung aus. Die App erlaubt das heute noch; im Web
 * ist sie bewusst nur lesbar (Owner, 2026-10-30).
 */
const isLocked = (role: CompanyRole) => role.systemKey === 'owner';

function RoleList({
  roles,
  selectedId,
  onSelect,
}: {
  roles: CompanyRole[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <Card size="small">
      <nav aria-label={t('companySettings:roles.listLabel')} className="flex flex-col gap-0.5">
        {roles.map((role) => {
          const Icon = roleIcon(role.icon);
          const selected = role.id === selectedId;
          return (
            <Button
              key={role.id}
              appearance="subtle"
              icon={<Icon />}
              aria-current={selected ? 'true' : undefined}
              className={mergeClasses(styles.roleButton, selected && styles.roleSelected)}
              onClick={() => onSelect(role.id)}
            >
              <span className="min-w-0 flex-1 truncate">{role.name}</span>
              <Text className="text-muted-foreground tabular-nums">{role.memberCount}</Text>
            </Button>
          );
        })}
      </nav>
    </Card>
  );
}

function RoleEditor({ role, canEdit }: { role: CompanyRole; canEdit: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateRolePermissions();
  const remove = useDeleteRole();
  const [draft, setDraft] = useState<EmployeePermissions>(role.permissions);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const locked = isLocked(role);
  const editable = canEdit && !locked;
  const dirty = PERMISSION_GROUPS.some((group) =>
    group.items.some((key) => draft[key] !== role.permissions[key]),
  );
  const granted = Object.values(draft).filter(Boolean).length;

  function toggle(key: PermissionKey, value: boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    try {
      await update.mutateAsync({ id: role.id, permissions: draft });
      toast.success(t('companySettings:roles.saved', { role: role.name }));
    } catch (caught) {
      toast.error(t('domain:settings.saveError'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  }

  async function deleteRole() {
    try {
      await remove.mutateAsync(role.id);
      toast.success(t('companySettings:roles.deleted', { role: role.name }));
      setConfirmDelete(false);
    } catch (caught) {
      toast.error(t('companySettings:roles.deleteError'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  }

  return (
    <FormCard
      title={role.name}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={role.isSystem ? 'brand' : 'outline'}>
            {t(role.isSystem ? 'companySettings:roles.system' : 'companySettings:roles.custom')}
          </StatusBadge>
          <span>{t('companySettings:roles.members', { count: role.memberCount })}</span>
          <span aria-hidden>·</span>
          <span>{t('companySettings:roles.granted', { count: granted })}</span>
        </span>
      }
      action={
        editable && !role.isSystem ? (
          <Button
            appearance="subtle"
            icon={<Delete20Regular />}
            disabled={role.memberCount > 0}
            title={role.memberCount > 0 ? t('companySettings:roles.deleteBlocked') : undefined}
            onClick={() => setConfirmDelete(true)}
          >
            {t('common:action.delete')}
          </Button>
        ) : undefined
      }
      canEdit={editable}
      dirty={dirty}
      saving={update.isPending}
      onReset={() => setDraft(role.permissions)}
      onSave={() => void save()}
    >
      {locked ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>{t('companySettings:roles.ownerLocked')}</MessageBarBody>
        </MessageBar>
      ) : null}
      <Text className="text-muted-foreground">{t('companySettings:roles.hint')}</Text>
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.key} className="flex flex-col gap-1">
          <legend className="pb-2">
            <Text size={400} weight="semibold">
              {t(`companySettings:permissionGroups.${group.key}`)}
            </Text>
          </legend>
          {editable ? (
            group.items.map((key) => (
              <SwitchRow
                key={key}
                checked={draft[key]}
                label={t(`companySettings:permissions.${key}.title`)}
                description={t(`companySettings:permissions.${key}.description`)}
                onChange={(checked) => toggle(key, checked)}
              />
            ))
          ) : (
            // Nur lesend: Haken und Kreuz statt grauer Schalter, deren Stand
            // gesperrt kaum zu erkennen ist.
            <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
              {group.items.map((key) => (
                <li key={key} className="flex items-start gap-2.5">
                  {draft[key] ? (
                    <CheckmarkCircle20Filled className="text-success shrink-0" />
                  ) : (
                    <DismissCircle20Regular className="text-muted-foreground shrink-0" />
                  )}
                  <span className={draft[key] ? undefined : 'text-muted-foreground'}>
                    {t(`companySettings:permissions.${key}.title`)}
                    <span className="sr-only">
                      {' — '}
                      {t(
                        draft[key]
                          ? 'companySettings:roles.allowed'
                          : 'companySettings:roles.denied',
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      ))}

      <Dialog
        open={confirmDelete}
        onOpenChange={(_, d) => !remove.isPending && setConfirmDelete(d.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('companySettings:roles.deleteTitle', { role: role.name })}</DialogTitle>
            <DialogContent>{t('companySettings:roles.deleteText')}</DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                disabled={remove.isPending}
                onClick={() => setConfirmDelete(false)}
              >
                {t('common:action.cancel')}
              </Button>
              <DangerButton disabled={remove.isPending} onClick={() => void deleteRole()}>
                {t('common:action.delete')}
              </DangerButton>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </FormCard>
  );
}

function CreateRoleDialog({
  roles,
  open,
  onClose,
  onCreated,
}: {
  roles: CompanyRole[];
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useTranslation();
  const create = useCreateRole();
  const defaultTemplate =
    roles.find((role) => role.systemKey === 'employee')?.id ?? roles[0]?.id ?? '';
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('user');
  const [templateId, setTemplateId] = useState(defaultTemplate);
  const [submitted, setSubmitted] = useState(false);
  const trimmed = name.trim();
  const duplicate = roles.some((role) => role.name.toLowerCase() === trimmed.toLowerCase());
  const nameError = !submitted
    ? undefined
    : trimmed.length < 2
      ? t('companySettings:roles.nameShort')
      : duplicate
        ? t('companySettings:roles.nameTaken')
        : undefined;
  const template = roles.find((role) => role.id === (templateId || defaultTemplate));

  async function submit() {
    setSubmitted(true);
    if (trimmed.length < 2 || duplicate || !template) return;
    try {
      const id = await create.mutateAsync({
        name: trimmed,
        icon,
        permissions: template.permissions,
      });
      toast.success(t('companySettings:roles.created', { role: trimmed }));
      setName('');
      setSubmitted(false);
      onCreated(id);
      onClose();
    } catch (caught) {
      toast.error(t('companySettings:roles.createError'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && !create.isPending && onClose()}>
      <DialogSurface>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogBody>
            <DialogTitle>{t('companySettings:roles.createTitle')}</DialogTitle>
            <DialogContent className="flex flex-col gap-3">
              <Field label={t('companySettings:roles.name')} required validationMessage={nameError}>
                <Input
                  value={name}
                  maxLength={40}
                  placeholder={t('companySettings:roles.namePlaceholder')}
                  onChange={(_, d) => setName(d.value)}
                />
              </Field>
              <Field label={t('companySettings:roles.icon')}>
                <div className="flex flex-wrap gap-1" role="radiogroup">
                  {ROLE_ICONS.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <Button
                        key={entry.value}
                        role="radio"
                        aria-checked={icon === entry.value}
                        aria-label={t(`companySettings:roles.icons.${entry.value}`)}
                        appearance={icon === entry.value ? 'primary' : 'secondary'}
                        icon={<Icon />}
                        onClick={() => setIcon(entry.value)}
                      />
                    );
                  })}
                </div>
              </Field>
              <Field
                label={t('companySettings:roles.template')}
                hint={t('companySettings:roles.templateHint')}
              >
                <Dropdown
                  value={template?.name ?? ''}
                  selectedOptions={template ? [template.id] : []}
                  onOptionSelect={(_, d) => d.optionValue && setTemplateId(d.optionValue)}
                >
                  {roles.map((role) => (
                    <Option key={role.id} value={role.id}>
                      {role.name}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" disabled={create.isPending} onClick={onClose}>
                {t('common:action.cancel')}
              </Button>
              <Button
                appearance="primary"
                type="submit"
                disabled={create.isPending}
                icon={create.isPending ? <Spinner size="tiny" /> : undefined}
              >
                {t('companySettings:roles.create')}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}

/**
 * Rollen & Berechtigungen: links die Rollen mit Mitgliederzahl, rechts die
 * Standardrechte der gewählten Rolle. Abweichungen für einzelne Personen
 * stehen auf der Mitarbeiterseite.
 *
 * Rollen lassen sich nicht umbenennen (`trg_company_roles_block_rename`);
 * gelöscht werden nur eigene Rollen ohne Mitglieder.
 */
export function RolesPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const roles = useCompanyRoles();
  const { data: membership } = useMembership();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const list = roles.data ?? [];
  const selected =
    list.find((role) => role.id === selectedId) ??
    list.find((role) => role.name === membership?.role) ??
    list[0];

  return (
    <SectionGuard allowed={access.roles.view}>
      <SubPage
        title={t('companySettings:roles.title')}
        description={t('companySettings:roles.description')}
        wide
        actions={
          access.roles.edit ? (
            <Button appearance="primary" icon={<Add20Regular />} onClick={() => setCreating(true)}>
              {t('companySettings:roles.create')}
            </Button>
          ) : undefined
        }
      >
        {roles.isLoading || !selected ? (
          <SkeletonBlock className="h-96 w-full" />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:max-w-5xl">
            <RoleList roles={list} selectedId={selected.id} onSelect={setSelectedId} />
            <RoleEditor
              key={`${selected.id}:${JSON.stringify(selected.permissions)}`}
              role={selected}
              canEdit={access.roles.edit}
            />
          </div>
        )}
        {creating ? (
          <CreateRoleDialog
            roles={list}
            open
            onClose={() => setCreating(false)}
            onCreated={setSelectedId}
          />
        ) : null}
      </SubPage>
    </SectionGuard>
  );
}
