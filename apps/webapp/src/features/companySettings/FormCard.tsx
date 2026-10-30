import { Button, Spinner } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useReportUnsaved } from '@/components/common/unsavedChanges';
import { SectionCard } from '@/features/contacts/SectionCard';

/**
 * Karte mit Formular: „Speichern“ erst bei Änderungen, „Verwerfen“ setzt auf
 * den gespeicherten Stand zurück. Ohne Recht sind die Felder gesperrt und
 * keine Knöpfe da. Ungespeicherte Eingaben melden sich beim
 * `UnsavedChangesGuard` des Bereichs.
 */
export function FormCard({
  title,
  description,
  canEdit,
  dirty,
  saving,
  onSave,
  onReset,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  canEdit: boolean;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset?: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  useReportUnsaved(canEdit && dirty);

  return (
    <SectionCard title={title} description={description} action={action}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        {children}
        {canEdit ? (
          <div className="flex justify-end gap-2">
            {onReset && dirty ? (
              <Button appearance="secondary" disabled={saving} onClick={onReset}>
                {t('common:action.discard')}
              </Button>
            ) : null}
            <Button
              appearance="primary"
              type="submit"
              disabled={!dirty || saving}
              icon={saving ? <Spinner size="tiny" /> : undefined}
            >
              {t('common:action.save')}
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
