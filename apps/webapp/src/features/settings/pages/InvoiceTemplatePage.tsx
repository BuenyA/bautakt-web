import { TEMPLATE_TEXT_TYPES } from '@bautakt/document-render';
import { toast } from '@bautakt/ui';
import {
  Button,
  Card,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Select,
  Spinner,
  Switch,
  Tab,
  TabList,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { PdfViewer } from '@/features/finance/PdfViewer';
import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';

import {
  formFromTemplate,
  HEX_COLOR,
  presetForm,
  type TemplateForm,
  type TemplateTextType,
  useInvoiceTemplates,
  useUpdateTemplate,
} from '../invoiceTemplates';
import { PREVIEW_TYPES, type PreviewType, useTemplatePreview } from '../useTemplatePreview';

/**
 * Vorlage bearbeiten (`/einstellungen/rechnungsvorlagen/:id`): links die
 * Einstellungen, rechts ein Beispielbeleg mit genau dieser Vorlage, live aus
 * dem Formular gerendert. Gespeichert wird nur auf Klick.
 *
 * Firmendaten (Anschrift, Telefon, E-Mail, Hauptbank, Steuernummer, Register,
 * Logo) stehen nicht hier, sondern bleiben in der Einrichtung — eine Vorlage
 * ergänzt sie nur.
 */
export function InvoiceTemplatePage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { data: membership } = useMembership();
  const canEdit = usePermission('canManageCompanySettings');
  const templates = useInvoiceTemplates();
  const update = useUpdateTemplate();
  const template = templates.data?.find((row) => row.id === id);

  const [form, setForm] = useState<TemplateForm | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType>('partial_invoice');
  const [textType, setTextType] = useState<TemplateTextType>('partial_invoice');

  if (template && form === null) {
    const loaded = formFromTemplate(template);
    setForm(loaded);
    setBaseline(JSON.stringify(loaded));
  }

  const preview = useTemplatePreview({
    companyId: membership?.companyId,
    templateId: id,
    form,
    type: previewType,
  });

  if (templates.isLoading) return <PageSpinner />;
  if (!template || !form) {
    return (
      <EmptyState
        title={t('domain:templates.notFound')}
        action={<LinkButton to={routes.settings}>{t('domain:templates.back')}</LinkButton>}
      />
    );
  }

  const set = (patch: Partial<TemplateForm>) =>
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  const letterhead = form.layout === 'letterhead';
  const dirty = JSON.stringify(form) !== baseline;
  const nameMissing = !form.name.trim();
  const colorInvalid =
    letterhead && (!HEX_COLOR.test(form.primaryColor) || !HEX_COLOR.test(form.secondaryColor));

  const save = async () => {
    try {
      await update.mutateAsync({ id, form });
      setBaseline(JSON.stringify(form));
      toast.success(t('domain:settings.saved'));
    } catch (caught) {
      toast.error(t('domain:settings.saveError'), {
        description: readableDbError(caught) ?? (caught instanceof Error ? caught.message : ''),
      });
    }
  };

  const textEntry = form.texts[textType];
  const setText = (patch: Partial<typeof textEntry>) =>
    set({ texts: { ...form.texts, [textType]: { ...textEntry, ...patch } } });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={form.name || t('domain:templates.untitled')}
        description={t('domain:templates.editDescription')}
        actions={
          <div className="flex gap-2">
            <LinkButton to={routes.settings}>{t('domain:templates.back')}</LinkButton>
            {canEdit ? (
              <Button
                appearance="primary"
                disabled={!dirty || nameMissing || colorInvalid || update.isPending}
                icon={update.isPending ? <Spinner size="tiny" /> : undefined}
                onClick={() => void save()}
              >
                {t('common:action.save')}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-4">
          <Section title={t('domain:templates.sections.basics')}>
            <div className="grid gap-4 md:grid-cols-2">
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
              <Field label={t('domain:templates.fields.layout')}>
                <Select
                  value={form.layout}
                  onChange={(_, d) =>
                    set({ layout: d.value === 'letterhead' ? 'letterhead' : 'standard' })
                  }
                >
                  <option value="standard">{t('domain:templates.layouts.standard')}</option>
                  <option value="letterhead">{t('domain:templates.layouts.letterhead')}</option>
                </Select>
              </Field>
            </div>
            {!letterhead ? (
              <Text size={200} className="text-muted-foreground">
                {t('domain:templates.standardHint')}
              </Text>
            ) : null}
            {canEdit ? (
              <div>
                <Button
                  size="small"
                  onClick={() => set({ ...presetForm('spahrbau'), name: form.name })}
                >
                  {t('domain:templates.applySpahrbau')}
                </Button>
              </div>
            ) : null}
          </Section>

          {letterhead ? (
            <>
              <Section title={t('domain:templates.sections.design')}>
                <div className="grid gap-4 md:grid-cols-2">
                  <ColorField
                    label={t('domain:templates.fields.primaryColor')}
                    hint={t('domain:templates.fields.primaryColorHint')}
                    value={form.primaryColor}
                    onChange={(value) => set({ primaryColor: value })}
                  />
                  <ColorField
                    label={t('domain:templates.fields.secondaryColor')}
                    hint={t('domain:templates.fields.secondaryColorHint')}
                    value={form.secondaryColor}
                    onChange={(value) => set({ secondaryColor: value })}
                  />
                </div>
                <Switch
                  checked={form.sideStripes}
                  label={t('domain:templates.fields.sideStripes')}
                  onChange={(_, d) => set({ sideStripes: d.checked })}
                />
                <Field
                  label={t('domain:templates.fields.services')}
                  hint={t('domain:templates.fields.servicesHint')}
                >
                  <Textarea
                    rows={3}
                    value={form.services}
                    onChange={(_, d) => set({ services: d.value })}
                  />
                </Field>
                <Field label={t('domain:templates.fields.slogan')}>
                  <Input value={form.slogan} onChange={(_, d) => set({ slogan: d.value })} />
                </Field>
                <Text size={200} className="text-muted-foreground">
                  {t('domain:templates.logoHint')}
                </Text>
              </Section>

              <Section title={t('domain:templates.sections.letter')}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label={t('domain:templates.fields.reference')}
                    hint={t('domain:templates.fields.referenceHint')}
                  >
                    <Input
                      value={form.reference}
                      onChange={(_, d) => set({ reference: d.value })}
                    />
                  </Field>
                  <Field label={t('domain:templates.fields.closingGreeting')}>
                    <Input
                      value={form.closingGreeting}
                      onChange={(_, d) => set({ closingGreeting: d.value })}
                    />
                  </Field>
                </div>
                <Field
                  label={t('domain:templates.fields.signatureLines')}
                  hint={t('domain:templates.fields.linesHint')}
                >
                  <Textarea
                    rows={2}
                    value={form.signatureLines}
                    onChange={(_, d) => set({ signatureLines: d.value })}
                  />
                </Field>
              </Section>

              <Section title={t('domain:templates.sections.footer')}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t('domain:templates.fields.fax')}>
                    <Input value={form.fax} onChange={(_, d) => set({ fax: d.value })} />
                  </Field>
                  <Field label={t('domain:templates.fields.website')}>
                    <Input value={form.website} onChange={(_, d) => set({ website: d.value })} />
                  </Field>
                </div>
                <Field
                  label={t('domain:templates.fields.legalLine')}
                  hint={t('domain:templates.fields.legalLineHint')}
                >
                  <Input value={form.legalLine} onChange={(_, d) => set({ legalLine: d.value })} />
                </Field>
                <div className="flex flex-col gap-2">
                  <Text weight="semibold">{t('domain:templates.fields.extraBanks')}</Text>
                  <Text size={200} className="text-muted-foreground">
                    {t('domain:templates.fields.extraBanksHint')}
                  </Text>
                  {form.extraBankAccounts.map((bank, index) => {
                    const change = (patch: Partial<typeof bank>) =>
                      set({
                        extraBankAccounts: form.extraBankAccounts.map((b, i) =>
                          i === index ? { ...b, ...patch } : b,
                        ),
                      });
                    return (
                      <div
                        key={index}
                        className="grid items-end gap-2 md:grid-cols-[1fr_1.4fr_1fr_auto]"
                      >
                        <Field label={t('domain:templates.fields.bankName')}>
                          <Input
                            value={bank.bankName}
                            onChange={(_, d) => change({ bankName: d.value })}
                          />
                        </Field>
                        <Field label="IBAN">
                          <Input value={bank.iban} onChange={(_, d) => change({ iban: d.value })} />
                        </Field>
                        <Field label="BIC">
                          <Input value={bank.bic} onChange={(_, d) => change({ bic: d.value })} />
                        </Field>
                        <Button
                          appearance="subtle"
                          icon={<DeleteRegular />}
                          aria-label={t('common:action.delete')}
                          onClick={() =>
                            set({
                              extraBankAccounts: form.extraBankAccounts.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        />
                      </div>
                    );
                  })}
                  {form.extraBankAccounts.length < 3 ? (
                    <div>
                      <Button
                        size="small"
                        icon={<AddRegular />}
                        onClick={() =>
                          set({
                            extraBankAccounts: [
                              ...form.extraBankAccounts,
                              { bankName: '', iban: '', bic: '' },
                            ],
                          })
                        }
                      >
                        {t('domain:templates.fields.addBank')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Section>
            </>
          ) : null}

          <Section title={t('domain:templates.sections.texts')}>
            <Text size={200} className="text-muted-foreground">
              {t('domain:templates.textsHint')}
            </Text>
            <Field label={t('domain:templates.fields.documentType')}>
              <Select
                value={textType}
                onChange={(_, d) => setTextType(d.value as TemplateTextType)}
              >
                {TEMPLATE_TEXT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`domain:templates.documentTypes.${type}`)}
                  </option>
                ))}
              </Select>
            </Field>
            {letterhead ? (
              <Field
                label={t('domain:templates.fields.title')}
                hint={t('domain:templates.fields.titleHint')}
              >
                <Input value={textEntry.title} onChange={(_, d) => setText({ title: d.value })} />
              </Field>
            ) : null}
            <Field label={t('domain:templates.fields.intro')}>
              <Textarea
                rows={3}
                value={textEntry.intro}
                onChange={(_, d) => setText({ intro: d.value })}
              />
            </Field>
            <Field label={t('domain:templates.fields.footer')}>
              <Textarea
                rows={3}
                value={textEntry.footer}
                onChange={(_, d) => setText({ footer: d.value })}
              />
            </Field>
          </Section>
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="large">
      <Text as="h2" size={400} weight="semibold">
        {title}
      </Text>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const valid = HEX_COLOR.test(value);
  return (
    <Field
      label={label}
      hint={hint}
      validationMessage={valid ? undefined : t('domain:templates.colorInvalid')}
    >
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          value={valid ? value : '#000000'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <Input className="min-w-0 flex-1" value={value} onChange={(_, d) => onChange(d.value)} />
      </div>
    </Field>
  );
}
