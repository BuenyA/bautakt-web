import { CloudArrowUpRegular, HourglassHalfRegular } from '@fluentui/react-icons';
import { type DragEvent, type RefObject, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

/**
 * Ablegefläche und Dateiauswahl. Mehrere Dateien auf einmal.
 * Die Fläche nutzt die Token, kein festes Hex — Hell und Dunkel bleiben lesbar.
 */
export function OrderPhotoDropzone({
  busy,
  inputRef,
  onFiles,
}: {
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void;
}) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  function take(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    onFiles([...files]);
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
      className="border-border bg-card focus-within:ring-ring data-[dragging=true]:border-brand-stroke data-[dragging=true]:bg-primary/10 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center shadow-sm transition-colors hover:border-border-strong focus-within:ring-2 focus-within:outline-none data-[busy=true]:opacity-60"
      data-dragging={dragging ? 'true' : 'false'}
      data-busy={busy ? 'true' : 'false'}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
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
      <span className="text-foreground text-sm font-medium">{t('domain:photoForm.dropTitle')}</span>
      <span className="text-muted-foreground text-xs">{t('domain:photoForm.dropHint')}</span>
    </label>
  );
}
