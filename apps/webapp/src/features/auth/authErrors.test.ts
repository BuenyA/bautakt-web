/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import type { AuthError } from '@supabase/supabase-js';

import { authErrorKey } from './authErrors.ts';

const SIGNUPS_DISABLED_TEXT = 'Die Registrierung ist derzeit nur auf Einladung möglich.';
const SIGNUPS_DISABLED_MESSAGE = 'Signups not allowed for this instance';

const catalog = JSON.parse(
  readFileSync(new URL('../../locales/de/errors.json', import.meta.url), 'utf8'),
) as {
  generic: string;
  auth: Record<string, string>;
};

function asAuthError(fields: { code?: string; message?: string; status?: number }): AuthError {
  return {
    name: 'AuthApiError',
    message: fields.message ?? '',
    status: fields.status,
    code: fields.code,
  } as AuthError;
}

function german(key: string): string {
  if (key === 'errors:generic') return catalog.generic;
  const prefix = 'errors:auth.';
  assert.ok(key.startsWith(prefix), key);
  const text = catalog.auth[key.slice(prefix.length)];
  assert.equal(typeof text, 'string', key);
  return text ?? '';
}

describe('signup_disabled', () => {
  it('wird zum freundlichen deutschen Satz, Code 422 und 400 und der GoTrue-Text', () => {
    const cases = [
      asAuthError({
        code: 'signup_disabled',
        status: 422,
        message: SIGNUPS_DISABLED_MESSAGE,
      }),
      asAuthError({
        code: 'signup_disabled',
        status: 400,
        message: 'Signups not allowed for this instance',
      }),
      asAuthError({ status: 422, message: SIGNUPS_DISABLED_MESSAGE }),
      asAuthError({ status: 400, message: ` ${SIGNUPS_DISABLED_MESSAGE} ` }),
    ];

    for (const error of cases) {
      const key = authErrorKey(error);
      assert.equal(key, 'errors:auth.signupDisabled');
      assert.equal(german(key), SIGNUPS_DISABLED_TEXT);
    }
  });
});

describe('andere Auth-Fehler', () => {
  it('bleiben auf ihren bisherigen deutschen Texten', () => {
    const cases: Array<{ error: AuthError; key: string; text: string }> = [
      {
        error: asAuthError({
          code: 'invalid_credentials',
          status: 400,
          message: 'Invalid login credentials',
        }),
        key: 'errors:auth.invalidCredentials',
        text: 'E-Mail oder Passwort stimmt nicht.',
      },
      {
        error: asAuthError({
          code: 'email_not_confirmed',
          status: 400,
          message: 'Email not confirmed',
        }),
        key: 'errors:auth.emailNotConfirmed',
        text: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.',
      },
      {
        error: asAuthError({
          code: 'user_already_exists',
          status: 422,
          message: 'User already registered',
        }),
        key: 'errors:auth.userAlreadyExists',
        text: 'Zu dieser E-Mail-Adresse gibt es bereits ein Konto.',
      },
      {
        error: asAuthError({
          code: 'email_exists',
          status: 422,
          message: 'User already registered',
        }),
        key: 'errors:auth.userAlreadyExists',
        text: 'Zu dieser E-Mail-Adresse gibt es bereits ein Konto.',
      },
      {
        error: asAuthError({
          code: 'weak_password',
          status: 422,
          message: 'Password should be at least 6 characters',
        }),
        key: 'errors:auth.weakPassword',
        text: 'Dieses Passwort ist zu schwach.',
      },
      {
        error: asAuthError({
          code: 'over_request_rate_limit',
          status: 429,
          message: 'Request rate limit reached',
        }),
        key: 'errors:auth.rateLimited',
        text: 'Zu viele Versuche. Bitte warten Sie einen Moment.',
      },
      {
        error: asAuthError({
          code: 'over_email_send_rate_limit',
          status: 429,
          message: 'Email rate limit exceeded',
        }),
        key: 'errors:auth.rateLimited',
        text: 'Zu viele Versuche. Bitte warten Sie einen Moment.',
      },
      {
        error: asAuthError({
          code: 'invalid_credentials',
          status: 400,
          message: SIGNUPS_DISABLED_MESSAGE,
        }),
        key: 'errors:auth.invalidCredentials',
        text: 'E-Mail oder Passwort stimmt nicht.',
      },
      {
        error: asAuthError({ code: 'invite_not_found', status: 404, message: 'Invite not found' }),
        key: 'errors:generic',
        text: 'Da ist etwas schiefgelaufen. Bitte versuchen Sie es erneut.',
      },
      {
        error: asAuthError({ code: 'unexpected_failure', status: 500, message: 'Unexpected' }),
        key: 'errors:generic',
        text: 'Da ist etwas schiefgelaufen. Bitte versuchen Sie es erneut.',
      },
    ];

    for (const entry of cases) {
      const key = authErrorKey(entry.error);
      assert.equal(key, entry.key);
      assert.equal(german(key ?? ''), entry.text);
    }

    assert.equal(authErrorKey(null), null);
  });
});
