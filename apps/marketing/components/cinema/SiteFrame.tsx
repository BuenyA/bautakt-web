'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

import { t } from '@/lib/i18n';
import { legalNavigation, LOGIN_URL, navigation } from '@/lib/site';

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label={t('site:nav.home')}>
      {/* Das originale Markenasset bleibt geometrisch unverändert. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bautakt-logo.svg" width="220" height="40" alt={t('site:brand')} />
    </Link>
  );
}

export function Masthead() {
  const pathname = usePathname();
  const menu = useRef<HTMLDialogElement>(null);
  return (
    <header className={`masthead ${pathname === '/' ? 'masthead-film' : ''}`}>
      <a className="skip" href="#hauptinhalt">
        {t('site:nav.skip')}
      </a>
      <Wordmark />
      <nav className="masthead-links" aria-label={t('site:nav.label')}>
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
      <a className="login-link" href={LOGIN_URL}>
        {t('site:nav.login')}
        <span aria-hidden="true">↗</span>
      </a>
      <button
        className="menu-toggle"
        aria-label={t('site:nav.menu')}
        aria-haspopup="dialog"
        onClick={() => menu.current?.showModal()}
      >
        <span />
        <span />
      </button>
      <dialog ref={menu} className="menu-dialog" aria-label={t('site:nav.label')}>
        <button
          className="menu-close"
          onClick={() => menu.current?.close()}
          aria-label={t('site:nav.close')}
        >
          ×
        </button>
        <nav>
          {navigation.map((item, i) => (
            <Link key={item.href} href={item.href} onClick={() => menu.current?.close()}>
              <small>0{i + 1}</small>
              {t(item.key)}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      </dialog>
    </header>
  );
}

export function Colophon() {
  return (
    <footer className="colophon">
      <div className="colophon-top">
        <p>{t('site:footer.line')}</p>
        <Link href="/kontakt" aria-label={t('site:action.talk')}>
          ↗
        </Link>
      </div>
      <div className="colophon-main">
        <Wordmark />
        <nav aria-label={t('site:nav.label')}>
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="colophon-bottom">
        <span>{t('site:footer.copyright', { year: new Date().getFullYear() })}</span>
        <nav aria-label={t('site:nav.legal')}>
          {legalNavigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <a href="#hauptinhalt">{t('site:footer.backTop')} ↑</a>
      </div>
    </footer>
  );
}
