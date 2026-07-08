## GleeWorld — Accounts, Roles, Sign-in & Multi-Tenant (ground truth)

All paths relative to repo root `src/`. Auth is Supabase (self-hosted GoTrue at `supabase.gleeworld.org` by default).

### Auth session plumbing
- `AuthContext` provides `{ user, session, loading, isPasswordRecovery, signOut, resetAuth }`; `useAuth()` throws if used outside the provider (`contexts/AuthContext.tsx:6-23`).
- Session is read on mount via `supabase.auth.getSession()` with a 5s safety timeout that force-clears `loading` (`contexts/AuthContext.tsx:64-96`). Invalid/expired JWT → cleanup + global sign-out (`contexts/AuthContext.tsx:75-87`).
- Supabase client is configured with `flowType: 'implicit'`, `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, storage = `localStorage` (`integrations/supabase/client.ts:52-62`).
- Sign-out clears all `supabase.auth.*` / `sb-*` localStorage keys, removes the native tenant cache, sets `explicit-signout` flag, and calls `signOut({ scope: 'global' })` (`contexts/AuthContext.tsx:192-237`).

### Sign-in / Sign-up page (`/auth`)
- Route `/auth` renders `pages/AuthPage.tsx` (`App.tsx:562-565`). (`pages/Auth.tsx`, which uses `AuthTabs`, is a separate component — see Verify.)
- Single card toggles between three states: Sign in, Create account, Forgot password (`pages/AuthPage.tsx:47-57, 245-251`).
- **Login**: `supabase.auth.signInWithPassword({ email, password })`; on success toasts "Welcome back!" and navigates to the stored `redirectAfterAuth` / `returnTo`, else `/` (role redirect takes over) (`pages/AuthPage.tsx:93-111, 58-76`).
- **Sign-up**: `supabase.auth.signUp` with `options.data = { full_name, tenant_slug }` and `emailRedirectTo = <origin>/fan`. **Public sign-ups become "fan" accounts** — the UI states "Students are enrolled separately by the program director" (`pages/AuthPage.tsx:112-141, 480-488`).
- If email not yet confirmed, shows "Check your email" confirmation-link message; otherwise "your fan account is ready" (`pages/AuthPage.tsx:131-141`).
- **Demo tenant** (`__TENANT_CONFIG__.tenant === 'demo'`) disables public sign-up — login only, and the toggle becomes "Request your workspace" (`lib/demoTenant.ts:6-11`; `pages/AuthPage.tsx:55, 86-88, 456-465`).
- Password field has a show/hide eye toggle (`pages/AuthPage.tsx:415-422`). "Back to Home" button routes to `/` (`pages/AuthPage.tsx:215-227`).

### Forgot / Reset password
- On `/auth`, "Forgot your password?" calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: <current-origin>/reset-password })` — deliberately the current tenant's origin, not gleeworld.org (`pages/AuthPage.tsx:155-169`).
- Reset link lands on `/reset-password` (`App.tsx:641-644` → `pages/ResetPassword.tsx`). The page waits for the recovery session via `onAuthStateChange` (`PASSWORD_RECOVERY`/`SIGNED_IN`/`TOKEN_REFRESHED`) with an 8s timeout; if no session it shows "link expired or invalid" (`pages/ResetPassword.tsx:24-56, 174-185`).
- New-password rules on this page: **minimum 6 characters** and must match confirm field; saved via `supabase.auth.updateUser({ password })`; on success redirects to `/` after 3s (`pages/ResetPassword.tsx:61-90`).

### Forced password change (provisioned admins)
- Users created by the superadmin provisioning API arrive with `user_metadata.must_change_password === true`. `ProtectedRoute` redirects any such user to `/force-password-change` until the flag clears (`App.tsx:433-440`).
- `pages/ForcePasswordChange.tsx` requires: **≥8 chars, one uppercase, one lowercase, one number** (`pages/ForcePasswordChange.tsx:20-27`). Submitting calls `updateUser({ password, data: { must_change_password: false } })` to clear the gate (`pages/ForcePasswordChange.tsx:55-58`). "Same password" errors are treated as already-updated (`pages/ForcePasswordChange.tsx:83-110`). An "I already changed my password" button also sets a local flag and continues (`pages/ForcePasswordChange.tsx:123-137`). Copy references a Jan 17 2026 deadline (`pages/ForcePasswordChange.tsx:147-149`).

### In-app account management (Settings)
- `components/auth/ChangePasswordDialog.tsx`: change password without entering the current one (comment `:70-75`). Rules here are stricter: **≥8 chars, upper, lower, number, AND one special character** (`components/auth/ChangePasswordDialog.tsx:32-49`). Saves via `updateUser({ password })`.
- `components/auth/DeleteAccountDialog.tsx`: self-service deletion (App Store requirement). User types `DELETE`, which invokes the `gw-delete-account` edge function, then signs out and redirects to `/` (`components/auth/DeleteAccountDialog.tsx:20-39, 72-80`).

