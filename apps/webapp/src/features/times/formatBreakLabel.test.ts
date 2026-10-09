/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { formatBreakLabel, formatBreakText } from './formatBreakLabel.ts';

const domain = JSON.parse(
  readFileSync(new URL('../../locales/de/domain.json', import.meta.url), 'utf8'),
) as { times: Record<string, string> };

function t(key: string, options?: Record<string, string | number>): string {
  const name = key.slice('domain:times.'.length);
  const template = domain.times[name];
  assert.ok(template, key);
  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => String(options?.[token] ?? ''));
}

describe('Pausenanzeige', () => {
  it('formatiert 0, 30, 60 und 75', () => {
    assert.equal(formatBreakText(0, t), '');
    assert.equal(formatBreakText(30, t), '30 Min.');
    assert.equal(formatBreakText(60, t), '1 Std.');
    assert.equal(formatBreakText(75, t), '1 Std. 15 Min.');

    assert.equal(formatBreakLabel(0, t), '');
    assert.equal(formatBreakLabel(30, t), 'Pause 30 Min.');
    assert.equal(formatBreakLabel(60, t), 'Pause 1 Std.');
    assert.equal(formatBreakLabel(75, t), 'Pause 1 Std. 15 Min.');
  });
});
