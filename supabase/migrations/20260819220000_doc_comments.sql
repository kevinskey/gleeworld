-- Comments on personal documents.
--
-- A comment is anchored by an id that also lives on a `comment` mark inside
-- the document's TipTap JSON. The mark is the anchor; this table is the
-- thread. Keeping the text out of the document matters: comments must be
-- editable and resolvable without rewriting (and re-saving) the doc, and a
-- resolved comment has to be able to disappear from the margin while the
-- document's own history stays untouched.
--
-- Documents are single-owner today (gw_personal_docs.user_id), so the policy
-- is simply "the owner". When sharing lands, the shared-with predicate is
-- added here in one place rather than scattered through the client.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.

create table if not exists public.gw_doc_comments (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.gw_personal_docs(id) on delete cascade,
  -- Author. Kept even after the doc is shared, so a thread shows who said what.
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Matches the `commentId` attribute of the `comment` mark in the doc JSON.
  -- Not a foreign key in the other direction — the document is a jsonb blob,
  -- so nothing can enforce it; orphan rows are handled in the client (see
  -- orphanedComments in commentsApi).
  anchor_id text not null,
  body text not null check (length(btrim(body)) > 0),
  -- Resolution is a timestamp, not a boolean: "when was this settled" is the
  -- question people actually ask of a resolved thread.
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The panel's only query: every comment on one doc, oldest first.
create index if not exists gw_doc_comments_doc_idx
  on public.gw_doc_comments (doc_id, created_at);

alter table public.gw_doc_comments enable row level security;

-- Owner of the document controls its comments. `exists` against the parent
-- rather than duplicating ownership onto this table, so there is exactly one
-- place that defines who can see a document.
drop policy if exists doc_comments_owner_all on public.gw_doc_comments;
create policy doc_comments_owner_all on public.gw_doc_comments
  for all to authenticated
  using (
    exists (
      select 1 from public.gw_personal_docs d
      where d.id = gw_doc_comments.doc_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.gw_personal_docs d
      where d.id = gw_doc_comments.doc_id and d.user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

-- Keep updated_at honest without the client having to remember.
create or replace function public.gw_doc_comments_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gw_doc_comments_touch_trg on public.gw_doc_comments;
create trigger gw_doc_comments_touch_trg
  before update on public.gw_doc_comments
  for each row execute function public.gw_doc_comments_touch();
