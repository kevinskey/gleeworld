-- Version history for personal documents.
--
-- Snapshots of the document body, taken by the client at a coarse interval
-- (see snapshotIfDue in versionsApi) and on demand. Deliberately NOT one row
-- per autosave: autosave fires every couple of seconds while someone types,
-- and a history nobody can read is worse than no history.
--
-- Only the body and word count are snapshotted. Sources, footnotes, and
-- paper_meta are small, structured, and edited through their own panels;
-- restoring prose while silently reverting someone's bibliography would be a
-- nasty surprise. Restore therefore replaces `content` alone.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.

create table if not exists public.gw_doc_versions (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.gw_personal_docs(id) on delete cascade,
  -- Who was editing when the snapshot was taken.
  user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null,
  word_count integer not null default 0,
  -- Set for snapshots the user asked for by name ("before the rewrite");
  -- null for the automatic interval ones.
  label text,
  created_at timestamptz not null default now()
);

-- The panel's only query: newest first for one doc. Also the index the
-- retention delete below walks.
create index if not exists gw_doc_versions_doc_idx
  on public.gw_doc_versions (doc_id, created_at desc);

alter table public.gw_doc_versions enable row level security;

-- Same ownership rule as comments: defined once, against the parent doc.
drop policy if exists doc_versions_owner_all on public.gw_doc_versions;
create policy doc_versions_owner_all on public.gw_doc_versions
  for all to authenticated
  using (
    exists (
      select 1 from public.gw_personal_docs d
      where d.id = gw_doc_versions.doc_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.gw_personal_docs d
      where d.id = gw_doc_versions.doc_id and d.user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

-- Retention. A long-lived document would otherwise accumulate snapshots
-- forever, and each one is a full copy of the body. Keep the 50 most recent
-- automatic snapshots per doc; labelled ones are the user's own bookmarks and
-- are never trimmed. Runs on insert, so no scheduled job is required.
create or replace function public.gw_doc_versions_trim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from gw_doc_versions v
  where v.doc_id = new.doc_id
    and v.label is null
    and v.id not in (
      select id from gw_doc_versions
      where doc_id = new.doc_id and label is null
      order by created_at desc
      limit 50
    );
  return null;
end;
$$;

drop trigger if exists gw_doc_versions_trim_trg on public.gw_doc_versions;
create trigger gw_doc_versions_trim_trg
  after insert on public.gw_doc_versions
  for each row execute function public.gw_doc_versions_trim();
