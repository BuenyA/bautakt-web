import { SkeletonBlock, toast } from '@bautakt/ui';
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
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Switch,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowUpload20Regular,
  Delete20Regular,
  Image20Regular,
  MoreHorizontalRegular,
  SaveRegular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { useReportUnsaved } from '@/components/common/unsavedChanges';
import { SubPage } from '@/components/layout/SubNavLayout';
import { useMembership } from '@/features/company/useMembership';
import { SectionCard } from '@/features/contacts/SectionCard';
import { PdfViewer } from '@/features/finance/PdfViewer';
import { readableDbError } from '@/lib/dbErrors';
import { ImageResizeError } from '@/lib/imageResize';
import { routes } from '@/lib/routes';

import { useCompanyAccess } from '../companyAccess';
import { logoVectorSibling, useCompanyLogo, useCompanyLogoUrl } from '../invoiceTemplate';
import {
  emptyTemplateForm,
  formFromTemplate,
  HEX_COLOR,
  type InvoiceTemplate,
  presetForm,
  type TemplateForm,
  useArchiveTemplate,
  useCreateTemplate,
  useInvoiceTemplates,
  useSetDefaultTemplate,
  useUpdateTemplate,
} from '../invoiceTemplates';
import { SectionGuard } from '../SectionGuard';
import { CompanyLogoError } from '../svgLogo';
import { Section, TemplateFields } from '../TemplateFields';
import { type CompanyRecord, useCompanyRecord } from '../useCompanyRecord';
import { PREVIEW_TYPES, type PreviewType, useTemplatePreview } from '../useLayoutTemplatePreview';

/** Pfadwert der festen Bautakt-Standardvorlage; sie hat keine Zeile in der Datenbank. */
const BUILTIN_TEMPLATE = 'bautakt';

const BUILTIN_FORM = emptyTemplateForm('standard');

const useStyles = makeStyles({
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '160px',
    height: '96px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} dashed ${tokens.colorNeutralStroke1}`,
    // Das Logo steht auf der Rechnung immer auf Weiß.
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
    color: tokens.colorNeutralForeground3,
  },
  picker: {
    minWidth: '260px',
  },
});

/**
 * Rechnungsvorlage (`/unternehmen/rechnungsvorlage[/:id]`): oben die Auswahl
 * der Vorlage mit „Neue Vorlage“ und „Speichern“, darunter links die
 * Einstellungen, rechts ein Beispielbeleg mit genau diesem Stand.
 *
 * „Bautakt Standard“ ist fest und hat keine Zeile in `invoice_templates`;
 * er gilt, solange keine eigene Vorlage vorausgewählt ist. Eigene Vorlagen
 * starten mit den Werten von „Spahrbau“ und lassen sich frei anpassen.
 */
export function InvoiceTemplatePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const access = useCompanyAccess();
  const templates = useInvoiceTemplates();
  const company = useCompanyRecord();

  const active = (templates.data ?? []).filter((row) => !row.archived_at);
  const preselected = active.find((row) => row.is_default) ?? null;
  const selectedId = id ?? preselected?.id ?? BUILTIN_TEMPLATE;
  const selected = active.find((row) => row.id === selectedId) ?? null;
  const missing = selectedId !== BUILTIN_TEMPLATE && !selected;

  return (
    <SectionGuard allowed={access.invoicing.view}>
      <SubPage
        title={t('companySettings:template.title')}
        description={t('companySettings:template.description')}
        wide
      >
        {templates.isLoading || company.isLoading || !company.data ? (
          <SkeletonBlock className="h-96 w-full" />
        ) : missing ? (
          <EmptyState
            title={t('domain:templates.notFound')}
            action={
              <LinkButton to={routes.companyInvoiceTemplate}>
                {t('domain:templates.back')}
              </LinkButton>
            }
          />
        ) : (
          <TemplateWorkspace
            // Neuer Formularstand je Vorlage; ein Wechsel mit offenen
            // Änderungen fragt vorher (UnsavedChangesGuard im Layout).
            key={selectedId}
            active={active}
            selected={selected}
            company={company.data}
            canEdit={access.invoicing.edit}
            canEditLogo={access.invoicing.editLogo}
          />
        )}
      </SubPage>
    </SectionGuard>
  );
}

