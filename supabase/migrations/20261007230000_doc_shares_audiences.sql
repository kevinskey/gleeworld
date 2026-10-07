-- Documents: share with members, not just one email at a time.
--
-- gw_doc_shares (20260820000000) only knew one kind of target, an email
-- address. Every other share surface in the app (Jukebox, SoundCloud, video,
-- scores) offers "Everyone in this workspace", staff, admins, or a class, so
-- a Yo-Doc instructor opening Share on a document found no way to hand it to
-- their members short of typing every student's address. This adds the same
-- role / course targets the Jukebox uses (20261005090000), on the same
-- permission ladder (view < comment < edit).
--
-- gw_personal_docs has no tenant_id on purpose (documents follow the person
-- across workspaces). An audience share therefore carries its OWN tenant_id:
-- "Everyone" means everyone in the workspace the owner shared from, and the
-- grant only applies while the reader is in that workspace.
--
-- Self-hosted: record-only; apply by hand as supabase_admin, AFTER
-- 20260820000000_doc_shares.sql (which is safe to re-run if you are not sure
-- it was applied). Re-running that older file after this one would put back
-- the email-only gw_doc_permission(), so run this one again afterwards.

-- ── Columns ─────────────────────────────────────────────────────────────
alter table public.gw_doc_shares
  add column if not exists share_type text not null default 'email',
  add column if not exists target_role text,
  add column if not exists course_id uuid references public.gw_courses(id) on delete cascade,
  add column if not exists tenant_id uuid default public.current_tenant_id();

-- An audience share has no email. The existing unique (doc_id,
-- shared_with_email) still serves email upserts: NULLs never collide.
alter table public.gw_doc_shares alter column shared_with_email drop not null;

alter table public.gw_doc_shares drop constraint if exists gw_doc_shares_type_check;
alter table public.gw_doc_shares add constraint gw_doc_shares_type_check
  check (share_type in ('email', 'role', 'course'));

alter table public.gw_doc_shares drop constraint if exists gw_doc_shares_one_target;
alter table public.gw_doc_shares add constraint gw_doc_shares_one_target check (
  (share_type = 'email'  and shared_with_email is not null and target_role is null and course_id is null) or
  (share_type = 'role'   and target_role in ('member', 'staff', 'admin') and tenant_id is not null
                         and shared_with_email is null and course_id is null) or
  (share_type = 'course' and course_id is not null and tenant_id is not null
                         and shared_with_email is null and target_role is null)
);

-- One row per audience per document, revoked or not: re-sharing reinstates
-- the row rather than stacking a second one with a different level.
create unique index if not exists gw_doc_shares_role_uniq
  on public.gw_doc_shares (doc_id, tenant_id, target_role) where share_type = 'role';
create unique index if not exists gw_doc_shares_course_uniq
  on public.gw_doc_shares (doc_id, course_id) where share_type = 'course';
create index if not exists gw_doc_shares_doc_idx
  on public.gw_doc_shares (doc_id) where revoked_at is null;

-- The normalise trigger already lowercases the email; lower(NULL) is NULL,
-- so audience rows pass through it untouched.

-- ── Access helper ───────────────────────────────────────────────────────
-- Same signature, so gw_doc_can() and every policy built on it (documents,
-- comments, versions, the Yjs state table) pick up audience shares with no
-- further change. A reader can now match several rows (their email AND
-- "Everyone"); they get the highest level any of them grants.
create or replace function public.gw_doc_permission(p_doc uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from gw_personal_docs d where d.id = p_doc and d.user_id = auth.uid())
      then 'owner'
    else (
      select s.permission
      from gw_doc_shares s
      where s.doc_id = p_doc
        and s.revoked_at is null
        and (
          (s.share_type = 'email'
             and s.shared_with_email = lower(auth.jwt() ->> 'email'))
          or (s.share_type = 'role'
             and s.tenant_id = public.current_tenant_id()
             and public.user_has_tenant_role(s.target_role))
          or (s.share_type = 'course'
             and s.tenant_id = public.current_tenant_id()
             and exists (select 1 from gw_course_enrollments e
                          where e.course_id = s.course_id and e.user_id = auth.uid()))
        )
      order by array_position(array['view', 'comment', 'edit'], s.permission) desc
      limit 1
    )
  end;
$$;

grant execute on function public.gw_doc_permission(uuid) to authenticated;

-- ── Images inside shared documents ──────────────────────────────────────
-- Images live at personal-docs/<owner_id>/<doc_id>/<file>, readable only by
-- the owner, so a shared reader saw the text with broken images. Let anyone
-- who can view the document read its images. Writes stay owner-only.
create or replace function public.gw_doc_can_read_image(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_folder text := (storage.foldername(p_name))[2];
begin
  if v_folder is null
     or v_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.gw_doc_can(v_folder::uuid, 'view');
end;
$$;

grant execute on function public.gw_doc_can_read_image(text) to authenticated;

drop policy if exists personal_docs_images_shared_select on storage.objects;
create policy personal_docs_images_shared_select on storage.objects
  for select to authenticated using (
    bucket_id = 'personal-docs'
    and public.gw_doc_can_read_image(name)
  );

comment on table public.gw_doc_shares is
  'Who can open a personal document: one email, a workspace role (member/staff/admin, scoped by tenant_id), or a class. Permission ladder view < comment < edit; revoked_at rather than DELETE.';
