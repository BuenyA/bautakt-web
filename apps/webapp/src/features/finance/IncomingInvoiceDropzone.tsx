import { cn } from '@bautakt/ui';
import { CloudArrowUpRegular, HourglassHalfRegular } from '@fluentui/react-icons';
import { type DragEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { UPLOAD_ACCEPT } from './incomingInvoiceUpload';

/**
 * Ablegefläche für genau einen Beleg (PDF, E-Rechnungs-XML oder Foto), wie
 * `FileDropzone`. Bei mehreren Dateien zählt die erste.
 */
export function IncomingInvoiceDropzone({
  busy,
  onFile,
  className,
}: {
  busy: boolean;
  onFile: (file: File) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  function take(files: FileList | null) {
    const file = files?.[0];
    if (!file || busy) return;
    onFile(file);
  }

  function onDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (busy) return;
    depth.current += 1;
    setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setDragging(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    take(event.dataTransfer.files);
  }

  return (
    <label
      className={cn(
        'border-border bg-card focus-within:ring-ring data-[dragging=true]:border-brand-stroke data-[dragging=true]:bg-primary/10 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center shadow-sm transition-colors hover:border-border-strong focus-within:ring-2 focus-within:outline-none data-[busy=true]:opacity-60',
        className,
      )}
      data-dragging={dragging ? 'true' : 'false'}
      data-busy={busy ? 'true' : 'false'}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept={UPLOAD_ACCEPT}
        disabled={busy}
        className="sr-only"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = '';
        }}
      />
      {busy ? (
        <HourglassHalfRegular fontSize={22} className="text-brand" />
      ) : (
        <CloudArrowUpRegular fontSize={22} className="text-brand" />
      )}
      <span className="text-foreground text-sm font-medium">
        {busy
          ? t('domain:incomingInvoiceForm.upload.uploading')
          : t('domain:incomingInvoiceForm.upload.dropTitle')}
      </span>
      <span className="text-muted-foreground text-xs">
        {t('domain:incomingInvoiceForm.upload.dropHint')}
      </span>
    </label>
  );
}
