'use client';

import { useEffect, useRef, useState } from 'react';

import { t } from '@/lib/i18n';

const modes = ['orders', 'team', 'finance'] as const;
const anchors = ['auftraege', 'einsatzplanung', 'abrechnung'];
export function ProductExplorer() {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [paid, setPaid] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const syncHash = () => {
      const index = anchors.indexOf(location.hash.slice(1));
      if (index >= 0) setActive(index);
    };
    const frame = requestAnimationFrame(syncHash);
    addEventListener('hashchange', syncHash);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('hashchange', syncHash);
    };
  }, []);
  const rows = [1, 2, 3].filter((i) =>
    `${t(`site:product.sample${i}`)} ${t(`site:product.client${i}`)}`
      .toLocaleLowerCase('de')
      .includes(query.toLocaleLowerCase('de')),
  );
  return (
    <section id="produktdemo" className="product-lab" aria-labelledby="lab-title">
      {anchors.map((id) => (
        <span className="anchor-marker" id={id} key={id} />
      ))}
      <div className="lab-intro">
        <h2 id="lab-title">{t('site:product.demoTitle')}</h2>
        <p>{t('site:product.demoHint')}</p>
      </div>
      <div className="lab-window">
        <div className="lab-titlebar">
          <span className="window-mark" aria-hidden="true">
            B
          </span>
          <strong>{t('site:product.company')}</strong>
          <span>{t('site:product.workspace')}</span>
        </div>
        <div
          className="lab-tabs"
          role="tablist"
          aria-label={t('site:nav.product')}
          ref={tabs}
          onKeyDown={(event) => {
            let next = active;
            if (event.key === 'ArrowRight') next = (active + 1) % 3;
            else if (event.key === 'ArrowLeft') next = (active + 2) % 3;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = 2;
            else return;
            event.preventDefault();
            setActive(next);
            tabs.current?.querySelectorAll<HTMLButtonElement>('button')[next].focus();
          }}
        >
          {modes.map((mode, index) => (
            <button
              key={mode}
              id={`tab-${mode}`}
              role="tab"
              aria-selected={active === index}
              aria-controls={`panel-${mode}`}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
            >
              <span aria-hidden="true">0{index + 1}</span>
              {t(`site:product.tabs.${mode}`)}
            </button>
          ))}
        </div>
        <div
          id="panel-orders"
          role="tabpanel"
          aria-labelledby="tab-orders"
          hidden={active !== 0}
          className="lab-panel"
          tabIndex={0}
        >
          <div className="lab-toolbar">
            <h3>
              {t('site:product.tabs.orders')}
              <small aria-live="polite">{t('site:product.count', { count: rows.length })}</small>
            </h3>
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                ref={search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('site:product.search')}
                aria-label={t('site:product.search')}
              />
            </label>
          </div>
          <div className="order-table">
            <div className="order-table-heading">
              <span>{t('site:product.project')}</span>
              <span>{t('site:product.client')}</span>
              <span>{t('site:product.status')}</span>
            </div>
            {rows.map((i) => (
              <button
                className="order-table-row"
                key={i}
                aria-expanded={selected === i}
                aria-controls="sample-details"
                onClick={() => setSelected(selected === i ? null : i)}
              >
                <span>
                  <b className="project-square" aria-hidden="true">
                    0{i}
                  </b>
                  <strong>{t(`site:product.sample${i}`)}</strong>
                </span>
                <span>{t(`site:product.client${i}`)}</span>
                <span className={`status-label status-${i}`}>
                  {t(`site:product.${['active', 'planned', 'complete'][i - 1]}`)}
                  <i aria-hidden="true">↗</i>
                </span>
              </button>
            ))}
          </div>
          {rows.length === 0 && <p className="empty-result">{t('site:product.noResults')}</p>}
          <div id="sample-details" hidden={selected === null} className="sample-details">
            <div>
              <p className="eyeline">{t('site:product.detail')}</p>
              <h4>{selected && t(`site:product.sample${selected}`)}</h4>
              <p>{t('site:product.detailNote')}</p>
            </div>
            <div>
              <strong>{t('site:product.documents')}</strong>
              <ul>
                {[1, 2, 3].map((i) => (
                  <li key={i}>{t(`site:product.document${i}`)}</li>
                ))}
              </ul>
            </div>
            <button
              aria-label={t('site:product.close')}
              onClick={() => {
                setSelected(null);
                search.current?.focus();
              }}
            >
              ×
            </button>
          </div>
        </div>
        <div
          id="panel-team"
          role="tabpanel"
          aria-labelledby="tab-team"
          hidden={active !== 1}
          className="lab-panel"
          tabIndex={0}
        >
          <h3>{t('site:product.week')}</h3>
          <div className="planner-scroll">
            <table className="planner">
              <thead>
                <tr>
                  <th aria-label={t('site:product.tabs.team')} />
                  <th>{t('site:product.monday')}</th>
                  <th>{t('site:product.tuesday')}</th>
                  <th>{t('site:product.wednesday')}</th>
                  <th>{t('site:product.thursday')}</th>
                  <th>{t('site:product.friday')}</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i}>
                    <th scope="row">{t(`site:product.person${i}`)}</th>
                    {[0, 1, 2, 3, 4].map((day) => (
                      <td key={day}>
                        <span className={`assignment assignment-${i}`}>
                          {t(`site:product.${day === 4 && i === 3 ? 'absent' : `job${i}`}`)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div
          id="panel-finance"
          role="tabpanel"
          aria-labelledby="tab-finance"
          hidden={active !== 2}
          className="lab-panel"
          tabIndex={0}
        >
          <div className="invoice-demo">
            <div>
              <p className="eyeline">{t('site:product.tabs.finance')}</p>
              <h3>{t('site:product.financeTitle')}</h3>
              <p>{t('site:product.financeBody')}</p>
              <button className="outline-control" onClick={() => setPaid(!paid)}>
                {t('site:product.paidLabel')}
                <span aria-hidden="true">↔</span>
              </button>
              <small>{t('site:product.invoiceNote')}</small>
            </div>
            <article className="invoice-paper">
              <div>
                <span>{t('site:product.invoice')}</span>
                <b>{t('site:product.reference')}</b>
              </div>
              <p>{t('site:product.recipient')}</p>
              <hr />
              <small>{t('site:product.total')}</small>
              <strong>{t('site:product.amount')}</strong>
              <p aria-live="polite" className={`invoice-state ${paid ? 'is-paid' : ''}`}>
                {t(paid ? 'site:product.paid' : 'site:product.due')}
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
