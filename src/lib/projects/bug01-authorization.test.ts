import test from 'node:test';
import assert from 'node:assert/strict';
import { isAnilAuthorizedAccount } from './agents/outreach/approval-gate';

test('BUG-01 Security Audit: Authorized admin ID can approve', () => {
  // Configured in environment
  const originalId = process.env.ANIL_USER_ID;
  process.env.ANIL_USER_ID = '97fe3c84-2e39-481f-9742-6708d9094767,admin-secondary-id';

  try {
    const isAuth = isAnilAuthorizedAccount({
      userId: '97fe3c84-2e39-481f-9742-6708d9094767',
      userEmail: 'any-session-email@example.com'
    });
    assert.equal(isAuth, true, 'Configured admin user ID must be authorized');

    const isSecondary = isAnilAuthorizedAccount({
      id: 'admin-secondary-id',
      email: 'secondary@nexgen.ai'
    });
    assert.equal(isSecondary, true, 'Comma-separated secondary admin ID must be authorized');
  } finally {
    process.env.ANIL_USER_ID = originalId;
  }
});

test('BUG-01 Security Audit: Authorized admin email can approve', () => {
  const originalEmail = process.env.ANIL_APPROVAL_EMAIL;
  process.env.ANIL_APPROVAL_EMAIL = 'aniladani843@gmail.com,anil@nexgen.ai';

  try {
    assert.equal(
      isAnilAuthorizedAccount({ userEmail: 'aniladani843@gmail.com' }),
      true,
      'Registered admin email must be authorized'
    );
    assert.equal(
      isAnilAuthorizedAccount({ userEmail: 'ANIL@NEXGEN.AI' }),
      true,
      'Email check must be case-insensitive'
    );
  } finally {
    process.env.ANIL_APPROVAL_EMAIL = originalEmail;
  }
});

test('BUG-01 Security Audit: Unauthorized authenticated user cannot approve', () => {
  const originalEmail = process.env.ANIL_APPROVAL_EMAIL;
  const originalId = process.env.ANIL_USER_ID;
  process.env.ANIL_APPROVAL_EMAIL = 'anil@nexgen.ai';
  process.env.ANIL_USER_ID = 'admin-id-123';

  try {
    assert.equal(
      isAnilAuthorizedAccount({ userId: 'hacker-user-id', userEmail: 'hacker@malicious.com' }),
      false,
      'Non-admin authenticated user must be strictly rejected'
    );
    assert.equal(
      isAnilAuthorizedAccount({ userId: 'admin-member-456', userEmail: 'finance@nexgen.ai' }),
      false,
      'Ordinary company member cannot approve on behalf of admin'
    );
  } finally {
    process.env.ANIL_APPROVAL_EMAIL = originalEmail;
    process.env.ANIL_USER_ID = originalId;
  }
});

test('BUG-01 Security Audit: Unauthenticated / empty caller cannot approve', () => {
  assert.equal(isAnilAuthorizedAccount({}), false, 'Empty payload must be rejected');
  assert.equal(isAnilAuthorizedAccount({ userId: '', userEmail: '' }), false, 'Blank strings must be rejected');
  assert.equal(isAnilAuthorizedAccount({ userId: '   ', userEmail: '   ' }), false, 'Whitespace strings must be rejected');
});

test('BUG-01 Security Audit: Client-side isAnilExplicit spoofing is blocked', () => {
  assert.equal(
    isAnilAuthorizedAccount({
      userId: 'attacker-id',
      userEmail: 'attacker@evil.com',
      isAnilExplicit: true
    }),
    false,
    'Client-supplied isAnilExplicit without trusted server context must be ignored'
  );

  assert.equal(
    isAnilAuthorizedAccount(
      {
        userId: 'attacker-id',
        isAnilExplicit: true
      },
      { isTrustedServerContext: false }
    ),
    false,
    'Explicit false server context must reject isAnilExplicit flag'
  );
});

test('BUG-01 Security Audit: Missing configuration fails securely', () => {
  const originalEmail = process.env.ANIL_APPROVAL_EMAIL;
  const originalId = process.env.ANIL_USER_ID;
  delete process.env.ANIL_APPROVAL_EMAIL;
  delete process.env.ANIL_USER_ID;

  try {
    // With no configuration, arbitrary user must be rejected
    assert.equal(
      isAnilAuthorizedAccount({ userId: 'arbitrary-id', userEmail: 'user@example.com' }),
      false,
      'Arbitrary user must be rejected when unconfigured'
    );
  } finally {
    process.env.ANIL_APPROVAL_EMAIL = originalEmail;
    process.env.ANIL_USER_ID = originalId;
  }
});
