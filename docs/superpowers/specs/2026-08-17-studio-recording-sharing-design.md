# Studio recording sharing — design

Status: **APPROVED 2026-08-17** (Kevin, in-session). Extends the shipped
Studio→Media Library export ([[studio-export-media-library]], PRs #100–#104)
and folder sharing Phase 3a (`docs/design/2026-07-08-media-folder-sharing.md`,
PR #103 — merged, live).

## Goal

A teacher (instructor/admin) shares a Studio recording to other users inside
the app:

1. into a **class media library** (all members of a course see it),
2. as an **assignment** (attached to a standard course assignment),
3. by **email** to a whole class or an individual,

while the recording **always remains saved in the owner's own Studio folder**
(and downloadable to device) exactly as today. Students are NOT given the new
share surfaces in v1 — they keep download + their private Studio folder.

Decisions locked with Kevin 2026-08-17:

- Assignment = **standard assignment**: pre-fill the existing creator on
  `gw_course_assignments`, recording attached as playable material; the
  existing submission/grading pipeline is unchanged.
- Email links open an **in-app page requiring sign-in** (RLS-gated), never a
  bare file URL.
- **Teachers/admins only** for the entire share feature.
- Entry points: **both** the Studio export flow and the Media Library.

## Current state being built on (verified on origin/main d4ecf3e04)

- Studio exports write to bucket `media-library` at
  `media/<userId>/studio/<ts>-<name>` and insert a `gw_media_library` row with
  `folder: 'Studio'`, `category: 'studio'`, `course_id: null`, `is_public:
  false`, storing the `getPublicUrl` result in `file_url`
  (`StudioEditor.tsx` `sendToLibrary` ~4650, `saveClipMp3ToLibrary` ~887).
- Foldered rows are private to their owner: migration `20260708020000` replaced
  the blanket view policy with `USING (folder IS NULL)`; per-user/admin/shared
  permissive policies cover the rest.
- Course-scoped media exists: `gw_media_library.course_id` + RESTRICTIVE
  `course_access_select_media_library`
  (`course_id IS NULL OR user_can_access_course(course_id)`,
  migration `20260615200000`). SELECT-side only — **no write-side gate**.
- Folder shares (`gw_media_folder_shares`) are live; grantee access matches
  `lower(invited_email) = lower(jwt email)`; within-tenant only.
- Email: Resend via `gw-send-email` (generic) and `send-branded-email`
  (tenant-branded, batches for Resend's 50-recipient limit). No roster→email
  join exists anywhere yet.
- Notifications: `create_notification_with_delivery(...)` RPC + bell UI.
- Full-session `ExportSheet` is download-only; only region/clip exports can
  reach the Media Library.

## Core model — share = class copy

Sharing to a class creates a **new `gw_media_library` row pointing at the same
storage object** (no file duplication):

- `course_id = <course>`, `folder = NULL`, `category = 'studio'`,
  `source_media_id = <original row id>`, `uploaded_by = sharer`,
  same `file_url` / `file_path` / `file_type` / `file_size`, `is_public: false`.
- Visibility falls out of existing RLS: permissive "view unfoldered media"
  passes for tenant members, and the RESTRICTIVE course policy narrows it to
  exactly the course's instructor + enrolled students + admins.
- The owner's original Studio-folder row is untouched; unshare = soft-delete
  the copy (`is_deleted = true`), never the original.
- Idempotent: before inserting, look up an existing non-deleted copy with the
  same `(source_media_id, course_id)` and reuse it.

Rejected alternatives: (a) widening RLS so one row serves both the private
folder and the class — entangles the folder-privacy policy and makes
revocation mutate the original; (b) a separate class-shares join table —
existing class-media UI reads `course_id` directly, so shares would be
invisible without rewriting those queries.

## Data model (one migration)

```sql
-- 1. Link a class copy back to its source recording.
ALTER TABLE public.gw_media_library
  ADD COLUMN IF NOT EXISTS source_media_id uuid
  REFERENCES public.gw_media_library(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gw_media_library_source_idx
  ON public.gw_media_library (source_media_id)
  WHERE source_media_id IS NOT NULL;

-- 2. Attach a recording to a standard assignment.
ALTER TABLE public.gw_course_assignments
  ADD COLUMN IF NOT EXISTS media_id uuid
  REFERENCES public.gw_media_library(id) ON DELETE SET NULL;

-- 3. Per-item shares (exact mirror of gw_media_folder_shares).
CREATE TABLE public.gw_media_item_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id()
                REFERENCES public.gw_tenants(id),
  media_id      uuid NOT NULL
                REFERENCES public.gw_media_library(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text NOT NULL,          -- lower/trim by trigger
  permission    text NOT NULL DEFAULT 'view' CHECK (permission IN ('view')),
  created_by    uuid NOT NULL DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  UNIQUE (media_id, invited_email)
);
-- RLS: tenant_isolation_restrict (RESTRICTIVE) + trg_set_tenant_id +
-- normalization trigger, owner_all (owner_user_id = auth.uid()),
-- grantee_read (lower(invited_email) = lower(auth.jwt()->>'email')
--               AND revoked_at IS NULL)
-- — copy the shapes from 20260708010000_media_folder_shares.sql verbatim.

-- 4. Grant policy on media rows.
CREATE POLICY media_library_item_shared_select ON public.gw_media_library
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_media_item_shares s
    WHERE s.media_id = gw_media_library.id
      AND lower(s.invited_email) = lower(auth.jwt()->>'email')
      AND s.revoked_at IS NULL
  ));

-- 5. Close the write-side course gap (pre-existing): only someone who can
-- MANAGE the course may create/point media rows at it.
CREATE OR REPLACE FUNCTION public.user_can_manage_course(p_course_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.gw_profiles
                 WHERE user_id = auth.uid() AND (is_admin OR is_super_admin))
      OR EXISTS (SELECT 1 FROM public.gw_courses
                 WHERE id = p_course_id AND instructor_id = auth.uid());
$$;
-- AMENDED during implementation (see note below): the third branch keeps
-- the already-shipped flow where an ENROLLED user uploads/edits their OWN
-- media in a class they belong to.
CREATE POLICY course_write_media_library ON public.gw_media_library
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (course_id IS NULL
              OR public.user_can_manage_course(course_id)
              OR (uploaded_by = auth.uid()
                  AND public.user_can_access_course(course_id)));
CREATE POLICY course_write_media_library_upd ON public.gw_media_library
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (course_id IS NULL
              OR public.user_can_manage_course(course_id)
              OR (uploaded_by = auth.uid()
                  AND public.user_can_access_course(course_id)));
```

**Write-gate amendment (2026-08-18, implementation review).** As first
specified, the gate allowed only course managers to write course-tagged
rows. Review caught that this breaks shipped behavior: `MediaLibraryPage`'s
UploadDialog lets ANY signed-in user pick a class they are merely enrolled
in (`useScopeFilter` lists enrolled courses), and the UPDATE check would
also have blocked students renaming/deleting their own pre-existing
course-tagged rows. The third branch above preserves that status quo while
still blocking writes into courses the caller has no relationship with.
Sharing itself remains instructor/admin-only in the UI.

Notes:

- `user_can_manage_course` deliberately does NOT include TAs in v1 (the TA
  model is keyed by `course_code` strings via `course_teaching_assistants`;
  folding it in is a follow-up).
- The UPDATE restrictive policy must not break existing legitimate updates:
  rows with `course_id IS NULL` (the overwhelming majority) pass unchanged.
- Within-tenant only, same as folder shares: the RESTRICTIVE tenant isolation
  ANDs on top of the item-share grant. Cross-tenant recipients cannot resolve
  access; the share dialog must say so if a typed email matches no tenant
  member.

## Share flows

One `ShareRecordingDialog` (new component), gated to instructors/admins
(`useUserRole`-style check; course pickers list only courses the user can
manage per `user_can_manage_course` semantics).

**Entry points:**

1. Studio: wherever "Send to Media Library" exists (region + clip exports) add
   a follow-up "Share…" action on success, opening the dialog on the created
   row. Additionally, add the same "Send to Media Library" destination to the
   full-session `ExportSheet` (today download-only) by reusing `sendToLibrary`,
   so any bounce is shareable.
2. Media Library: a Share action on audio rows the user uploaded (owner +
   instructor/admin role required).

**Destination 1 — class media library:** pick course → ensure class copy →
success toast with an optional "Notify the class" step (below). The class copy
then appears in the existing course-scoped media views.

**Destination 2 — assignment:** pick course → ensure class copy → open the
existing `CreateAssignmentDialog` pre-filled (title from recording title) with
`media_id = <class copy id>`. Student side: `CourseAssignments` /
`StudentAssignmentDialog` render an audio player (existing raw `<audio>`
pattern) when the assignment's `media_id` resolves. The attached row is the
class copy, so every enrolled student passes RLS on it.

**Destination 3 — email:**

- Recipients: (a) a course roster — `gw_course_enrollments` joined to
  `gw_profiles_directory` for names/emails (same read the roster manager
  already does client-side); or (b) individuals — pick tenant members or type
  an email.
- For each individual recipient who is not covered by a class copy, insert a
  `gw_media_item_shares` row (idempotent on the unique key; re-share after
  revoke re-activates by clearing `revoked_at`).
- Send via **`gw-send-email`** (chosen over `send-branded-email` during
  implementation: it BCC-chunks multi-recipient sends at 49/batch, so class
  recipients never see each other's addresses, while `send-branded-email`
  puts the whole batch in `To:`): recording title, sharer's name, optional
  personal message, and a button linking to the in-app listen page. No new
  edge function.
- Also create in-app notifications via `create_notification_with_delivery`
  (type 'info', category 'general', `action_url` = listen page) for recipients
  who are tenant members. Notification failures are non-fatal (toast still
  reports email result).

**Listen page:** new lightweight route `/listen/:mediaId` — loads the
`gw_media_library` row under the caller's JWT (RLS decides access), renders
title, sharer, date, and the standard `<audio controls>` player on `file_url`.
Signed-out users hit the normal auth redirect and return after login. Row not
visible → friendly "you don't have access" state, not a crash.

## Own-copy guarantee

Untouched existing behavior, restated as an invariant: every share path
operates on rows that reference the owner's uploaded object; the original
Studio-folder row and the device-download path are never moved, mutated, or
deleted by sharing or unsharing.

## Security

- Whole feature UI is instructor/admin-gated; server-side, the new RESTRICTIVE
  write policies make a crafted student insert with a `course_id` fail, and
  item-share creation is owner-scoped by RLS.
- Carried-forward caveat (unchanged from Phase 3a): bucket `media-library` is
  public — `file_url` is protected by URL obscurity, not ACL. The in-app gate
  protects discoverability and metadata. True object privacy = move Studio
  media to signed URLs / private bucket — explicitly deferred, same as the
  2026-07-08 design.
- Demo tenant: writes silently match 0 rows — every INSERT/UPDATE in the
  dialog uses `.select()` and treats an empty result as failure
  ([[project_personal_music_library]] trap).
- `gw_media_library` inserts must use ONLY the live-schema column list (title,
  file_url, file_path, file_type, file_size, category, is_public, is_featured,
  is_deleted, course_id, uploaded_by, download_count, view_count, folder,
  source_media_id) — the repo's original CREATE has columns the live table
  lacks; wrong columns reject the whole insert (PR #104 gotcha).
- RLS assert test (pattern of
  `supabase/migrations/tests/personal_music_library_test.sql`), covering:
  enrolled student sees class copy; unenrolled same-tenant member does not;
  cross-tenant sees nothing; item-share grantee sees exactly the shared row;
  revocation removes access; student INSERT with course_id is rejected;
  owner's original stays private.

## Error handling

- Share dialog surfaces per-step failures distinctly (copy created but email
  failed → say exactly that; the copy is kept).
- Email send is all-or-nothing per batch via `gw-send-email`'s response;
  report counts (sent / failed) in the toast.
- Assignment path: if the class copy succeeds but the teacher cancels the
  assignment dialog, the copy remains in the class library (harmless, visible,
  deletable) — documented behavior, not a bug.

## Out of scope (explicit)

- Cross-tenant sharing (Phase 3b boundary unchanged).
- Signed-URL/private-bucket migration for `media-library`.
- Student-initiated sharing; TA share rights; listen-completion tracking;
  email attachments.
- The fragmented legacy resource stores (`course_video/audio_resources`,
  `gw_course_module_resources`) — this feature writes only
  `gw_media_library` + `gw_course_assignments.media_id`.

## Delivery

- Branch `feat/studio-recording-sharing`; TDD via vitest for dialog/query
  logic; migration + assert test applied per [[project_pr380_migrations]]
  (`psql -U supabase_admin` on the droplet; no schema_migrations table).
- Frontend deploy only via `scripts/deploy-frontend.sh` (no `--delete`,
  tenants/ + superadmin/ excludes). No edge-function changes anticipated.
- QA on the demo tenant end-to-end: export → share to class → student sees it;
  assignment with player; email to individual → listen page.
