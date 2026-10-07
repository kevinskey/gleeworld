-- Audience sharing for personal documents: "all members" / a role / a class,
-- alongside the existing one-address-at-a-time email shares.
--
-- Why this exists: 20260820000000_doc_shares.sql keys every share to a single
-- email, which answers "share with an individual" and nothing else. Sharing a
-- program note with a whole choir meant typing every address and re-typing
-- them whenever someone joined. An audience row is evaluated at READ time, so
-- a member who joins tomorrow sees the document tomorrow, with no re-share.
--
-- Shape deliberately mirrors gw_soundcloud_playlist_shares (2026-08-18):
-- share_type + exactly-one-target CHECK, partial unique indexes per target,
-- revoked_at rather than DELETE, RESTRICTIVE tenant isolation, email
-- normalized by trigger. Same idea, so the next person reads one pattern.
--
-- TENANCY NOTE. gw_personal_docs intentionally has NO tenant_id — a personal
-- document follows the person across tenants (see 20260811230000). The SHARE
-- carries the tenant instead, which is the honest model: "all members" is
-- meaningless in the abstract and only means something relative to the tenant
-- you shared it into. Consequence, and it is deliberate: role/course shares
-- match only while the reader is in that tenant, whereas an email share names
-- a person and matches anywhere.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.
-- Prerequisite: the four doc migrations 20260819220000 / 20260819230000 /
-- 20260820000000 / 20260820010000 must be applied FIRST. On the live
-- self-hosted DB as of 2026-10-07 none of them were.

-- ── Columns ─────────────────────────────────────────────────────────────
alter table public.gw_doc_shares
  add column if not exists tenant_id  uuid,
  add column if not exists share_type text not null default 'email',
  add column if not exists target_role text,
  add column if not exists course_id  uuid references public.gw_courses(id) on delete cascade;

-- Backfill before the NOT NULL: rows written by the email-only version are
-- all email shares, and predate any tenant stamping.
--
-- current_tenant_id() reads request context, so it is NULL when this runs in
-- psql as supabase_admin. On the DB this was written for that is harmless —
-- gw_doc_shares is created empty three migrations above, so there is nothing
-- to backfill. Anywhere that DOES have rows, fail loudly here rather than
-- letting SET NOT NULL below throw something cryptic, or worse, leaving rows
-- with a NULL tenant that the RESTRICTIVE policy silently hides forever.
update public.gw_doc_shares
   set tenant_id = public.current_tenant_id()
 where tenant_id is null
   and public.current_tenant_id() is not null;

do $$
declare orphan_count bigint;
begin
  select count(*) into orphan_count from public.gw_doc_shares where tenant_id is null;
  if orphan_count > 0 then
    raise exception
      'gw_doc_shares has % row(s) with no tenant_id. Backfill them explicitly '
      '(UPDATE public.gw_doc_shares SET tenant_id = ''<tenant uuid>'' WHERE tenant_id IS NULL) '
      'and re-run; current_tenant_id() is NULL outside a request context.', orphan_count;
  end if;
end $$;

alter table public.gw_doc_shares
  alter column tenant_id set default public.current_tenant_id();

-- An audience row has no address, so the original NOT NULL has to go. The
-- one-target CHECK below is what keeps a row from meaning nothing at all.
alter table public.gw_doc_shares
  alter column shared_with_email drop not null;

