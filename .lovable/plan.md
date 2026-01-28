
## What “Didn’t work” most likely means (based on code)

Kennidy’s “Add User” action in **User Management** is powered by the **`import-users`** Supabase Edge Function (not `auto-enroll-user`).

Right now, `import-users` only allows:
- `is_admin = true`, or
- `is_super_admin = true`, or
- `role` in `['admin','super-admin']`

It does **not** allow `is_exec_board = true`, so executive board members (like Kennidy) will continue to get a **403 Unauthorized: Admin privileges required** even after the earlier idea for `auto-enroll-user`.

Also, the **User Management page route guard** (`src/pages/UserManagement.tsx`) currently only allows admins/super-admins, so exec board access can fail/redirect depending on how she’s navigating to it.

## Goal

Allow **all executive board members** (`gw_profiles.is_exec_board = true`) to:
1) Access the User Management page
2) Successfully create users via `import-users`
3) (Optionally) also succeed via `auto-enroll-user` wherever that flow is used elsewhere

---

## Implementation Plan (to execute when you switch me to Default mode)

### 1) Fix server-side permission checks (this is the real blocker)

#### 1A) Update `supabase/functions/import-users/index.ts`
- Expand the privilege check to include exec board:
  - Change `select('role, is_admin, is_super_admin')` to also select `is_exec_board`
  - Update the authorization condition to pass if:
    - `profile.is_super_admin === true` OR
    - `profile.is_admin === true` OR
    - `profile.is_exec_board === true` OR
    - (keep legacy checks if desired) `profile.role in ['admin','super-admin']`

Why: this is the function used by the User Management module, and it currently blocks Kennidy.

Also include small robustness fixes while touching the file:
- Parse JSON body *before* writing audit logs (the current code tries to read `req.body?.users` which doesn’t exist in Deno Request).
- Log a clear audit message like:
  - `console.log("import-users authorized caller", { userId: user.id, is_exec_board: profile.is_exec_board, ... })`
- Keep the response shape the same so the UI doesn’t break.

#### 1B) Update `supabase/functions/auto-enroll-user/index.ts` (secondary but important)
- Expand the profile select to include `is_exec_board`
- Allow permission if `is_admin || is_super_admin || is_exec_board`

Why: even if User Management uses `import-users`, other parts of the app use `auto-enroll-user` (contracts flow), and you explicitly want exec board to have this authority consistently.

---

### 2) Fix client-side access gating so exec board can open the page

#### 2A) Update `src/pages/UserManagement.tsx`
Current `isAdmin` calculation only checks admin/super-admin.
- Update it to allow exec board as well (e.g., `userProfile?.is_exec_board`).
- Rename variable from `isAdmin` to something clearer like `canAccessUserManagement` to avoid confusion.

Why: even if the server allows creation, the UI currently may block exec board from even accessing the module.

#### 2B) (Optional consistency) Update `src/hooks/useUserRole.ts`
Right now `canManageUsers()` returns true only for Admin+ or `chief_of_staff`.
Because you said “Yes, all exec board members”, update `canManageUsers()` to:
- return `true` if `isExecutiveBoard()` (which already includes exec board + admin)

Why: other UI areas may use `canManageUsers()` to show/hide links and buttons; this prevents future “link disappears” inconsistencies.

---

### 3) Validate end-to-end behavior (fast, conclusive tests)

#### 3A) Confirm Edge Functions are deployed
- After changes, deploy functions:
  - `import-users`
  - `auto-enroll-user`

#### 3B) Test as Kennidy (real auth token)
- Login as Kennidy in preview
- Navigate to User Management
- Add a user via “Add User”
Expected:
- No redirect away from `/user-management`
- `import-users` returns 200 with `success: 1`
- New user appears after refresh

#### 3C) Verify via logs
- Check Edge Function logs for:
  - “authorized caller” log
  - No “Admin privileges required” error

---

## Security Notes (important)
- This keeps **server-side enforcement** (Edge Function checks) as the source of truth.
- We are not relying on client-side flags for security; the UI change is only for visibility/access, not authorization.
- Long-term, your system should move away from storing “role” strings on profile rows, and instead use a dedicated roles table + SECURITY DEFINER helper, but I will not expand scope unless you ask (because it’s a larger migration).

---

## Files that will be changed (when approved for Default mode)
- `supabase/functions/import-users/index.ts`  (primary fix)
- `supabase/functions/auto-enroll-user/index.ts` (consistency fix)
- `src/pages/UserManagement.tsx` (route access fix)
- `src/hooks/useUserRole.ts` (optional consistency fix)

---

## Expected Outcome
After these changes, **Kennidy (and any exec board member)** can:
- Open User Management
- Add users successfully without “Unauthorized/Admin required”
