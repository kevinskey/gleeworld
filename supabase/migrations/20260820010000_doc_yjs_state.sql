-- CRDT state for collaboratively-edited documents.
--
-- The Yjs binary is the source of truth while a document is being edited;
-- gw_personal_docs.content remains the ProseMirror JSON projection that
-- export, print, search and .docx read. Clients keep writing that projection
-- through the autosave they already have — safe because CRDT guarantees every
-- connected client derives identical JSON, so last-write-wins writes identical
-- bytes. See docs/design/2026-08-20-documents-realtime-collaboration.md.
--
-- Written and read ONLY by the collaboration server (worker/collab-server),
-- which connects as a privileged role. No client ever touches this table, so
-- RLS below denies everyone: there is no policy, and RLS is enabled, which in
-- Postgres means "no access for non-superuser roles". That is deliberate
-- rather than an oversight — a leaked anon key must not be able to read the
-- body of a private document out of this table, and the server bypasses RLS
-- by virtue of its role.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.

create table if not exists public.gw_doc_yjs_state (
  doc_id uuid primary key references public.gw_personal_docs(id) on delete cascade,
  -- A Yjs update blob (Y.encodeStateAsUpdate). Opaque to Postgres.
  state bytea not null,
  updated_at timestamptz not null default now()
);

alter table public.gw_doc_yjs_state enable row level security;

-- Explicitly no policies. See the header: this table is server-only.
-- If a future feature needs client access, add a policy that reuses
-- gw_doc_can(doc_id, 'view') rather than inventing a second access rule.

comment on table public.gw_doc_yjs_state is
  'Yjs CRDT state for collaborative documents. Server-only (RLS enabled, no policies). '
  'gw_personal_docs.content stays the JSON projection used by export/print/search.';
