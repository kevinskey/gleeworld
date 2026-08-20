# Documents: real-time collaboration — design

Status: **DESIGN — not built.** Written 2026-08-20 at Kevin's request, as
the last of six Google-Docs-parity items. The other five (paste, find &
replace, outline, page setup, comments, version history, sharing) are built
and deployed. This one is held because it needs a server process on the
droplet that I cannot provision, and because it changes what "the document"
fundamentally *is*.

## Goal

Two or more people with `edit` permission on the same document type into it
at the same time and see each other's changes, and each other's cursors,
within a few hundred milliseconds — without either of them losing work and
without a "someone else edited this, reload?" dialog.

## What exists today

- `gw_personal_docs.content` is TipTap JSON in a `jsonb` column. One client
  owns it, autosave debounces writes, last write wins.
- `gw_doc_shares` grants `view` / `comment` / `edit` by email; `gw_doc_can()`
  is the single predicate every policy reads.
- `gw_doc_versions` snapshots the body at a 10-minute interval.
- `gw_doc_comments` anchors threads to `comment` marks inside the JSON.

Two people with `edit` today will silently clobber each other: both load the
doc, both autosave, the later save wins and the earlier one's paragraphs are
gone with no trace except a version snapshot that may or may not have fired.
**That is the actual bug this feature fixes**, and it is worth stating
plainly — sharing shipped without it, so edit-sharing is currently a footgun
for anyone who uses it simultaneously.

## Why CRDT rather than locking or OT

- **Locking** ("Kevin is editing, you're read-only") is a day of work and
  genuinely solves clobbering. It is also not what was asked for, and it
  degrades badly the moment two people want the same paragraph.
