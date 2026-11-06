/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  exportErrorKey,
  type ExportStatus,
  exportView,
  formatBytes,
  pollInterval,
} from './fullExport.ts';

const base: ExportStatus = {
  id: 'e1',
  status: 'running',
  requested_at: '2026-11-06T10:00:00.000Z',
  completed_at: null,
  files_valid_until: null,
  row_count: null,
  file_count: null,
  total_bytes: null,
  manifest_sha256: null,
  parts_total: 0,
  parts_done: 0,
  expired: false,
  downloads: [],
};

describe('exportView', () => {
  it('ohne Export', () => {
    assert.deepEqual(exportView(undefined), { kind: 'none' });
    assert.deepEqual(exportView({ export: null }), { kind: 'none' });
  });

  it('läuft, mit Fortschritt, und fragt nach', () => {
    const view = exportView({ export: { ...base, parts_total: 3, parts_done: 1 } });
    assert.equal(view.kind, 'running');
    assert.equal(pollInterval(view), 5000);
    assert.equal(exportView({ export: { ...base, status: 'requested' } }).kind, 'running');
  });

  it('fertig mit Links, ohne Nachfragen', () => {
    const view = exportView({
      export: {
        ...base,
        status: 'completed',
        completed_at: '2026-11-06T10:05:00.000Z',
        files_valid_until: '2026-11-07T10:05:00.000Z',
        file_count: 2,
        row_count: 10,
        downloads: [{ file: 'a.zip', kind: 'data', bytes: 1, sha256: 'x', url: 'https://x' }],
      },
    });
    assert.equal(view.kind, 'ready');
    assert.equal(pollInterval(view), false);
  });

  it('abgelaufen und gescheitert', () => {
    assert.equal(
      exportView({ export: { ...base, status: 'completed', expired: true } }).kind,
      'expired',
    );
    assert.equal(exportView({ export: { ...base, status: 'failed' } }).kind, 'failed');
  });
});

describe('formatBytes', () => {
  it('rundet deutsch', () => {
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(1536), '1,5 KB');
    assert.equal(formatBytes(40 * 1024 * 1024), '40 MB');
    assert.equal(formatBytes(null), '');
  });
});

describe('exportErrorKey', () => {
  it('kennt die Fehler der Function', () => {
    assert.equal(
      exportErrorKey('export not available in this lifecycle state'),
      'companySettings:export.errors.lifecycle',
    );
    assert.equal(exportErrorKey('was anderes'), 'companySettings:export.errors.unknown');
  });
});
