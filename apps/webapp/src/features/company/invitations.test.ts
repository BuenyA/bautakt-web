import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractInviteToken, invitationErrorKey, isCurrentInvitationToken } from './invitations.ts';

test('liest den Token aus dem QR-Link der App', () => {
  assert.equal(extractInviteToken('bautakt://invite/A1B2C3D4E5F60718'), 'a1b2c3d4e5f60718');
});

test('nimmt den getippten Code mit Leerzeichen und Bindestrichen', () => {
  assert.equal(extractInviteToken(' a1b2 c3d4-e5f6 0718 '), 'a1b2c3d4e5f60718');
});

test('lehnt Fremdes ab', () => {
  assert.equal(extractInviteToken('https://example.com'), null);
  assert.equal(extractInviteToken('a1b2'), null);
  assert.equal(extractInviteToken(''), null);
});

test('aktuelle Codes haben 16 Zeichen', () => {
  assert.equal(isCurrentInvitationToken('a1b2 c3d4 e5f6 0718'), true);
  assert.equal(isCurrentInvitationToken('a1b2c3d4e5f60718a1b2c3d4'), false);
});

test('bildet RPC-Fehler auf Meldungen ab', () => {
  assert.equal(
    invitationErrorKey({ message: 'INVITATION_EXPIRED' }),
    'errors:invitation.INVITATION_EXPIRED',
  );
  assert.equal(invitationErrorKey({ message: 'irgendwas' }), 'errors:generic');
  assert.equal(invitationErrorKey(null), 'errors:generic');
});
