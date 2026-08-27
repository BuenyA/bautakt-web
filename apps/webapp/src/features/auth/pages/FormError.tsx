import { useTranslation } from 'react-i18next';

/** Nimmt einen i18n-Key entgegen, nie einen fertigen Text. */
export function FormError({ messageKey }: { messageKey: string | null }) {
  const { t } = useTranslation();
  if (!messageKey) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
      {t(messageKey)}
    </p>
  );
}
