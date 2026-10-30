import {
  DEFAULT_PERMISSIONS,
  type EmployeePermissions,
  hasPermission,
  type PermissionKey,
} from '@bautakt/core';
import { FormDrawer, FormDrawerDescription, FormDrawerTitle, toast } from '@bautakt/ui';
import {
  Badge,
  Button,
  Caption1,
  DrawerBody,
  DrawerHeader,
  Switch,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import { ArrowResetRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DetailRow } from '@/components/common/DetailCard';
import { useMembership } from '@/features/company/useMembership';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';

import { PERMISSION_GROUPS } from './permissionGroups';
import { useUpdatePermissionOverrides } from './useEmployeeProfile';
import type { EmployeeRow } from './useEmployees';

/**
 * Rolle und persönliche Rechte. Bearbeiten wie in der App
 * (`employee/permissions.tsx`): Gespeichert werden nur Abweichungen von der
 * Rolle; wer einen Schalter auf den Wert der Rolle zurückstellt, löscht die
 * Abweichung. Rechte, die ich selbst nicht habe, kann ich nicht vergeben
 * (Inhaber ausgenommen) — die Datenbank prüft das ohnehin.
 */
export function RightsCard({
  employee,
  roleDefaults,
  canEdit,
}: {
  employee: EmployeeRow;
  roleDefaults: Partial<EmployeePermissions>;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const count = Object.keys(employee.permissionOverrides).length;

  return (
    <SectionCard
      title={t('domain:employeeProfile.rights.title')}
      action={
        <Button appearance="secondary" size="small" onClick={() => setOpen(true)}>
          {canEdit
            ? t('domain:employeeProfile.rights.edit')
            : t('domain:employeeProfile.rights.view')}
        </Button>
      }
    >
      <dl className="flex flex-col gap-4">
        <DetailRow label={t('domain:employees.columns.role')} value={employee.role} />
        <DetailRow
          label={t('domain:employeeProfile.rights.label')}
          value={
            count > 0
              ? t('domain:employeeProfile.rights.overrides', { count })
              : t('domain:employeeProfile.rights.standard')
          }
        />
      </dl>

      <FormDrawer open={open} onOpenChange={setOpen}>
        {open ? (
          <RightsEditor employee={employee} roleDefaults={roleDefaults} canEdit={canEdit} />
        ) : null}
      </FormDrawer>
    </SectionCard>
  );
}

function RightsEditor({
  employee,
  roleDefaults,
  canEdit,
}: {
  employee: EmployeeRow;
  roleDefaults: Partial<EmployeePermissions>;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const save = useUpdatePermissionOverrides();
  const [overrides, setOverrides] = useState(employee.permissionOverrides);
  const isOwner = membership?.systemKey === 'owner';
  const base: EmployeePermissions = { ...DEFAULT_PERMISSIONS, ...roleDefaults };

  function persist(next: Partial<EmployeePermissions>) {
    const previous = overrides;
    setOverrides(next);
    save.mutate(
      { id: employee.id, input: next },
      {
        onError: (error) => {
          setOverrides(previous);
          toast.error(t('domain:employeeProfile.rights.saveError'), {
            description: readableDbError(error) ?? undefined,
          });
        },
      },
    );
  }

  function toggle(key: PermissionKey, value: boolean) {
    const { [key]: _removed, ...rest } = overrides;
    persist(value === base[key] ? rest : { ...overrides, [key]: value });
  }

  const name = employee.name || t('domain:employees.unnamed');

  return (
    <>
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {t('domain:employeeProfile.rights.drawerTitle', { name })}
        </FormDrawerTitle>
        <FormDrawerDescription>
          {canEdit
            ? t('domain:employeeProfile.rights.drawerDescription', { role: employee.role })
            : t('domain:employeeProfile.rights.readOnly')}
        </FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-6 pb-6">
        {canEdit && Object.keys(overrides).length > 0 ? (
          <div>
            <Button
              appearance="secondary"
              size="small"
              icon={<ArrowResetRegular />}
              disabled={save.isPending}
              onClick={() => persist({})}
            >
              {t('domain:employeeProfile.rights.reset')}
            </Button>
          </div>
        ) : null}

        {PERMISSION_GROUPS.map((group) => (
          <section key={group.id} className="flex flex-col gap-1">
            <Text as="h3" weight="semibold">
              {t(`domain:employeeProfile.permissions.groups.${group.id}`)}
            </Text>
            <ul className="divide-border flex flex-col divide-y">
              {group.keys.map((key) => {
                const value = overrides[key] ?? base[key];
                const custom = overrides[key] !== undefined;
                // Einschalten nur, was ich selbst darf; ausschalten geht immer.
                const grantLocked =
                  !value && !isOwner && !hasPermission(membership?.permissions, key);
                // Ohne Recht zum Ändern Klartext: graue Schalter liest man schlecht.
                const control = !canEdit ? (
                  <Text className={value ? 'text-foreground' : 'text-muted-foreground'}>
                    {value
                      ? t('domain:employeeProfile.rights.on')
                      : t('domain:employeeProfile.rights.off')}
                  </Text>
                ) : (
                  <Switch
                    checked={value}
                    disabled={!canEdit || grantLocked}
                    onChange={(_, data) => toggle(key, data.checked)}
                    aria-label={t(`domain:employeeProfile.permissions.items.${key}.title`)}
                  />
                );
                return (
                  <li key={key} className="flex items-center justify-between gap-4 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2">
                        <Text>{t(`domain:employeeProfile.permissions.items.${key}.title`)}</Text>
                        {custom ? (
                          <Badge appearance="tint" color="brand" size="small">
                            {t('domain:employeeProfile.rights.custom')}
                          </Badge>
                        ) : null}
                      </span>
                      <Caption1 className="text-muted-foreground">
                        {t(`domain:employeeProfile.permissions.items.${key}.description`)}
                      </Caption1>
                    </span>
                    {canEdit && grantLocked ? (
                      <Tooltip
                        content={t('domain:employeeProfile.rights.grantLocked')}
                        relationship="description"
                      >
                        <span>{control}</span>
                      </Tooltip>
                    ) : (
                      control
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </DrawerBody>
    </>
  );
}
