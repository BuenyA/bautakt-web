'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { t } from '@/lib/i18n';

import { ScenicMedia } from './ScenicMedia';

function TurningPoint({ paused }: { paused: boolean }) {
  const sequence = useRef<HTMLElement>(null);
  useEffect(() => {
    const host = sequence.current;
    if (!host) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      host.dataset.paused = String(paused);
      if (reduced.matches) {
        delete host.dataset.enhanced;
        return;
      }
      host.dataset.enhanced = 'true';
      const rect = host.getBoundingClientRect();
      const travel = Math.max(1, rect.height - innerHeight);
      const p = Math.max(0, Math.min(1, -rect.top / travel));
      host.dataset.chapter = p < 0.48 ? 'chaos' : 'clarity';
      host.style.setProperty('--passage', `${p * 100}%`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    reduced.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule);
      delete host.dataset.enhanced;
    };
  }, [paused]);
  return (
    <section
      id="geschichte"
      className="turning-point"
      ref={sequence}
      aria-label={t('site:home.chapterLabel')}
    >
      <div className="turning-stage">
        <article className="narrative-pane pane-chaos">
          <ScenicMedia scene="chaos" paused={paused} />
          <div className="film-scrim" />
          <div className="narrative-copy">
            <p className="eyeline">
              01 <span />
              {t('site:home.chaosLabel')}
            </p>
            <h2>
              {t('site:home.chaosFirst')}
              <br />
              <em>{t('site:home.chaosSecond')}</em>
            </h2>
            <p>{t('site:home.chaosBody')}</p>
          </div>
        </article>
        <article className="narrative-pane pane-clarity">
          <ScenicMedia scene="clarity" paused={paused} />
          <div className="film-scrim" />
          <div className="narrative-copy">
            <p className="eyeline">
              02 <span />
              {t('site:home.clarityLabel')}
            </p>
            <h2>{t('site:home.clarityTitle')}</h2>
            <p>{t('site:home.clarityBody')}</p>
          </div>
        </article>
        <div className="passage-meter" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}

export function Experience() {
  const [paused, setPaused] = useState(false);
  return (
    <>
      <section className="opening-film" aria-labelledby="opening-title">
        <ScenicMedia scene="intro" eager paused={paused} />
        <div className="opening-scrim" />
        <div className="opening-topline">
          <span className="status-dot" />
          {t('site:home.eyebrow')}
        </div>
        <div className="opening-type">
          <h1 id="opening-title">
            {t('site:home.first')}
            <br />
            <em>{t('site:home.second')}</em>
          </h1>
          <div className="opening-aside">
            <p>{t('site:home.description')}</p>
            <Link href="/funktionen#produktdemo" className="underlined-link">
              {t('site:action.explore')}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="opening-caption">
          <span>{t('site:home.corner')}</span>
          <a href="#geschichte">
            {t('site:action.next')} <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <TurningPoint paused={paused} />
      <section className="proof-editorial" aria-labelledby="proof-title">
        <div className="proof-introduction">
          <p className="eyeline">
            03 <span />
            {t('site:home.proofEyebrow')}
          </p>
          <h2 id="proof-title">{t('site:home.proofTitle')}</h2>
        </div>
        <div className="proof-lines">
          {['plan', 'communication', 'billing'].map((key, index) => (
            <article key={key}>
              <span className="proof-index" aria-hidden="true">
                0{index + 1}
              </span>
              <div className="proof-statement">
                <p className="eyeline">{t(`site:home.${key}`)}</p>
                <h3>{t(`site:home.proof${index + 1}`)}</h3>
              </div>
              <div className="proof-explanation">
                <p>{t(`site:home.proofBody${index + 1}`)}</p>
                {index === 2 && <small>{t('site:home.proofNote')}</small>}
                <Link
                  href={`/funktionen#${['einsatzplanung', 'auftraege', 'abrechnung'][index]}`}
                  aria-label={`${t('site:action.explore')}: ${t(`site:home.${key}`)}`}
                >
                  ↗
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="closing-film" aria-labelledby="closing-title">
        <ScenicMedia scene="finish" paused={paused} />
        <div className="film-scrim" />
        <div className="closing-copy">
          <p className="eyeline">
            04 <span />
            {t('site:home.endLabel')}
          </p>
          <h2 id="closing-title">
            {t('site:home.endFirst')}
            <br />
            <em>{t('site:home.endSecond')}</em>
          </h2>
          <p>{t('site:home.endBody')}</p>
          <Link className="solid-link" href="/kontakt">
            {t('site:action.end')}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <aside className="quick-access">
        <Link href="/funktionen#produktdemo">
          <span className="quick-symbol" aria-hidden="true">
            ↗
          </span>
          {t('site:action.quick')}
        </Link>
        <button
          onClick={() => setPaused(!paused)}
          aria-label={t(paused ? 'site:action.resume' : 'site:action.pause')}
          aria-pressed={paused}
        >
          <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span>
        </button>
      </aside>
    </>
  );
}
