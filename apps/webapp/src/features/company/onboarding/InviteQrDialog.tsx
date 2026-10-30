import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { ArrowUploadRegular } from '@fluentui/react-icons';
import jsQR from 'jsqr';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractInviteToken } from '../invitations';

/** Kantenlaenge, auf die ein Kamerabild vor dem Dekodieren verkleinert wird. */
const SCAN_SIZE = 480;

type ScanError = 'camera' | 'notFound' | 'invalid';

function cameraAvailable(): boolean {
  return typeof navigator.mediaDevices?.getUserMedia === 'function';
}

/** Liest einen QR-Code aus einem Bild-, Video- oder Bitmap-Frame. */
function decode(
  source: CanvasImageSource,
  width: number,
  height: number,
  canvas: HTMLCanvasElement,
) {
  const scale = Math.min(1, SCAN_SIZE / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(image.data, image.width, image.height)?.data ?? null;
}

/**
 * Einladungs-QR wie in der App (`qr-code.tsx`), nur im Browser: Kamera ueber
 * `getUserMedia`, dekodiert mit `jsqr`. Ohne Kamera (Desktop ohne Webcam,
 * Zugriff verweigert) bleibt das Foto vom QR-Code als Weg.
 *
 * Nur offen mounten. Die Kamera laeuft, solange der Dialog steht; beim Schliessen werden
 * alle Spuren gestoppt, sonst bleibt die Kamera-LED an.
 */
export function InviteQrDialog({
  onClose,
  onToken,
}: {
  onClose: () => void;
  onToken: (token: string) => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Der Dialog wird nur offen gemountet (siehe Aufrufer); der Startzustand
  // ist damit bei jedem Öffnen frisch.
  const [starting, setStarting] = useState(cameraAvailable);
  const [error, setError] = useState<ScanError | null>(() => (cameraAvailable() ? null : 'camera'));

  function canvas() {
    canvasRef.current ??= document.createElement('canvas');
    return canvasRef.current;
  }

  /** `true`, wenn der Inhalt eine Einladung war und weitergereicht wurde. */
  function handleContent(content: string): boolean {
    const token = extractInviteToken(content);
    if (!token) {
      setError('invalid');
      return false;
    }
    onToken(token);
    return true;
  }

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    let lastInvalid = '';

    const scan = () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= video.HAVE_ENOUGH_DATA) {
        const content = decode(video, video.videoWidth, video.videoHeight, canvas());
        // Derselbe ungueltige Code steht meist viele Frames lang im Bild —
        // nur einmal melden und weiter scannen.
        if (content && content !== lastInvalid) {
          if (handleContent(content)) return;
          lastInvalid = content;
        }
      }
      frame = requestAnimationFrame(scan);
    };

    if (!cameraAvailable()) return;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        frame = requestAnimationFrame(scan);
      })
      .catch(() => {
        if (!stopped) setError('camera');
      })
      .finally(() => {
        if (!stopped) setStarting(false);
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // `handleContent` liest nur Setter und `onToken`; ein neuer Lauf der
    // Kamera pro Render waere falsch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const content = decode(bitmap, bitmap.width, bitmap.height, canvas());
      bitmap.close();
      if (!content) setError('notFound');
      else handleContent(content);
    } catch {
      setError('notFound');
    }
  }

  const errorText =
    error === 'camera'
      ? t('auth:setup.qr.cameraError')
      : error === 'notFound'
        ? t('auth:setup.qr.notFound')
        : error === 'invalid'
          ? t('auth:setup.qr.invalid')
          : null;

  return (
    <Dialog open onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('auth:setup.qr.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <Text>{t('auth:setup.qr.hint')}</Text>
            {errorText ? (
              <MessageBar intent={error === 'invalid' ? 'warning' : 'error'} role="alert">
                <MessageBarBody>{errorText}</MessageBarBody>
              </MessageBar>
            ) : null}
            {error !== 'camera' ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  aria-label={t('auth:setup.qr.title')}
                />
                {starting ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner label={t('auth:setup.qr.starting')} />
                  </div>
                ) : null}
              </div>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleFile(event)}
            />
          </DialogContent>
          <DialogActions>
            <Button icon={<ArrowUploadRegular />} onClick={() => fileRef.current?.click()}>
              {t('auth:setup.qr.upload')}
            </Button>
            <Button appearance="secondary" onClick={onClose}>
              {t('common:action.close')}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
