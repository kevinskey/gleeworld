// Request shape for the `admin-delete-user` edge function.
//
// This exists because two components were calling that function with different
// bodies and only one of them was right. The function destructures exactly
// three fields (supabase/functions/admin-delete-user/index.ts:48):
//
//   const { userId, userEmail, confirmText } = await req.json()
//
// and rejects the request with a 400 if userId or userEmail is missing, then
// again if confirmText !== `DELETE ${userEmail}`. UserDetailPanel was sending
// { target_user_id }, so every delete from the admin panel 400'd before the
// function did any work — for every tenant.
//
// Keeping the body in one typed function means the contract is stated once and
// pinned by a test, instead of being retyped at each call site.

export interface DeletableUser {
  id: string;
  email: string;
}

export interface DeleteUserRequest {
  userId: string;
  userEmail: string;
  confirmText: string;
}

/**
 * The exact string an admin must type to confirm. The edge function builds the
 * same string and compares it verbatim, so this must not drift.
 */
export function deleteConfirmationText(email: string): string {
  return `DELETE ${email}`;
}

export function buildDeleteUserRequest(
  user: DeletableUser,
  confirmText: string,
): DeleteUserRequest {
  if (!user.email) {
    // The function requires userEmail and would 400. Fail here with something
    // an admin can act on rather than showing a generic edge-function error.
    throw new Error('Cannot delete a user with no email address on record.');
  }
  return {
    userId: user.id,
    userEmail: user.email,
    confirmText,
  };
}
