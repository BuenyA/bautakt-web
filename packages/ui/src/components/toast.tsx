import {
  Toast,
  ToastBody,
  Toaster,
  ToastTitle,
  useId,
  useToastController,
} from '@fluentui/react-components';
import * as React from 'react';

/**
 * Rückmeldungen nach dem Speichern, auf Fluents `Toaster`.
 *
 * Fluent zeigt Toasts über einen Hook (`useToastController`), der nur
 * innerhalb des Providers lebt. Die App ruft aber an 30 Stellen schlicht
 * `toast.success(text)` aus Event-Handlern und Mutationen. `AppToaster`
 * registriert deshalb seinen Dispatcher in diesem Modul, und `toast` reicht
 * die Aufrufe dorthin durch. Ohne gemounteten `AppToaster` passiert nichts.
 */

type Intent = 'success' | 'error' | 'warning' | 'info';
type ToastOptions = { description?: string };
type Dispatch = (intent: Intent, title: string, options?: ToastOptions) => void;

let dispatch: Dispatch | null = null;

function show(intent: Intent) {
  return (title: string, options?: ToastOptions) => dispatch?.(intent, title, options);
}

export const toast = {
  success: show('success'),
  error: show('error'),
  warning: show('warning'),
  info: show('info'),
};

export function AppToaster({ label }: { label: string }) {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  React.useEffect(() => {
    dispatch = (intent, title, options) => {
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {options?.description ? <ToastBody>{options.description}</ToastBody> : null}
        </Toast>,
        { intent, politeness: intent === 'error' ? 'assertive' : 'polite' },
      );
    };
    return () => {
      dispatch = null;
    };
  }, [dispatchToast]);

  return <Toaster toasterId={toasterId} position="bottom-end" aria-label={label} />;
}
