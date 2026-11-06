import { Button } from '@fluentui/react-components';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const WIDTH = 560;
const HEIGHT = 200;

/**
 * Unterschrift am Gerät, mit Maus, Stift oder Finger. Das Bild ist schwarz auf
 * weiß, unabhängig vom Farbschema: Es ist ein Nachweis, kein Teil der
 * Oberfläche. Nach jedem Strich kommt das PNG über `onChange`; leer: `null`.
 */
export function SignaturePad({ onChange }: { onChange: (png: Blob | null) => void }) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const empty = useRef(true);

  useEffect(() => {
    clear();
    // Nur beim Einhängen; `clear` meldet selbst `null`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function context() {
    return canvas.current?.getContext('2d') ?? null;
  }

  function clear() {
    const ctx = context();
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    empty.current = true;
    onChange(null);
  }

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = context();
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = context();
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    empty.current = false;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (empty.current) return;
    canvas.current?.toBlob((blob) => onChange(blob), 'image/png');
  }

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        aria-label={t('domain:quotes.decision.signatureArea')}
        className="border-border w-full touch-none rounded border"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div>
        <Button size="small" onClick={clear}>
          {t('domain:quotes.decision.signatureClear')}
        </Button>
      </div>
    </div>
  );
}