### Magic-link callback
- `/auth/callback` (`App.tsx:881`) → `pages/AuthCallback.tsx`. Manually parses `#access_token`/`refresh_token` (implicit) or `?code=` (PKCE); on session, routes to `?next=` (default `/academy`), or to `/onboarding?next=…` if the user has no `gw_profiles_directory` row (`pages/AuthCallback.tsx:26-47, 79-109`). Message states magic links are single-use and last 1 hour (`pages/AuthCallback.tsx:124`).

### Onboarding & profile completion
- `/onboarding` (`App.tsx:583`) → `pages/Onboarding.tsx`: a 6-step stepper — Hero → Account gate → Profile → Uniform/Media → Agreements → Review; auto-advances to the first incomplete step (`pages/Onboarding.tsx:30-63, 180-211`). Honors `?next=` on completion, default `/dashboard` (`pages/Onboarding.tsx:26-28, 94-98`).
- `ProfileCompletionGuard` wraps protected routes: a profile is "complete" if `gw_profiles` has `full_name` OR (`first_name` AND `last_name`); otherwise redirect to `/profile/setup`. Exempt paths include `/auth`, `/reset-password`, `/force-password-change`, `/onboarding`, `/academy`, `/classes/mus240`, `/grading` (`components/auth/ProfileCompletionGuard.tsx:12-22, 38-53, 66-78`).
- `useUserProfile` auto-creates a bare `gw_profiles` row (from auth metadata) if none exists (`hooks/useUserProfile.ts:97-124`).

### Route protection
- `ProtectedRoute`: while `loading` shows spinner; no user → stores intended path in `redirectAfterAuth` (unless just signed out) and redirects to `/auth`; then applies the must-change-password gate and `ProfileCompletionGuard` (`App.tsx:408-452`).

### Role model
- Canonical roles in `constants/permissions.ts:16-27` (`USER_ROLES`): `visitor`, `fan`, `auditioner`, `student`, **`graduate`** (constant name `ALUMNA`), `member` (alias of student), `instructor`, `executive`, `admin`, `super-admin`.
- Hierarchy levels (`ROLE_DESCRIPTIONS`, `constants/permissions.ts:34-85`): super-admin 100, admin 80, executive 60, instructor 50, student/member 40, graduate 30, auditioner 20, fan 10, visitor 0. `isRoleAtLeast` compares these levels (`constants/permissions.ts:346-356`).
- `director` is normalized to `super-admin` everywhere (`constants/permissions.ts:326-328, 347`; `hooks/useUserRole.ts:89`).
- Role/admin flags come from the `gw_profiles` table: `role`, `is_admin`, `is_super_admin`, `is_exec_board`, `verified` (`hooks/useUserRole.ts:39-49`).
- `useUserRole` effective role: `is_super_admin` → super-admin, else `is_admin` → admin, else `profile.role` (`hooks/useUserRole.ts:76-96`). Helpers: `isSuperAdmin/isAdmin/isInstructor/isStudent(=isMember)/isAlumna/isAuditioner/isFan/isVisitor` and capability checks `canManageUsers` (admin), `canDeleteUsers`/`canManageSystemSettings` (super-admin only), `canDownloadPDF` (admin or librarian), `canDownloadMP3` (super-admin only), `canEditMusicLibrary` (admin/super-admin/librarian) (`hooks/useUserRole.ts:87-183`).
- **Secondary "app roles"** live in the `app_roles` table (filtered `is_active=true`): recognized values `secretary`, `librarian`, `wardrobe_manager`/`wardrobe`. These grant `isSecretary`/`isWardrobeManager`/librarian capabilities independent of the primary role (`hooks/useUserRole.ts:44-61, 143-153, 176-183`). Note: exec-board is deprecated — `isExecutiveBoard()` now just returns `isAdmin()` (`hooks/useUserRole.ts:98-100`).

### Static role→permission map (`constants/permissions.ts`)
- `ROLE_PERMISSIONS` assigns named permission strings per role; super-admin has `all_permissions` (`constants/permissions.ts:144-249`). `hasPermission(role, perm)` returns true for super-admin unconditionally (`:326-341`).
- `EXEC_BOARD_PERMISSIONS` defines per-position add-on permissions for elected officers (president, vice-president, treasurer, secretary, music-director, tour-manager, etc.) (`constants/permissions.ts:392-465`). `DASHBOARD_MODULES` maps dashboard features to a required permission + `minRole` (`constants/permissions.ts:252-319`).

