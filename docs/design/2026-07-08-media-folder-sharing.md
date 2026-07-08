# Media Library folder sharing — design (Phase 3)

Status: **DESIGN — not yet built.** Sharing is cross-user access on a
tenant-isolated DB, so this is reviewed before any code. Requested by
Kevin 2026-07-07 as part of the Studio→Media Library export feature
([[studio-export-media-library]]).

## Goal

A user (the **owner**) shares one of their Media Library **folders**
(e.g. their `Studio` folder, per-user subfolder) with another person by
**email**, granting that person **read access** to just the files in that
folder — nothing else in the owner's or the tenant's library.

## What "a folder" is here

Folders are a flat `folder` text label on `gw_media_library`, and
per-user separation is `uploaded_by` + the `media/<userId>/…` path. So a
shareable folder is the pair **(owner_user_id, folder)** — e.g. "Alice's
Studio folder" = rows where `uploaded_by = alice AND folder = 'Studio'`.

## Current security baseline (verified 2026-07-08)

- `gw_media_library` SELECT (PERMISSIVE `authenticated_select`):
  `is_public OR uploaded_by = auth.uid() OR <admin>` — a normal user sees
  only their own rows.
- **RESTRICTIVE** `tenant_isolation_restrict`: `tenant_id =
  current_tenant_id()` — ANDed onto everything; a user can never see rows
  outside their JWT tenant, whatever any permissive policy says.
- Bucket `media-library` is **public** — `getPublicUrl` links resolve for
  anyone who has the URL (access is by URL obscurity today).

## Data model

```sql
create table public.gw_media_folder_shares (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null default public.current_tenant_id(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  folder        text not null,                     -- e.g. 'Studio'
  invited_email text not null,                     -- lower-cased
  grantee_user_id uuid references auth.users(id),  -- filled when the email resolves to an account
  permission    text not null default 'view' check (permission in ('view')),
  created_by    uuid not null default auth.uid(),
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (owner_user_id, folder, invited_email)
);
```

Tenant-scoped like every table (DEFAULT + trigger + RESTRICTIVE isolation
per [[gleeworld-multitenant]]). An active share = `revoked_at IS NULL`.

## Access-grant RLS (v1: within-tenant only)

Add ONE permissive SELECT policy to `gw_media_library`:

```sql
create policy media_library_shared_select on public.gw_media_library
  for select to authenticated
  using (exists (
    select 1 from public.gw_media_folder_shares s
    where s.owner_user_id = gw_media_library.uploaded_by
      and s.folder        = gw_media_library.folder
      and s.grantee_user_id = auth.uid()
      and s.revoked_at is null
  ));
```

Because the **RESTRICTIVE** `tenant_id = current_tenant_id()` still ANDs
on top, this grant only works when grantee and owner are in the **same
tenant** (the common case: director ↔ student, member ↔ member in one
choir). That is the safe v1 boundary — no change to tenant isolation.

**Cross-tenant sharing is explicitly OUT of v1.** Granting a grantee in a
*different* tenant would require relaxing the RESTRICTIVE isolation policy
for shared rows only — a real weakening of the core invariant that needs
its own security review + threat model. Defer.

## Email → account resolution

- Share by lower-cased email. On create, look up an existing account by
  email; if found, set `grantee_user_id` immediately.
- If no account yet: row stays pending (`grantee_user_id NULL`). A DB
  trigger on user signup (or the existing GoTrue hook) fills
  `grantee_user_id` for any pending shares matching the new user's email.
- Recipient must be in the **same tenant** for v1 access to resolve
  (enforced by the restrictive policy at query time regardless).

## Storage access

Bucket is public, so a shared row's `file_url` is directly playable — no
signed-URL work needed for v1. **Caveat to note in the UI:** files are
protected by URL obscurity, not hard ACL; anyone with a link can fetch.
If we later make the bucket private, switch shared playback to
short-lived `createSignedUrl` minted server-side after checking the share.

## UI

- **Owner:** on a folder chip (e.g. Studio) → "Share folder" → add
  email(s), permission = View, list/revoke existing shares.
- **Recipient:** a "Shared with me" folder view in the Media Library that
  lists rows visible via a share (query naturally returns them once the
  policy is in place).
- Show the URL-obscurity caveat on the share dialog.

## Security review checklist (before shipping)

- [ ] RESTRICTIVE tenant isolation still blocks cross-tenant reads with
      the new permissive policy present (write a test: grantee in tenant B
      cannot see owner's tenant-A rows even with a share row).
- [ ] `gw_media_folder_shares` itself has tenant isolation + only owner /
      admin can INSERT/DELETE shares for their own (owner_user_id =
      auth.uid()).
- [ ] Revocation (`revoked_at`) immediately removes access.
- [ ] `demo_viewer` restrictive policies unaffected (demo accounts can't
      create shares).
- [ ] Signup trigger can't be abused to grant access by claiming an email
      (email must be verified before `grantee_user_id` is filled).
- [ ] Storage: document the public-bucket obscurity caveat; plan the
      signed-URL path if privacy is later required.

## Phasing

- **3a:** shares table + within-tenant RLS + owner share UI + "Shared with
  me" view. (This doc's scope.)
- **3b (separate):** cross-tenant sharing (needs the isolation-relaxation
  security review) and/or private-bucket signed URLs.
