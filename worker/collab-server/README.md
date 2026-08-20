# Documents collaboration server

Yjs sync server for the Documents word processor. Real-time multi-person
editing with Supabase JWT auth and Postgres persistence. Design:
`docs/design/2026-08-20-documents-realtime-collaboration.md`.

**Nothing in the web app changes until `VITE_COLLAB_URL` is set at build
time.** Without it the client never imports a provider, the editor builds the
same extension list it always did, and autosave behaves exactly as before. So
this can sit in the repo unused, indefinitely, at zero risk.

## What it does

- Holds each open document's CRDT state in memory and broadcasts updates
  between connected editors.
- **Authenticates every socket**: verifies the Supabase JWT, then checks the
  document's share list. Below `edit` connects read-only. This is the only
  thing standing between a document and anyone who can guess a uuid.
- Persists the Yjs binary to `gw_doc_yjs_state` on a 5s debounce, and flushes
  every open document on SIGTERM so a restart doesn't drop the last few
  seconds of everyone's typing.

It deliberately does **not** write `gw_personal_docs.content` — see the
amendment note at the top of `index.js`.

## Deploy

Needs droplet writes I can't perform; run these yourself.

**1. Apply the migration** (creates `gw_doc_yjs_state`):

```bash
scp supabase/migrations/20260820010000_doc_yjs_state.sql root@198.211.113.144:/tmp/
ssh root@198.211.113.144 "docker cp /tmp/20260820010000_doc_yjs_state.sql supabase-db:/tmp/ && \
  docker exec supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/20260820010000_doc_yjs_state.sql"
```

**2. DNS.** `collab.gleeworld.org` → `198.211.113.144` (A record).

**3. Ship the code and install:**

```bash
ssh root@198.211.113.144 "mkdir -p /opt/gleeworld-collab"
scp worker/collab-server/{index.js,package.json,ecosystem.config.cjs} root@198.211.113.144:/opt/gleeworld-collab/
ssh root@198.211.113.144 "cd /opt/gleeworld-collab && npm install --omit=dev"
```

**4. Environment.** Create `/opt/gleeworld-collab/.env`:

```
DATABASE_URL=postgres://postgres:<password>@127.0.0.1:5432/postgres
SUPABASE_JWT_SECRET=<the JWT secret from /opt/supabase/.env>
COLLAB_PORT=1234
```

`SUPABASE_JWT_SECRET` must be the **same secret Supabase signs tokens with**
(`JWT_SECRET` in `/opt/supabase/.env`). If it differs, every socket is
rejected and collaboration silently never connects.

**5. nginx + TLS:**

```bash
scp worker/collab-server/nginx-collab.conf root@198.211.113.144:/etc/nginx/sites-available/collab.gleeworld.org
ssh root@198.211.113.144 "ln -sf /etc/nginx/sites-available/collab.gleeworld.org /etc/nginx/sites-enabled/ && \
  certbot --nginx -d collab.gleeworld.org && nginx -t && systemctl reload nginx"
```

**6. Start it:**

```bash
ssh root@198.211.113.144 "cd /opt/gleeworld-collab && pm2 start ecosystem.config.cjs && pm2 save"
```

**7. Turn it on in the app.** Build with the URL set, then deploy:

```bash
VITE_COLLAB_URL=wss://collab.gleeworld.org npm run build
bash scripts/deploy-frontend.sh --skip-build
```

## Verifying

Open the same document in two browsers signed in as different users (the
second needs an `edit` share). Type in one; the text and a coloured cursor
should appear in the other within a few hundred milliseconds.

Worth testing deliberately, because they're the failure modes that matter:

- **Wrong/expired token** → socket rejected, editor stays usable offline.
- **`view`-only share** → connects, sees changes, cannot type.
- **Kill the server mid-edit** (`pm2 stop gleeworld-collab`) → editors keep
  their local text; on restart, state reloads from Postgres.
- **Two clients open an unmigrated doc at once** → the text must appear once,
  not twice. This is the seeding hazard; the client guards on the shared doc
  being empty.

## Operating notes

- `exec_mode: fork`, one instance, deliberately. Cluster mode would give each
  worker its own copy of a document and they would never reconcile.
- Memory grows with concurrently-open documents (~1–3MB each);
  `max_memory_restart` is set to 600M.
- Logs: `pm2 logs gleeworld-collab`. A rejected socket logs nothing by
  design — expired tokens are routine, not incidents.

## Rolling back

Rebuild the web app **without** `VITE_COLLAB_URL` and deploy. The client stops
connecting immediately; documents keep working through the existing autosave
path. `pm2 stop gleeworld-collab` at leisure. No data migration to undo —
`gw_doc_yjs_state` is additive and `content` was maintained throughout.
