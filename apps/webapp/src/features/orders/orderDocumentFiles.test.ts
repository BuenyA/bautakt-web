import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  defaultDocumentName,
  fileExtension,
  formatFileSize,
  groupByFolder,
  isFinanceArchivePath,
  orderDocumentBucket,
  orderDocumentKind,
  orderDocumentMimeType,
  orderDocumentStoragePath,
} from './orderDocumentFiles.ts';

const COMPANY = '11111111-1111-1111-1111-111111111111';
const ORDER = '22222222-2222-2222-2222-222222222222';
const DOC = '33333333-3333-3333-3333-333333333333';

describe('orderDocumentMimeType', () => {
  it('nimmt die Typen des Buckets an', () => {
    assert.equal(orderDocumentMimeType('plan.pdf', 'application/pdf'), 'application/pdf');
    assert.equal(orderDocumentMimeType('foto.JPG', 'image/jpeg'), 'image/jpeg');
    assert.equal(orderDocumentMimeType('notiz.txt', 'text/plain'), 'text/plain');
  });

  it('nimmt die Endung, wenn der Browser keinen Typ liefert', () => {
    assert.equal(
      orderDocumentMimeType('Vertrag.DOCX', ''),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    assert.equal(
      orderDocumentMimeType('alt.doc', 'application/octet-stream'),
      'application/msword',
    );
  });

  it('lehnt anderes ab', () => {
    assert.equal(orderDocumentMimeType('archiv.zip', 'application/zip'), null);
    assert.equal(orderDocumentMimeType('foto.heic', 'image/heic'), null);
    assert.equal(orderDocumentMimeType('ohne-endung', ''), null);
  });
});

describe('orderDocumentStoragePath', () => {
  it('baut den Pfad wie die Handy-App', () => {
    assert.equal(
      orderDocumentStoragePath(COMPANY, ORDER, DOC, 'application/pdf', 'Plan EG.PDF'),
      `${COMPANY}/${ORDER}/${DOC}.pdf`,
    );
  });

  it('nimmt ohne Endung die des Typs', () => {
    assert.equal(
      orderDocumentStoragePath(COMPANY, ORDER, DOC, 'image/jpeg', 'scan'),
      `${COMPANY}/${ORDER}/${DOC}.jpg`,
    );
  });
});

describe('Belegarchiv', () => {
  it('erkennt archivierte Belege am zweiten Segment', () => {
    assert.equal(isFinanceArchivePath(`${COMPANY}/sales/${DOC}.pdf`), true);
    assert.equal(isFinanceArchivePath(`${COMPANY}/${ORDER}/${DOC}.pdf`), false);
    assert.equal(orderDocumentBucket(`${COMPANY}/sales/${DOC}.pdf`), 'finance-documents');
    assert.equal(orderDocumentBucket(`${COMPANY}/${ORDER}/${DOC}.pdf`), 'order-documents');
  });
});

describe('Anzeige', () => {
  it('schlägt den Dateinamen ohne Endung als Namen vor', () => {
    assert.equal(defaultDocumentName('Grundriss EG.pdf'), 'Grundriss EG');
    assert.equal(defaultDocumentName('ohne-endung'), 'ohne-endung');
    assert.equal(defaultDocumentName('.pdf'), '.pdf');
    assert.equal(fileExtension('a.b.PNG'), '.png');
  });

  it('ordnet Dateien einer Art zu', () => {
    assert.equal(orderDocumentKind('application/pdf', 'x'), 'pdf');
    assert.equal(orderDocumentKind('', 'x.webp'), 'image');
    assert.equal(orderDocumentKind('application/msword', 'x.doc'), 'text');
    assert.equal(orderDocumentKind('', 'x.zip'), 'other');
  });

  it('formatiert Dateigrößen', () => {
    assert.equal(formatFileSize(null), '');
    assert.equal(formatFileSize(512), '512 B');
    assert.equal(formatFileSize(860_000), '840 KB');
    assert.equal(formatFileSize(2.4 * 1024 * 1024), '2,4 MB');
  });
});

describe('groupByFolder', () => {
  it('sortiert nach Ordnern, lässt leere weg und sammelt Unbekanntes am Ende', () => {
    const folders = groupByFolder(
      [
        { id: 'a', categoryId: 'plans' },
        { id: 'b', categoryId: 'gone' },
        { id: 'c', categoryId: 'contracts' },
        { id: 'd', categoryId: 'plans' },
      ],
      [
        { id: 'contracts', name: 'Verträge' },
        { id: 'plans', name: 'Baupläne' },
        { id: 'other', name: 'Sonstiges' },
      ],
      'Ohne Ordner',
    );
    assert.deepEqual(
      folders.map((folder) => [folder.name, folder.documents.map((item) => item.id)]),
      [
        ['Verträge', ['c']],
        ['Baupläne', ['a', 'd']],
        ['Ohne Ordner', ['b']],
      ],
    );
  });
});
