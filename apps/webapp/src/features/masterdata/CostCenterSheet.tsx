import {
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import { Button, DrawerBody, DrawerHeader, Input, Label } from '@fluentui/react-components';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';

import { isDuplicateCostCenterCode, useCreateCostCenter } from './useCostCenterMutations';

/**
 * Kostenstelle anlegen.
 *
 * Kurzes Formular, also ein Seitenpanel: die Liste bleibt dahinter sichtbar.
 * Das Formular wird nur gemountet, solange das Panel offen ist, und startet
 * damit jedes Mal frisch.
 */
export function CostCenterSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormDrawer open={open} onOpenChange={onOpenChange}>
      {open ? <CostCenterForm onDone={() => onOpenChange(false)} /> : null}
    </FormDrawer>
  );
}

function CostCenterForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const create = useCreateCostCenter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ids = {
    code: useId(),
    name: useId(),
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    // Nummer und Bezeichnung aus nur Leerzeichen waeren in der Liste nicht
    // wiederzufinden. Die Spalten selbst akzeptieren den leeren Text.
    if (!code.trim()) {
      setError(t('domain:costCenters.form.codeRequired'));
      return;
    }
    if (!name.trim()) {
      setError(t('domain:costCenters.form.nameRequired'));
      return;
    }

    try {
      await create.mutateAsync({ code, name });
      toast.success(t('domain:costCenters.form.saved'));
      onDone();
    } catch (caught) {
      setError(
        isDuplicateCostCenterCode(caught)
          ? t('domain:costCenters.form.duplicateCode')
          : (readableDbError(caught) ?? t('domain:costCenters.form.saveError')),
      );
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {t('domain:costCenters.form.title')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:costCenters.form.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={ids.code}>{t('domain:costCenters.columns.code')}</Label>
          <Input
            id={ids.code}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={ids.name}>{t('domain:costCenters.columns.name')}</Label>
          <Input id={ids.name} value={name} onChange={(event) => setName(event.target.value)} />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </DrawerBody>

      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={create.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}
