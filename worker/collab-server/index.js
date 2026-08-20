// GleeWorld Documents collaboration server.
//
// A Hocuspocus (Yjs) sync server: it holds each open document's CRDT state in
// memory, broadcasts updates between connected editors, and persists the Yjs
// binary to Postgres on a debounce. See
// docs/design/2026-08-20-documents-realtime-collaboration.md.
//
// AMENDMENT to that design, decided while building: the server does NOT
// derive ProseMirror JSON into gw_personal_docs.content. Doing so would mean
// running the app's full TipTap schema in Node, and several of those
// extensions render React node views — importing them server-side is a fight
// with no prize. Instead the CLIENTS keep writing the JSON projection through
// the autosave they already have. That is safe specifically because CRDT
// guarantees convergence: every connected client derives the SAME JSON, so
// last-write-wins writes identical bytes. The jsonb column stays what it
// already was — the artifact export, search, print and .docx read — and the
// Yjs binary is the source of truth for editing.
//
// Consequence worth knowing: if every client disconnects mid-edit before its
// autosave fires, the Yjs state is safe but `content` can trail by a few
// seconds. The next open reconciles it, because editing seeds from the Yjs
// state, not from the JSON.

import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import pg from 'pg';
import { jwtVerify } from 'jose';

const {
  COLLAB_PORT = '1234',
  DATABASE_URL,
  SUPABASE_JWT_SECRET,
  COLLAB_DEBOUNCE_MS = '5000',
} = process.env;

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!SUPABASE_JWT_SECRET) throw new Error('SUPABASE_JWT_SECRET is required');

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8 });
const jwtSecret = new TextEncoder().encode(SUPABASE_JWT_SECRET);

/** view < comment < edit < owner — the same ladder as gw_doc_can() and the
 *  client's permissionAtLeast(). Kept in sync by hand across three places;
 *  see the test in src/lib/documents/sharesApi.test.ts. */
const LADDER = ['view', 'comment', 'edit', 'owner'];

function atLeast(actual, minimum) {
  const a = LADDER.indexOf(actual);
  const m = LADDER.indexOf(minimum);
  return a >= 0 && m >= 0 && a >= m;
}

/**
 * The caller's permission on a document.
 *
 * Deliberately NOT a call to gw_doc_can(): that helper reads auth.uid() and
 * auth.jwt(), which are set by PostgREST from the request's JWT and are
 * simply absent on a plain pg connection. It would return null for everyone
 * and every connection would be rejected. So the same rule is expressed here
 * against the same two tables.
 */
async function permissionFor(docId, userId, email) {
  const { rows } = await pool.query(
    `select
       case
         when d.user_id = $2 then 'owner'
         else (
           select s.permission
           from gw_doc_shares s
           where s.doc_id = d.id
             and s.revoked_at is null
             and s.shared_with_email = lower($3)
           limit 1
         )
       end as permission
     from gw_personal_docs d
     where d.id = $1`,
    [docId, userId, email ?? ''],
  );
  return rows[0]?.permission ?? null;
}

const server = new Server({
  port: Number(COLLAB_PORT),
  // Bind loopback only: nginx terminates TLS and proxies the upgrade. The
  // server must never be reachable directly from the internet, because the
  // only thing standing between a document and the world is the auth hook
  // below.
  address: '127.0.0.1',

  /**
   * THE load-bearing security step. Without it, any client that can open a
   * socket gets full write access to any document id it can guess.
   *
   * `documentName` is the document's uuid; `token` is the user's Supabase
   * access token, passed by the client on connect.
   */
  async onAuthenticate({ documentName, token }) {
    if (!token) throw new Error('Unauthorized: no token');

    let claims;
    try {
      ({ payload: claims } = await jwtVerify(token, jwtSecret));
    } catch {
      // Deliberately opaque: a client learns "no", not why.
      throw new Error('Unauthorized: bad token');
    }

    const userId = claims.sub;
    const email = typeof claims.email === 'string' ? claims.email : null;
    if (!userId) throw new Error('Unauthorized: token has no subject');

    const permission = await permissionFor(documentName, userId, email);
    if (!atLeast(permission, 'view')) throw new Error('Unauthorized: no access to this document');

    // Anyone below `edit` connects read-only: they see other people's
    // changes and their cursors, and Hocuspocus refuses their updates.
    // Enforced here rather than in the client, where it would be advisory.
    return {
      readOnly: !atLeast(permission, 'edit'),
      // Surfaced to other clients through awareness, for the presence row.
      user: { id: userId, email, permission },
    };
  },

  extensions: [
    new Database({
      /**
       * Seed a document the first time anyone opens it collaboratively.
       *
       * Returning null makes Hocuspocus start an EMPTY doc — which for an
       * existing document would look like the text had been deleted. So a
       * miss here is seeded by the client instead (it holds the schema; see
       * the design doc's migration section), and the row appears on first
       * store.
       */
      async fetch({ documentName }) {
        const { rows } = await pool.query(
          'select state from gw_doc_yjs_state where doc_id = $1',
          [documentName],
        );
        return rows[0]?.state ?? null;
      },

      /**
       * Debounced by Hocuspocus (see debounce config below). Upsert rather
       * than insert: the row is created on the first store after seeding.
       */
      async store({ documentName, state }) {
        await pool.query(
          `insert into gw_doc_yjs_state (doc_id, state, updated_at)
           values ($1, $2, now())
           on conflict (doc_id) do update
             set state = excluded.state, updated_at = now()`,
          [documentName, state],
        );
      },
    }),
  ],

  // Persist at most every 5s, and never let a busy document defer its write
  // indefinitely — maxDebounce caps the tail.
  debounce: Number(COLLAB_DEBOUNCE_MS),
  maxDebounce: 30_000,

  async onListen({ port }) {
    console.log(`[collab] listening on 127.0.0.1:${port}`);
  },
});

server.listen();

// A rejected socket is normal (expired token, revoked share). An unhandled
// rejection killing the process is not — every open document would drop.
process.on('unhandledRejection', (reason) => {
  console.error('[collab] unhandled rejection:', reason);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    console.log(`[collab] ${signal} — flushing open documents`);
    // Hocuspocus stores every dirty document before resolving, so a deploy
    // restart doesn't drop the last few seconds of everyone's typing.
    await server.destroy();
    await pool.end();
    process.exit(0);
  });
}
