'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

import { media, type SceneName } from '@/content/media';

export function ScenicMedia({
  scene,
  eager = false,
  paused = false,
}: {
  scene: SceneName;
  eager?: boolean;
  paused?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const asset = media[scene];
  useEffect(() => {
    const player = film.current;
    const container = host.current;
    if (!player || !container || !asset.video) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    let onScreen = false;
    const update = () => {
      const save = connection?.saveData || /2g/.test(connection?.effectiveType ?? '');
      if (paused || reduced.matches || save || document.hidden || !onScreen) {
        player.pause();
        return;
      }
      if (!player.getAttribute('src')) player.src = asset.video!;
      void player.play().catch(() => {});
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        update();
      },
      { threshold: 0.15 },
    );
    observer.observe(container);
    reduced.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    connection?.addEventListener('change', update);
    return () => {
      observer.disconnect();
      reduced.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      connection?.removeEventListener('change', update);
      player.pause();
    };
  }, [asset.video, paused]);
  return (
    <div
      className={`scenic-media scenic-${scene} ${asset.poster ? '' : 'scenic-pending'}`}
      ref={host}
      aria-hidden="true"
    >
      {asset.poster && (
        <Image src={asset.poster} alt="" fill sizes="100vw" priority={eager} quality={75} />
      )}
      {asset.video && (
        <video
          ref={film}
          loop
          muted
          playsInline
          preload="none"
          poster={asset.poster}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      {!asset.poster && (
        <div className="architectural-light">
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}
