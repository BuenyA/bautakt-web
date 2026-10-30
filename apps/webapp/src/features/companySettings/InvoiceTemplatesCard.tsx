import { SkeletonBlock, StatusBadge, toast } from '@bautakt/ui';
import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
} from '@fluentui/react-components';
import { AddRegular, MoreHorizontalRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { LinkButton } from '@/components/common/LinkButton';
import { usePermission } from '@/features/company/usePermission';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';

import {
  type InvoiceTemplate,
  presetForm,
  type TemplatePreset,
  useArchiveTemplate,
  useCreateTemplate,
  useInvoiceTemplates,
  useSetDefaultTemplate,
} from './invoiceTemplates';

const PRESETS: TemplatePreset[] = ['spahrbau', 'letterhead', 'standard'];

/**
 * Bereich „Rechnungsvorlagen“: welche Vorlagen der Betrieb hat und welche
 * Standard ist. Bearbeitet wird auf einer eigenen Seite mit Live-Vorschau.
 * Ohne Vorlage gilt das bisherige Bautakt-Layout.
 */
export function InvoiceTemplatesCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canEdit = usePermission('canManageCompanySettings');
  const canBilling = usePermission('canUseBillingModule');
  const templates = useInvoiceTemplates();
  const create = useCreateTemplate();
  const setDefault = useSetDefaultTemplate();
  const archive = useArchiveTemplate();

  if (!canEdit && !canBilling) return null;

  const fail = (caught: unknown) =>
    toast.error(t('domain:settings.saveError'), {
      description: readableDbError(caught) ?? (caught instanceof Error ? caught.message : ''),
    });

  const createFrom = async (preset: TemplatePreset) => {
    try {
      const list = templates.data ?? [];
      const form = presetForm(preset);
      form.name = form.name || t(`domain:templates.presets.${preset}`);
      const id = await create.mutateAsync({
        form,
        makeDefault: !list.some((row) => row.is_default),
      });
      void navigate(routes.invoiceTemplate(id));
    } catch (caught) {
      fail(caught);
    }
  };

  const active = (templates.data ?? []).filter((row) => !row.archived_at);
  const archived = (templates.data ?? []).filter((row) => row.archived_at);

  return (
    <SectionCard
      title={t('domain:templates.title')}
      description={
        <Text size={200} className="text-muted-foreground">
          {t('domain:templates.description')}
        </Text>
      }
      action={
        canEdit ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button icon={<AddRegular />} disabled={create.isPending}>
                {t('domain:templates.new')}
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {PRESETS.map((preset) => (
                  <MenuItem key={preset} onClick={() => void createFrom(preset)}>
                    {t(`domain:templates.presetMenu.${preset}`)}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : undefined
      }
    >
      {templates.isLoading ? (
        <SkeletonBlock className="h-24 w-full" />
      ) : templates.isError ? (
        <Text className="text-destructive">{t('domain:templates.loadError')}</Text>
      ) : (
        <ul className="flex flex-col divide-y">
          {active.length === 0 ? (
            <li className="py-2">
              <Text size={200} className="text-muted-foreground">
                {t('domain:templates.empty')}
              </Text>
            </li>
          ) : null}
          {[...active, ...archived].map((row) => (
            <TemplateRow
              key={row.id}
              row={row}
              canEdit={canEdit}
              onDefault={() =>
                setDefault
                  .mutateAsync(row.is_default ? null : row.id)
                  .then(() => toast.success(t('domain:settings.saved')))
                  .catch(fail)
              }
              onArchive={() =>
                archive
                  .mutateAsync({ id: row.id, archived: !row.archived_at })
                  .then(() => toast.success(t('domain:settings.saved')))
                  .catch(fail)
              }
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function TemplateRow({
  row,
  canEdit,
  onDefault,
  onArchive,
}: {
  row: InvoiceTemplate;
  canEdit: boolean;
  onDefault: () => void;
  onArchive: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li className="flex flex-wrap items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Text weight="semibold" className={row.archived_at ? 'text-muted-foreground' : undefined}>
          {row.name}
        </Text>
        <StatusBadge tone="outline">{t(`domain:templates.layouts.${row.layout}`)}</StatusBadge>
        {row.is_default ? (
          <StatusBadge tone="success">{t('domain:templates.default')}</StatusBadge>
        ) : null}
        {row.archived_at ? (
          <StatusBadge tone="neutral">{t('domain:templates.archived')}</StatusBadge>
        ) : null}
      </div>
      {canEdit ? (
        <>
          <LinkButton to={routes.invoiceTemplate(row.id)} size="small">
            {t('common:action.edit')}
          </LinkButton>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                size="small"
                appearance="subtle"
                icon={<MoreHorizontalRegular />}
                aria-label={t('domain:templates.more')}
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {!row.archived_at ? (
                  <MenuItem onClick={onDefault}>
                    {row.is_default
                      ? t('domain:templates.unsetDefault')
                      : t('domain:templates.setDefault')}
                  </MenuItem>
                ) : null}
                <MenuItem onClick={onArchive}>
                  {row.archived_at ? t('domain:templates.restore') : t('domain:templates.archive')}
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </>
      ) : null}
    </li>
  );
}