function TemplateWorkspace({
  active,
  selected,
  company,
  canEdit,
  canEditLogo,
}: {
  active: InvoiceTemplate[];
  /** `null`: Bautakt Standard. */
  selected: InvoiceTemplate | null;
  company: CompanyRecord;
  canEdit: boolean;
  canEditLogo: boolean;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: membership } = useMembership();
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const setDefault = useSetDefaultTemplate();
  const archive = useArchiveTemplate();

  const builtin = selected === null;
  const [saved, setSaved] = useState(() => ({
    form: selected ? formFromTemplate(selected) : BUILTIN_FORM,
    preselect: selected ? selected.is_default : !active.some((row) => row.is_default),
  }));
  const [form, setForm] = useState<TemplateForm>(saved.form);
  const [preselect, setPreselect] = useState(saved.preselect);
  const [previewType, setPreviewType] = useState<PreviewType>('partial_invoice');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty =
    preselect !== saved.preselect || JSON.stringify(form) !== JSON.stringify(saved.form);
  useReportUnsaved(dirty);

  const preview = useTemplatePreview({
    companyId: membership?.companyId,
    templateId: selected?.id ?? null,
    form,
    type: previewType,
    logoPath: company.logo_image_url,
  });

  const set = (patch: Partial<TemplateForm>) => setForm((prev) => ({ ...prev, ...patch }));
  const nameMissing = !builtin && !form.name.trim();
  const colorInvalid =
    form.layout === 'letterhead' &&
    (!HEX_COLOR.test(form.primaryColor) || !HEX_COLOR.test(form.secondaryColor));
  const saving = update.isPending || setDefault.isPending;

  const fail = (caught: unknown) =>
    toast.error(t('domain:settings.saveError'), {
      description: readableDbError(caught) ?? (caught instanceof Error ? caught.message : ''),
    });

  const save = async () => {
    try {
      if (selected) await update.mutateAsync({ id: selected.id, form });
      if (preselect !== saved.preselect) {
        await setDefault.mutateAsync(preselect && selected ? selected.id : null);
      }
      setSaved({ form, preselect });
      toast.success(t('domain:settings.saved'));
    } catch (caught) {
      fail(caught);
    }
  };

  const createNew = async () => {
    try {
      const fresh = { ...presetForm('spahrbau'), name: t('domain:templates.newName') };
      const newId = await create.mutateAsync({ form: fresh, makeDefault: false });
      void navigate(routes.invoiceTemplate(newId));
    } catch (caught) {
      fail(caught);
    }
  };

  const remove = async () => {
    if (!selected) return;
    try {
      await archive.mutateAsync({ id: selected.id, archived: true });
      setConfirmDelete(false);
      // Nichts mehr offen, damit der Wechsel nicht nachfragt.
      setSaved({ form, preselect });
      toast.success(t('domain:templates.deleted'));
      void navigate(routes.invoiceTemplate(BUILTIN_TEMPLATE));
    } catch (caught) {
      fail(caught);
    }
  };

  const labelFor = (row: InvoiceTemplate | null) => {
    const name = row ? row.name : t('domain:templates.builtin');
    const isPreselected = row ? row.is_default : !active.some((r) => r.is_default);
    return isPreselected ? `${name} (${t('domain:templates.preselectedShort')})` : name;
  };
  const selectedValue = selected?.id ?? BUILTIN_TEMPLATE;

  return (
    <div className="flex flex-col gap-4">
      <Card size="large">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('domain:templates.pickerLabel')}>
            <Dropdown
              className={styles.picker}
              value={labelFor(selected)}
              selectedOptions={[selectedValue]}
              onOptionSelect={(_, data) => {
                if (data.optionValue && data.optionValue !== selectedValue) {
                  void navigate(routes.invoiceTemplate(data.optionValue));
                }
              }}
            >
              <Option value={BUILTIN_TEMPLATE}>{labelFor(null)}</Option>
              {active.map((row) => (
                <Option key={row.id} value={row.id}>
                  {labelFor(row)}
                </Option>
              ))}
            </Dropdown>
          </Field>
          {canEdit ? (
            <Button
              icon={create.isPending ? <Spinner size="tiny" /> : <AddRegular />}
              disabled={create.isPending}
              onClick={() => void createNew()}
            >
              {t('domain:templates.new')}
            </Button>
          ) : null}
          {canEdit ? (
            <div className="ml-auto flex items-center gap-2">
              {dirty ? (
                <Text className="text-muted-foreground">{t('domain:templates.unsaved')}</Text>
              ) : null}
              {selected ? (
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button
                      appearance="subtle"
                      icon={<MoreHorizontalRegular />}
                      aria-label={t('domain:templates.more')}
                    />
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      {form.layout === 'letterhead' ? (
                        <MenuItem
                          onClick={() => set({ ...presetForm('spahrbau'), name: form.name })}
                        >
                          {t('domain:templates.applySpahrbau')}
                        </MenuItem>
                      ) : null}
                      <MenuItem onClick={() => setConfirmDelete(true)}>
                        {t('domain:templates.delete')}
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              ) : null}
              <Button
                appearance="primary"
                icon={saving ? <Spinner size="tiny" /> : <SaveRegular />}
                disabled={!dirty || nameMissing || colorInvalid || saving}
                onClick={() => void save()}
              >
                {t('common:action.save')}
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-4">
          <Section title={t('domain:templates.sections.basics')}>
            {builtin ? (
              <MessageBar intent="info">
                <MessageBarBody>{t('domain:templates.builtinHint')}</MessageBarBody>
              </MessageBar>
            ) : (
              <Field
                label={t('domain:templates.fields.name')}
                required
                validationMessage={nameMissing ? t('domain:templates.nameRequired') : undefined}
              >
                <Input
                  value={form.name}
                  maxLength={80}
                  onChange={(_, d) => set({ name: d.value })}
                />
              </Field>
            )}
            <Switch
              checked={preselect}
              // Bautakt Standard abwählen geht nur, indem eine eigene Vorlage vorausgewählt wird.
              disabled={builtin && saved.preselect}
              label={t('domain:templates.fields.preselect')}
              onChange={(_, d) => setPreselect(d.checked)}
            />
            <Text size={200} className="text-muted-foreground">
              {t('domain:templates.fields.preselectHint')}
            </Text>
          </Section>

          <LogoCard key={company.logo_image_url ?? ''} company={company} canEdit={canEditLogo} />

          {builtin ? null : <TemplateFields form={form} set={set} />}
        </fieldset>

        <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-4 xl:h-[calc(100vh-8rem)]">
          <TabList
            selectedValue={previewType}
            onTabSelect={(_, d) => setPreviewType(d.value as PreviewType)}
            style={{ flexWrap: 'wrap' }}
          >
            {PREVIEW_TYPES.map((type) => (
              <Tab key={type} value={type}>
                {t(`domain:templates.documentTypes.${type}`)}
              </Tab>
            ))}
          </TabList>
          {preview.error ? (
            <MessageBar intent="warning">
              <MessageBarBody>{t('domain:templates.previewError')}</MessageBarBody>
            </MessageBar>
          ) : null}
          <div className="min-h-[32rem] flex-1">
            <PdfViewer
              data={preview.pdf}
              loading={preview.loading}
              emptyText={t('domain:templates.previewEmpty')}
            />
          </div>
          <Text size={200} className="text-muted-foreground">
            {t('domain:templates.previewHint')}
          </Text>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={(_, d) => setConfirmDelete(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('domain:templates.deleteTitle', { name: form.name })}</DialogTitle>
            <DialogContent>{t('domain:templates.deleteText')}</DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDelete(false)}>{t('common:action.cancel')}</Button>
              <Button
                appearance="primary"
                disabled={archive.isPending}
                onClick={() => void remove()}
              >
                {t('domain:templates.delete')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

function LogoCard({ company, canEdit }: { company: CompanyRecord; canEdit: boolean }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const logo = useCompanyLogo();
  const [vectorFailed, setVectorFailed] = useState(false);
  const vectorPath = vectorFailed ? null : logoVectorSibling(company.logo_image_url);
  const stored = useCompanyLogoUrl(company.logo_image_url);
  const vector = useCompanyLogoUrl(vectorPath);
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const waitingForVector = Boolean(vectorPath) && vector.isLoading;
  // SVG über die signierte URL, sonst die Rasterfassung. Beides nur als `<img>`.
  const src = vector.data ?? (waitingForVector ? undefined : stored.data);

  async function change(file: File | null) {
    try {
      await logo.mutateAsync({ file, previous: company.logo_image_url });
      toast.success(
        t(file ? 'companySettings:template.logoSaved' : 'companySettings:template.logoRemoved'),
      );
    } catch (caught) {
      const code =
        caught instanceof CompanyLogoError || caught instanceof ImageResizeError
          ? caught.code
          : null;
      const description = code
        ? t(`companySettings:template.logoErrors.${code}`)
        : (readableDbError(caught) ?? undefined);
      toast.error(t('companySettings:template.logoError'), { description });
    }
  }

  return (
    <SectionCard
      title={t('companySettings:template.logo')}
      description={t('companySettings:template.logoHint')}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className={styles.logoBox}>
          {logo.isPending || stored.isLoading || waitingForVector ? (
            <Spinner size="small" />
          ) : src ? (
            // Nur `<img>`. Kein innerHTML, kein Inline-SVG, kein `<object>`:
            // eine unbereinigte Datei aus dem Storage führt so kein Skript aus.
            <img
              src={src}
              alt={t('companySettings:template.logo')}
              className="max-h-full max-w-full object-contain"
              onError={() => {
                if (vectorPath) setVectorFailed(true);
              }}
            />
          ) : (
            <Image20Regular aria-label={t('companySettings:template.noLogo')} />
          )}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={setInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = '';
                if (file) void change(file);
              }}
            />
            <Button
              icon={<ArrowUpload20Regular />}
              disabled={logo.isPending}
              onClick={() => input?.click()}
            >
              {t(
                company.logo_image_url
                  ? 'companySettings:template.replaceLogo'
                  : 'companySettings:template.uploadLogo',
              )}
            </Button>
            {company.logo_image_url ? (
              <Button
                appearance="subtle"
                icon={<Delete20Regular />}
                disabled={logo.isPending}
                onClick={() => void change(null)}
              >
                {t('companySettings:template.removeLogo')}
              </Button>
            ) : null}
          </div>
        ) : (
          <Text className="text-muted-foreground">
            {t('companySettings:template.logoReadOnly')}
          </Text>
        )}
      </div>
    </SectionCard>
  );
}