- **OT** (Google's own approach) needs a central authority that transforms
  every operation. That is a bigger server than the CRDT option, not smaller.
- **Yjs** is what TipTap supports natively (`@tiptap/extension-collaboration`,
  `y-prosemirror`). Merges are automatic, offline edits reconcile on
  reconnect, and the awareness protocol gives presence cursors for free.

Yjs is the right answer. The real decision is **where its state lives**.

## Option A — Hocuspocus on the droplet (recommended)

A Node process (`@hocuspocus/server`) holding each document's Yjs state in
memory, broadcasting updates to connected clients and persisting to Postgres
on a debounce.

```
client  ──wss://collab.gleeworld.org──▶  hocuspocus (pm2, :1234)
                                              │
                                              ▼
                                    gw_doc_yjs_state (bytea)
```

**Auth.** `onAuthenticate` receives the token the client passes on connect.
Verify the Supabase JWT with the project's secret, extract `sub` and `email`,
then call `gw_doc_can(doc_id, 'edit')` with a service-role client. Reject
otherwise. Without this step **any authenticated user who guesses a document
id gets full write access** — this is the single most important detail in the
whole design.

**Persistence.** `onStoreDocument`, debounced ~5s, writes the Yjs update
binary to a new table:

```sql
create table gw_doc_yjs_state (
  doc_id uuid primary key references gw_personal_docs(id) on delete cascade,
  state bytea not null,
  updated_at timestamptz not null default now()
);
```

**Ops footprint** — the part that needs your sign-off:

| Item | Detail |
|---|---|
| Process | `pm2` entry, ~80–150MB RSS, plus ~1–3MB per open document held in memory |
| Port | 1234 internal, proxied |
| DNS | `collab.gleeworld.org` A record |
| TLS | certbot cert (WebSockets need the same cert path) |
| nginx | vhost with `proxy_set_header Upgrade`/`Connection` for the socket upgrade |
| Secrets | `SUPABASE_SERVICE_ROLE_KEY` and the JWT secret in the process env |
| Failure mode | Server down = no editing at all, unless the client falls back (see below) |

## Option B — Supabase Realtime as the transport (no new server)

Yjs updates broadcast over a Supabase Realtime channel per document; each
client applies peers' updates locally; persistence is an append-only table of
update blobs, compacted periodically.

**Why it's tempting:** zero new infrastructure, no new DNS/TLS/pm2, and
Realtime is already running for the app.

**Why I don't recommend it:**

- **No server-side merge.** Every client must receive every update from every
  peer forever, or reconstruct from the append log at load. The log grows
  without bound until something compacts it, and compaction with no
  authoritative server is a distributed-systems problem you do not want.
- **Message size limits.** A paste of a long document is one large update;
  Realtime will drop or fragment it, and Yjs does not tolerate a lost update
  the way it tolerates a late one.
- **No authority for late joiners.** Someone opening a doc mid-session needs
  the full state from *somewhere*. Without a server that somewhere is "read
  the whole append log and replay it," which is slow and gets slower.

It is a real option if the ops footprint of A is unacceptable, and it would
work for two people on a short document. It will not survive a class of 30.

## What this does to autosave, snapshots, and export

Once Yjs holds the state, `gw_personal_docs.content` stops being the source
of truth and becomes a **derived artifact** — kept fresh because export,
search, print, and the `.docx` path all read it.

- The Hocuspocus `onStoreDocument` hook writes **both**: the Yjs binary, and
  `content` as JSON derived via `yDocToProsemirrorJSON`. One write, both
  representations, no drift.
- **Client autosave is deleted for collaborative docs.** Two mechanisms
  writing the same column is exactly how the clobbering returns.
- **Version snapshots move server-side**, triggered from the same store hook
  on the existing 10-minute interval. `shouldSnapshot()` is already pure, so
  it ports directly.
- **`word_count`** likewise moves to the store hook.

## Comments under CRDT

Comment anchors are already `comment` **marks** carrying an id, not absolute
positions — so `y-prosemirror` relocates them correctly as peers edit around
them, for free. This was luck rather than foresight, but it holds.

The one wrinkle: a comment created while offline inserts its row (fails, no
network) *before* its mark. The existing order-of-operations (row first, then
mark) means an offline comment simply fails cleanly rather than leaving an
orphan highlight. No change needed.

## Migrating existing documents

Documents created before this exists have `content` and no Yjs state. On
first collaborative open, `onLoadDocument` finds no row in `gw_doc_yjs_state`
and seeds the Y.Doc from `content` via `prosemirrorJSONToYDoc`. Idempotent,
lazy, no batch migration, no downtime.

**Ordering hazard worth stating:** if two clients open an unmigrated document
simultaneously, both seed from JSON and you get duplicated content. Fix is a
`select … for update` on the doc row inside the load hook, so seeding is
serialised.

## Phasing

1. **Sync only.** Server, auth, persistence, seeding. No cursors. This is the
   part that stops people clobbering each other, and it's most of the work.
2. **Presence.** Awareness protocol → coloured cursors and a "who's here"
   row. Cheap once 1 works; high perceived value.
3. **Offline.** `y-indexeddb` so edits made with no connection reconcile on
   reconnect. Also gives a fallback when the collab server is down — the
   client keeps working locally instead of going read-only.

## Effort, honestly

Phase 1 is **3–5 focused days**, of which maybe a day is code and the rest is
auth, deployment, and the failure modes. Phase 2 is under a day. Phase 3 is
1–2 days. Add a real testing pass with two browsers and a deliberately killed
server — this is the kind of feature that looks finished and isn't.

I would not describe any of it as risky *except* the auth step, where the
failure mode is silent and severe.

## Open decisions — these are yours

1. **Option A or B.** I recommend A. B is defensible only if a new droplet
   process is off the table.
2. **Subdomain.** `collab.gleeworld.org`, or path-proxied under an existing
   host to avoid new DNS/TLS?
3. **Scope of collaboration.** Documents only, or should this generalise to
   the other editors later (concert programs, the rich-text editor)? Worth
   knowing now — it changes whether the server is doc-specific.
4. **What happens when the server is down.** Read-only, or local-first via
   phase 3? Read-only is simpler and worse.
5. **Who pays the memory.** ~1–3MB per open doc, held while anyone has it
   open. Fine for tens; needs eviction tuning for hundreds.

## What I need to proceed

Provisioning writes to the droplet (pm2, nginx, certbot, DNS) that the
permission classifier blocks for me. You'd run those, the same `!` pattern
we've used for migrations. I can write every line of the server, the client
wiring, and the nginx vhost — I just can't install them.
