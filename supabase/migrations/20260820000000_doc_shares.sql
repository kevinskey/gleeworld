-- Sharing for personal documents.
--
-- Until now gw_personal_docs was strictly single-owner (auth.uid() =
-- user_id), which made comments a conversation with yourself and made
-- collaborative editing meaningless. This adds a share list and widens the
-- document policies to honour it.
--
-- Shares are keyed by EMAIL, not user id, for two reasons: you can share with
-- someone who hasn't signed in yet (access appears the moment they do), and
-- RLS can match it without a lookup — auth.jwt() carries the email. Stored
-- lowercased; matched lowercased.
--
-- Permission is an ordered ladder: view < comment < edit. Everything below
-- reads it that way rather than testing equality, so adding a level later
-- doesn't mean revisiting every policy.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.

create table if not exists public.gw_doc_shares (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.gw_personal_docs(id) on delete cascade,
  shared_with_email text not null,
  permission text not null default 'view' check (permission in ('view', 'comment', 'edit')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  -- Re-sharing with the same person updates the existing row rather than
  -- stacking duplicates with contradictory permissions.
  constraint gw_doc_shares_unique unique (doc_id, shared_with_email)
);

create index if not exists gw_doc_shares_email_idx
  on public.gw_doc_shares (lower(shared_with_email)) where revoked_at is null;

alter table public.gw_doc_shares enable row level security;

-- Normalise on write so the email index and the RLS predicates agree.
create or replace function public.gw_doc_shares_normalize()
returns trigger language plpgsql as $$
begin
  new.shared_with_email = lower(btrim(new.shared_with_email));
  return new;
end;
$$;

drop trigger if exists gw_doc_shares_normalize_trg on public.gw_doc_shares;
create trigger gw_doc_shares_normalize_trg
  before insert or update on public.gw_doc_shares
  for each row execute function public.gw_doc_shares_normalize();

-- ── Access helpers ──────────────────────────────────────────────────────
-- SECURITY DEFINER so a recipient can be granted access to a document
-- WITHOUT being able to read the whole share table. Both are stable and
-- take the doc id, so every policy below reads the same way.

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
        and s.shared_with_email = lower(auth.jwt() ->> 'email')
      limit 1
    )
  end;
$$;

/** True when the caller's permission on the doc is at least `p_min`. */
create or replace function public.gw_doc_can(p_doc uuid, p_min text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    array_position(array['view', 'comment', 'edit', 'owner'], public.gw_doc_permission(p_doc))
      >= array_position(array['view', 'comment', 'edit', 'owner'], p_min),
    false
  );
$$;

grant execute on function public.gw_doc_permission(uuid) to authenticated;
grant execute on function public.gw_doc_can(uuid, text) to authenticated;

-- ── Share rows ──────────────────────────────────────────────────────────
-- Only the owner manages the list. Recipients never read this table
-- directly; gw_doc_permission (definer) is what grants them the document.
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

-- ── Widen the document policies ─────────────────────────────────────────
-- SELECT: anyone the doc is shared with, at any level.
drop policy if exists gw_personal_docs_select on public.gw_personal_docs;
create policy gw_personal_docs_select on public.gw_personal_docs
  for select to authenticated
  using (auth.uid() = user_id or public.gw_doc_can(id, 'view'));

-- UPDATE: the owner, or an explicit 'edit' share. Note the with_check: a
-- collaborator must not be able to reassign the document to themselves.
drop policy if exists gw_personal_docs_update on public.gw_personal_docs;
create policy gw_personal_docs_update on public.gw_personal_docs
  for update to authenticated
  using (auth.uid() = user_id or public.gw_doc_can(id, 'edit'))
  with check (auth.uid() = user_id or public.gw_doc_can(id, 'edit'));

-- DELETE stays owner-only, deliberately: sharing a document for editing is
-- not consent to have it destroyed.

-- ── Comments and versions follow the same ladder ────────────────────────
drop policy if exists doc_comments_owner_all on public.gw_doc_comments;

drop policy if exists doc_comments_read on public.gw_doc_comments;
create policy doc_comments_read on public.gw_doc_comments
  for select to authenticated
  using (public.gw_doc_can(doc_id, 'view'));

-- 'comment' and above may add threads, and only as themselves.
drop policy if exists doc_comments_write on public.gw_doc_comments;
create policy doc_comments_write on public.gw_doc_comments
  for insert to authenticated
  with check (public.gw_doc_can(doc_id, 'comment') and user_id = auth.uid());

-- Editing or deleting a thread: its author, or the document's owner.
drop policy if exists doc_comments_modify on public.gw_doc_comments;
create policy doc_comments_modify on public.gw_doc_comments
  for update to authenticated
  using (user_id = auth.uid() or public.gw_doc_can(doc_id, 'owner'))
  with check (user_id = auth.uid() or public.gw_doc_can(doc_id, 'owner'));

drop policy if exists doc_comments_delete on public.gw_doc_comments;
create policy doc_comments_delete on public.gw_doc_comments
  for delete to authenticated
  using (user_id = auth.uid() or public.gw_doc_can(doc_id, 'owner'));

drop policy if exists doc_versions_owner_all on public.gw_doc_versions;

drop policy if exists doc_versions_read on public.gw_doc_versions;
create policy doc_versions_read on public.gw_doc_versions
  for select to authenticated
  using (public.gw_doc_can(doc_id, 'view'));

drop policy if exists doc_versions_write on public.gw_doc_versions;
create policy doc_versions_write on public.gw_doc_versions
  for insert to authenticated
  with check (public.gw_doc_can(doc_id, 'edit') and user_id = auth.uid());

-- Pruning history is the owner's call, not a collaborator's.
drop policy if exists doc_versions_delete on public.gw_doc_versions;
create policy doc_versions_delete on public.gw_doc_versions
  for delete to authenticated
  using (public.gw_doc_can(doc_id, 'owner'));
