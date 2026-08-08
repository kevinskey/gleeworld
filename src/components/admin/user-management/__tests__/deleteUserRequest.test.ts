// Regression guard for a live bug: deleting a user from the admin user-detail
// panel always failed with a 400.
//
// Two components call the same edge function with DIFFERENT bodies.
// DeleteUserDialog sent { userId, userEmail, confirmText } — correct.
// UserDetailPanel sent { target_user_id } — which the function rejects at
// admin-delete-user/index.ts:50 before doing anything:
//
//   const { userId, userEmail, confirmText } = await req.json()
//   if (!userId || !userEmail) return 400 'Missing required fields: userId, userEmail'
//
// The route renders UserDetailPanel, so delete was broken for every tenant.
//
// The request body is built by a pure function so the contract can be pinned
// here without mounting the panel. If someone renames a field, this fails
// instead of shipping a 400 to an admin trying to remove someone.

import { describe, expect, it } from 'vitest';
import { buildDeleteUserRequest, deleteConfirmationText } from '../deleteUserRequest';

const USER = { id: 'u-123', email: 'someone@example.org' };

describe('deleteConfirmationText', () => {
  it('matches the exact string the edge function compares against', () => {
    // Function does: const expectedText = `DELETE ${userEmail}`
    expect(deleteConfirmationText(USER.email)).toBe('DELETE someone@example.org');
  });
});

describe('buildDeleteUserRequest', () => {
  it('sends the three fields the edge function destructures', () => {
    const body = buildDeleteUserRequest(USER, 'DELETE someone@example.org');
    expect(body).toEqual({
      userId: 'u-123',
      userEmail: 'someone@example.org',
      confirmText: 'DELETE someone@example.org',
    });
  });

  it('does NOT send target_user_id — the field name that caused the 400', () => {
    const body = buildDeleteUserRequest(USER, 'DELETE someone@example.org') as unknown as Record<string, unknown>;
    expect(body).not.toHaveProperty('target_user_id');
  });

  it('carries confirmText through; the function rejects the request without it', () => {
    // The panel collected this string and then dropped it, so even with the
    // field names fixed the delete would still 400 on the confirmation check.
    const body = buildDeleteUserRequest(USER, 'DELETE someone@example.org');
    expect(body.confirmText).toBe(deleteConfirmationText(USER.email));
  });

  it('refuses to build a request for a user with no email', () => {
    // userEmail is required by the function; a missing one is a 400 we can
    // catch locally instead of round-tripping.
    expect(() => buildDeleteUserRequest({ id: 'u-1', email: '' }, 'DELETE ')).toThrow(
      /email/i,
    );
  });
});