do $$ begin
  alter table public.gw_doc_shares
    add constraint gw_doc_shares_share_type_chk
    check (share_type in ('email', 'role', 'course'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.gw_doc_shares
    add constraint gw_doc_shares_target_role_chk
    check (target_role is null or target_role in ('admin', 'staff', 'member'));
exception when duplicate_object then null; end $$;

-- Exactly one target, matching share_type. Without this a row could name a
-- course and an email at once and grant more than whoever wrote it intended.
do $$ begin
  alter table public.gw_doc_shares
    add constraint gw_doc_shares_one_target check (
      (share_type = 'email'  and shared_with_email is not null and target_role is null and course_id is null) or
      (share_type = 'role'   and target_role       is not null and shared_with_email is null and course_id is null) or
      (share_type = 'course' and course_id         is not null and shared_with_email is null and target_role is null)
    );
exception when duplicate_object then null; end $$;

-- ── Uniqueness ──────────────────────────────────────────────────────────
-- The original UNIQUE (doc_id, shared_with_email) cannot express "one role
-- row per doc", and with a nullable email it stops constraining anything.
-- Partial uniques per target replace it; each keeps re-sharing an UPSERT
-- rather than a second contradictory row.
alter table public.gw_doc_shares
  drop constraint if exists gw_doc_shares_unique;

create unique index if not exists gw_doc_shares_email_uniq
  on public.gw_doc_shares (doc_id, shared_with_email) where share_type = 'email';
create unique index if not exists gw_doc_shares_role_uniq
  on public.gw_doc_shares (doc_id, tenant_id, target_role) where share_type = 'role';
create unique index if not exists gw_doc_shares_course_uniq
  on public.gw_doc_shares (doc_id, tenant_id, course_id) where share_type = 'course';

alter table public.gw_doc_shares
  alter column tenant_id set not null;

drop trigger if exists gw_doc_shares_set_tenant_trg on public.gw_doc_shares;
create trigger gw_doc_shares_set_tenant_trg
  before insert on public.gw_doc_shares
  for each row execute function public.set_tenant_id_default();

-- The normalize trigger from the base migration lowercases unconditionally
-- and now has to tolerate a null address on audience rows.
create or replace function public.gw_doc_shares_normalize()
returns trigger language plpgsql as $$
begin
  if new.shared_with_email is not null then
    new.shared_with_email = lower(btrim(new.shared_with_email));
  end if;
  return new;
end;
$$;

-- ── Access ──────────────────────────────────────────────────────────────
-- Strongest match wins. Somebody can be named individually at 'comment' AND
-- covered by an 'all members' row at 'view'; taking either arbitrarily would
-- make permission depend on row order. ORDER BY the ladder, take one.
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
          -- An email names a person: it follows them across tenants, exactly
          -- as the document itself does.
          (s.share_type = 'email'
            and s.shared_with_email = lower(auth.jwt() ->> 'email'))
          -- An audience only means something inside its own tenant.
          or (s.share_type = 'role'
            and s.tenant_id = public.current_tenant_id()
            and public.user_has_tenant_role(s.target_role))
          or (s.share_type = 'course'
            and s.tenant_id = public.current_tenant_id()
            and exists (
              select 1 from gw_course_enrollments e
               where e.course_id = s.course_id and e.user_id = auth.uid()))
        )
      order by array_position(array['view', 'comment', 'edit'], s.permission) desc
      limit 1
    )
  end;
$$;

-- ── Row visibility ──────────────────────────────────────────────────────
-- Tenant isolation in the house style. Note this governs DIRECT reads of the
-- share list (the owner's Share dialog) only — gw_doc_permission is SECURITY
-- DEFINER, so a grantee's access to the document is unaffected by it.
drop policy if exists gw_doc_shares_tenant_isolation on public.gw_doc_shares;
create policy gw_doc_shares_tenant_isolation on public.gw_doc_shares
  as restrictive for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Owner still manages the list; restated so the WITH CHECK covers the new
-- columns rather than relying on the base migration's narrower version.
drop policy if exists doc_shares_owner_all on public.gw_doc_shares;
create policy doc_shares_owner_all on public.gw_doc_shares
  for all to authenticated
  using (
    exists (select 1 from public.gw_personal_docs d
             where d.id = gw_doc_shares.doc_id and d.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.gw_personal_docs d
             where d.id = gw_doc_shares.doc_id and d.user_id = auth.uid())
    and created_by = auth.uid()
  );

comment on table public.gw_doc_shares is
  'Who a personal document is shared with: an individual by email, or an audience '
  '(role / course) evaluated at read time so later joiners are covered. Email shares '
  'follow the person across tenants; audience shares apply only within tenant_id.';