### Post-login role-based routing (`hooks/useRoleBasedRedirect.ts`)
- `pickDestination` (`:101-132`): platform super-admin (super-admin on the **`main`** tenant) → `/control-center`; tenant super-admin → `/dashboard`; admin → `/dashboard`; instructor → `/dashboard`; `alumni`/`graduate`/`graduates` → `/alumni`; student/member → `/dashboard`; auditioner → `/auditioner`; `fan`/`vip` → `/fan`.
- A signed-in user with no profile row is pushed to `/onboarding` (unless on a public surface like `/`, `/about`, `/calendar`, `/auth`, etc.) (`hooks/useRoleBasedRedirect.ts:60-66`).
- `tenant_slug` is read from the JWT claim populated by the server-side `custom_access_token_hook` to distinguish platform vs tenant super-admin (`hooks/useRoleBasedRedirect.ts:38-51`).
- Auto-redirect is suppressed when the user chose "View as public" (`force-public-view` sessionStorage) or `?preview=1` (`hooks/useRoleBasedRedirect.ts:70-78`).

### Multi-tenant model
- **One frontend build serves many tenant subdomains.** `index.html` sets `window.__TENANT_CONFIG__` (tenant slug, org name, short name, logo, `supabaseUrl`, `supabaseAnonKey`, `database`) from `/tenant-config.json` before the app boots; the Supabase client reads it so each subdomain points at its own DB (`integrations/supabase/client.ts:2-47`). Default slug is `main` (`:27`).
- Anon requests carry an `x-tenant-slug` header (default `main`) used by `anon_tenant_isolation` RLS policies via `anon_tenant_id()`; optional `x-tenant-db` header (`integrations/supabase/client.ts:39-47`).
- Sign-up passes `tenant_slug` in user metadata so the server `handle_new_user_profile` trigger enrolls the user in the right tenant (`integrations/supabase/client.ts:23-27`; `pages/AuthPage.tsx:126`).
- **Subdomain guard** (`contexts/AuthContext.tsx:113-158`): after auth, the JWT's `tenant_slug` is decoded and compared to the subdomain's bootstrap tenant. On mismatch the user is signed out, cleaned up, alerted, and redirected to the correct host (`<slug>.gleeworld.org/auth`, or `gleeworld.org` for `main`). **Exception:** the platform owner (super-admin on the `main` tenant) may sign in on any tenant subdomain (`:137-153`).
- **Native app** (Capacitor): no per-subdomain bootstrap, so after login `syncNativeTenant` decodes `tenant_slug` from the JWT, fetches the tenant's `name`/`short_name`/`logo_url` from `gw_tenants` + `gw_branding_settings`, caches it in `localStorage['gw_native_tenant']`, and reloads once (`lib/nativeTenant.ts:26-84`; wired at `contexts/AuthContext.tsx:119-120`). Sign-out drops that cache so the user lands on the org picker (`contexts/AuthContext.tsx:216-217`).

### Tenant-level entitlements (paid add-on modules)
- `ModuleGate` wraps features that require a paid module; it renders children if the tenant has the module, otherwise an "add-on / upgrade" panel linking to `/settings/modules` (or hides silently for nav) (`components/auth/ModuleGate.tsx:22-49`). **Super-admins bypass all module gating** (`:30`).
- Access is read from the DB view `v_tenant_active_modules` (RLS-scoped to the tenant) via `useTenantModules`/`useModuleAccess`. Modules carry `tier` (`starter`/`addon`/`enterprise`) and `status` (`starter`/`active`/`trial`/`past_due`/`cancelled`); a tenant "has" a module if it appears in the view (starter + active/trial add-ons) (`hooks/useModuleAccess.ts:4-50`).

### Per-user module permissions (distinct from tenant entitlements)
- `gw_user_module_permissions` grants individual users access to modules; super-admins implicitly get every active `gw_modules` row (`hooks/useUserModuleGrants.ts:30-131`). Grants update in real time via a `postgres_changes` subscription (`:163-177`).
- Legacy `gw_module_permissions` table exposes `permission_type` (default `'view'`) with optional `expires_at` expiry, joined to `gw_modules` (`hooks/useModulePermissions.ts:29-81`). `useAdminAccess` calls the RPC `current_user_can_access_admin_modules` (`:159-160`). `useSpecificModulePermissions` currently just checks `is_admin`/`is_super_admin` on `gw_profiles` (`:108-136`). Central helpers `hasModuleView/hasModuleManage` operate on the grant list (`lib/authz.ts:33-43`); known module keys enumerated in `lib/authz.ts:10-30`.

### Public registration requests
- `useRegistrationRequest` inserts into a `registration_requests` table (a request-to-join flow rather than direct account creation) (`hooks/useRegistrationRequest.ts:25-27, 73`).
