# Demo & Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the confusing credential-based GleeWorld demo with a one-click, read-only demo (Director/Student/Fan role switcher) and a single "Request your workspace" conversion path.

**Architecture:** A new `demo-login` edge function mints sessions server-side for three seeded read-only demo accounts; the client gets a `/try` entry route, a persistent `DemoBar` with role switcher, a welcome overlay, and a write-error interceptor. Marketing CTAs collapse to two. Spec: `docs/superpowers/specs/2026-07-06-demo-onboarding-redesign-design.md`.

**Tech Stack:** React 18 + Vite + TypeScript SPA, self-hosted Supabase (Deno edge functions, GoTrue, Postgres RLS), vitest, Capacitor (native shell).

## Global Constraints

- Branch: `demo-onboarding-redesign` (already exists, contains the spec). Commit each task.
- Copy/terminology: say "students" (never "singers"/"members" in marketing copy), "graduates" (never "alumnae"), and keep everything tenant-neutral — the demo org is the fictional **Harmony Hall Choir**; the word "Spelman" must not appear in any new code or content.
- UI: unified light theme (white cards, dark text — use existing Tailwind tokens like `bg-card`, `text-foreground`, `border-border`); minimum text size `text-xs`; icons at least `w-4 h-4`.
- Do NOT modify `public.custom_access_token_hook` (production-critical for all tenants).
- `demo@gleeworld.org` password must never change (published in App Store review notes). `demo-admin@gleeworld.org` gets rotated in Task 12 (its password `GleeDemo2026` is public today).
- Frontend build: `bun x vite build` (the package.json vite pin breaks under `bun x vite@5.4.10`; plain `npm run build` works if node_modules is installed — try `npm run build` first, fall back to `bun x vite build`).
- Frontend deploy: `rsync -av dist/ root@198.211.113.144:/var/www/gleeworld/html/` — **NEVER pass `--delete`** (per-tenant `tenants/*/tenant-bootstrap.js` files live in the docroot and are not in dist/).
- Edge function deploy: `rsync -av supabase/functions/<fn>/ root@198.211.113.144:/opt/supabase/volumes/functions/<fn>/` then `ssh root@198.211.113.144 'cd /opt/supabase && docker compose up -d --force-recreate functions'`. Before the compose command, verify the service name with `docker compose config --services | grep functions` (the container is named `edge-functions`; the compose service is expected to be `functions` — use whatever the config lists).
- SQL against prod: `ssh root@198.211.113.144 'docker exec -i supabase-db psql -U postgres -d postgres'` (heredoc or `-c`).
- Unit tests: `npm test` (vitest). Verify UI work on a local dev server, not prod.
- **Local demo simulation:** the demo only "exists" on the `demo` subdomain in prod. To test demo UI locally, temporarily edit `public/tenant-bootstrap.js` to set `window.__TENANT_CONFIG__ = { tenant: 'demo', org: 'Harmony Hall Choir' };` — **never commit that edit** (`git checkout public/tenant-bootstrap.js` before committing).
- Do NOT build or submit anything to App Store Connect — Task 10 only changes web code; native rebuild is a separate, Kevin-approved step.

---

### Task 1: Demo session library (`src/lib/demoSession.ts`)

Pure client logic: JWT claim decoding, demo-role mapping, session start via the `demo-login` edge function, and a write-error interceptor. TDD the pure parts.

**Files:**
- Create: `src/lib/demoSession.ts`
- Test: `src/lib/demoSession.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/integrations/supabase/client` (already exists; typed `any`).
- Produces (used by Tasks 4, 6, 9, 10):
  - `type DemoRole = 'director' | 'student' | 'fan'`
  - `const DEMO_ROLES: DemoRole[]`
  - `const DEMO_HOME: Record<DemoRole, string>` — `{ director: '/dashboard', student: '/dashboard', fan: '/fan' }`
  - `decodeJwtClaims(jwt: string): Record<string, unknown> | null`
  - `claimsToDemoRole(claims: Record<string, unknown> | null): DemoRole | null`
  - `getDemoSessionRole(): Promise<DemoRole | null>`
  - `startDemoSession(role: DemoRole): Promise<void>` — throws on failure
  - `installDemoWriteInterceptor(): void` — idempotent; fires `window` CustomEvent `gw-demo-write-blocked` on RLS-denied writes
  - Event name constant: `DEMO_WRITE_BLOCKED_EVENT = 'gw-demo-write-blocked'`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/demoSession.test.ts
import { describe, it, expect } from 'vitest';
import { decodeJwtClaims, claimsToDemoRole, DEMO_HOME } from './demoSession';

// Build an unsigned JWT with the given payload (header/signature are ignored
// by the decoder — it only reads the middle segment).
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

describe('decodeJwtClaims', () => {
  it('decodes a base64url payload', () => {
    const claims = decodeJwtClaims(fakeJwt({ tenant_slug: 'demo', demo_viewer: true }));
    expect(claims).toMatchObject({ tenant_slug: 'demo', demo_viewer: true });
  });

  it('returns null on garbage', () => {
    expect(decodeJwtClaims('not-a-jwt')).toBeNull();
    expect(decodeJwtClaims('')).toBeNull();
  });
});

describe('claimsToDemoRole', () => {
  it('maps admin demo viewer to director', () => {
    expect(claimsToDemoRole({ demo_viewer: true, tenant_slug: 'demo', tenant_role: 'admin' }))
      .toBe('director');
  });

  it('maps student and fan roles', () => {
    expect(claimsToDemoRole({ demo_viewer: true, tenant_slug: 'demo', tenant_role: 'student' }))
      .toBe('student');
    expect(claimsToDemoRole({ demo_viewer: true, tenant_slug: 'demo', tenant_role: 'fan' }))
      .toBe('fan');
  });

  it('returns null when demo_viewer is absent (demo-admin, real tenants)', () => {
    expect(claimsToDemoRole({ tenant_slug: 'demo', tenant_role: 'admin' })).toBeNull();
    expect(claimsToDemoRole({ demo_viewer: true, tenant_slug: 'spellman-x', tenant_role: 'admin' })).toBeNull();
    expect(claimsToDemoRole(null)).toBeNull();
  });
});

describe('DEMO_HOME', () => {
  it('routes each role to its post-login home', () => {
    expect(DEMO_HOME.director).toBe('/dashboard');
    expect(DEMO_HOME.student).toBe('/dashboard');
    expect(DEMO_HOME.fan).toBe('/fan');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/demoSession.test.ts`
Expected: FAIL — `Cannot find module './demoSession'` (or equivalent resolve error).

- [ ] **Step 3: Implement `src/lib/demoSession.ts`**

```ts
// Demo-session plumbing for the prospect-facing demo (demo.gleeworld.org).
//
// The demo uses three seeded read-only accounts (director / student / fan),
// all flagged is_demo_viewer so RESTRICTIVE RLS blocks their writes. Sessions
// are minted server-side by the demo-login edge function — no credentials in
// this bundle. See docs/superpowers/specs/2026-07-06-demo-onboarding-redesign-design.md.

import { supabase } from '@/integrations/supabase/client';

export type DemoRole = 'director' | 'student' | 'fan';

export const DEMO_ROLES: DemoRole[] = ['director', 'student', 'fan'];

// Post-switch destination per role — mirrors pickDestination() in
// useRoleBasedRedirect.ts (admin/student → Command Center, fan → fan portal).
export const DEMO_HOME: Record<DemoRole, string> = {
  director: '/dashboard',
  student: '/dashboard',
  fan: '/fan',
};

export const DEMO_WRITE_BLOCKED_EVENT = 'gw-demo-write-blocked';

export function decodeJwtClaims(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// A session is "the demo" only when it carries the server-issued demo_viewer
// claim AND belongs to the demo tenant. demo-admin (Kevin's curator account)
// has no demo_viewer claim, so it never sees prospect chrome.
export function claimsToDemoRole(claims: Record<string, unknown> | null): DemoRole | null {
  if (!claims || claims.demo_viewer !== true) return null;
  if (claims.tenant_slug !== 'demo') return null;
  const role = claims.tenant_role;
  if (role === 'admin') return 'director';
  if (role === 'student') return 'student';
  if (role === 'fan') return 'fan';
  return null;
}

export async function getDemoSessionRole(): Promise<DemoRole | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return claimsToDemoRole(decodeJwtClaims(token));
}

// Mint a demo session for the given role and install it. Throws on failure —
// callers decide the fallback (redirect to /auth, error banner, …).
export async function startDemoSession(role: DemoRole): Promise<void> {
  const { data, error } = await supabase.functions.invoke('demo-login', { body: { role } });
  if (error) throw error;
  const tokens = data as { access_token?: string; refresh_token?: string; error?: string };
  if (!tokens?.access_token || !tokens?.refresh_token) {
    throw new Error(tokens?.error || 'demo-login returned no session');
  }
  const { error: setErr } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (setErr) throw setErr;
}

// ── Write interceptor ────────────────────────────────────────────────────────
// Demo viewers are blocked from writing by RESTRICTIVE RLS. Headline features
// get explicit guards; this interceptor is the global fallback that turns any
// unguarded RLS rejection into a friendly event (DemoBar shows the toast)
// instead of a raw "violates row-level security" toast.

let interceptorInstalled = false;

function looksLikeRlsDenial(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === '42501' || /row-level security/i.test(e.message ?? '');
}

export function installDemoWriteInterceptor(): void {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFrom = supabase.from.bind(supabase);
  supabase.from = (table: string) => {
    const builder = originalFrom(table);
    return wrapBuilder(builder);
  };

  function wrapBuilder(builder: any): any {
    return new Proxy(builder, {
      get(target, prop, receiver) {
        if (prop === 'then') {
          const then = Reflect.get(target, prop, receiver);
          if (typeof then !== 'function') return then;
          return (onFulfilled?: (v: any) => any, onRejected?: (e: any) => any) =>
            then.call(
              target,
              (result: any) => {
                if (result?.error && looksLikeRlsDenial(result.error)) {
                  window.dispatchEvent(new CustomEvent(DEMO_WRITE_BLOCKED_EVENT));
                }
                return onFulfilled ? onFulfilled(result) : result;
              },
              onRejected,
            );
        }
        const value = Reflect.get(target, prop, receiver);
        // Builder methods return new builders — keep them wrapped so the
        // terminal await still passes through the then() above.
        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            const out = value.apply(target, args);
            return out && typeof out === 'object' && typeof out.then === 'function'
              ? wrapBuilder(out)
              : out;
          };
        }
        return value;
      },
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/demoSession.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full suite to check for collateral damage**

Run: `npm test`
Expected: same pass/fail set as before this task (studio tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/lib/demoSession.ts src/lib/demoSession.test.ts
git commit -m "feat(demo): add demo session library (role mapping, session start, write interceptor)"
```

---

### Task 2: `demo-login` edge function

Server-side session minting. Holds the three demo passwords as function env vars, exchanges them against GoTrue's password grant, returns tokens. Per-IP rate limit.

**Files:**
- Create: `supabase/functions/demo-login/index.ts`

**Interfaces:**
- Consumes env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (provided by the functions runtime), `DEMO_DIRECTOR_PASSWORD`, `DEMO_STUDENT_PASSWORD`, `DEMO_FAN_PASSWORD` (added in Task 12).
- Produces HTTP contract (used by `startDemoSession` in Task 1 and `NativeTenantGate` in Task 10):
  - `POST` body `{ "role": "director" | "student" | "fan" }`
  - 200 → `{ access_token, refresh_token, expires_in }`
  - 400 → `{ error: "bad_role" | "bad_json" }`, 405 method, 429 `{ error: "rate_limited" }`, 500/502 `{ error: ... }`

- [ ] **Step 1: Write the function**

```ts
// demo-login — mint a session for one of the three public demo accounts.
//
// The prospect-facing demo is one-click: no credentials ever ship to the
// client. This function holds the passwords (env secrets) and exchanges
// them against GoTrue's password grant. All three accounts are flagged
// is_demo_viewer, so the sessions it returns are read-only under RLS
// regardless of what the client does with them.
//
// Body: { role: 'director' | 'student' | 'fan' }
// Returns: { access_token, refresh_token, expires_in }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACCOUNTS: Record<string, { email: string; passwordEnv: string }> = {
  director: { email: "demo-director@gleeworld.org", passwordEnv: "DEMO_DIRECTOR_PASSWORD" },
  student: { email: "demo-student@gleeworld.org", passwordEnv: "DEMO_STUDENT_PASSWORD" },
  fan: { email: "demo-fan@gleeworld.org", passwordEnv: "DEMO_FAN_PASSWORD" },
};

// Best-effort per-IP rate limit (per-instance memory — GoTrue's own limits
// back this up). 10 mints/minute is plenty for a human clicking around.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear(); // unbounded-growth guard
  return recent.length > MAX_PER_WINDOW;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json(429, { error: "rate_limited" });

  let role = "";
  try {
    role = ((await req.json()) as { role?: string }).role ?? "";
  } catch {
    return json(400, { error: "bad_json" });
  }
  const account = ACCOUNTS[role];
  if (!account) return json(400, { error: "bad_role" });

  const password = Deno.env.get(account.passwordEnv);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!password || !supabaseUrl || !anonKey) {
    console.error("[demo-login] missing env", { role, hasPassword: !!password });
    return json(500, { error: "not_configured" });
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email: account.email, password }),
  });
  if (!res.ok) {
    console.error("[demo-login] grant failed", res.status, await res.text());
    return json(502, { error: "signin_failed" });
  }
  const session = await res.json();
  return json(200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
  });
});
```

- [ ] **Step 2: Syntax-check**

Run: `deno check supabase/functions/demo-login/index.ts` (if `deno --version` fails, skip — the functions container type-checks on boot; watch its logs at deploy in Task 12).
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/demo-login/index.ts
git commit -m "feat(demo): add demo-login edge function (server-minted demo sessions)"
```

---

### Task 3: Seed script for the three demo role accounts

**Files:**
- Create: `scripts/seed-demo-accounts.mjs`

**Interfaces:**
- Consumes env: `SUPABASE_URL`, `SERVICE_ROLE_KEY`, `DEMO_DIRECTOR_PASSWORD`, `DEMO_STUDENT_PASSWORD`, `DEMO_FAN_PASSWORD`.
- Produces: auth users + `gw_profiles` (`is_demo_viewer=true`, correct `role`) + `gw_tenant_members` rows for `demo-director@`, `demo-student@`, `demo-fan@gleeworld.org` in the demo tenant. Idempotent (safe to rerun; updates passwords/flags on existing users).

Notes baked into the script: the `handle_new_user_profile` trigger whitelists only `fan/member/student/singer/viewer` from signup metadata, so the director is created as `member` and promoted to `admin` afterward with the service role (bypasses RLS and the revoked grants).

- [ ] **Step 1: Write the script**

```js
// scripts/seed-demo-accounts.mjs
// Seed (or repair) the three prospect-facing demo accounts. Idempotent.
//
//   SUPABASE_URL=https://supabase.gleeworld.org \
//   SERVICE_ROLE_KEY=... \
//   DEMO_DIRECTOR_PASSWORD=... DEMO_STUDENT_PASSWORD=... DEMO_FAN_PASSWORD=... \
//   node scripts/seed-demo-accounts.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const ACCOUNTS = [
  // signupRole must pass handle_new_user_profile's whitelist; finalRole is
  // what the account should end up as (promoted below via service role).
  { email: 'demo-director@gleeworld.org', name: 'Dana Director', signupRole: 'member', finalRole: 'admin', passwordEnv: 'DEMO_DIRECTOR_PASSWORD' },
  { email: 'demo-student@gleeworld.org', name: 'Sam Student', signupRole: 'student', finalRole: 'student', passwordEnv: 'DEMO_STUDENT_PASSWORD' },
  { email: 'demo-fan@gleeworld.org', name: 'Frankie Fan', signupRole: 'fan', finalRole: 'fan', passwordEnv: 'DEMO_FAN_PASSWORD' },
];

for (const a of ACCOUNTS) {
  if (!process.env[a.passwordEnv]) {
    console.error(`${a.passwordEnv} is required`);
    process.exit(1);
  }
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: tenant, error: tenantErr } = await admin
  .from('gw_tenants').select('id').eq('slug', 'demo').single();
if (tenantErr || !tenant) {
  console.error('demo tenant not found:', tenantErr?.message);
  process.exit(1);
}

async function findUserByEmail(email) {
  // Paged scan — the instance has few enough users for this to be fine.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

for (const a of ACCOUNTS) {
  const password = process.env[a.passwordEnv];
  let user = await findUserByEmail(a.email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email,
      password,
      email_confirm: true,
      user_metadata: { tenant_slug: 'demo', role: a.signupRole, full_name: a.name },
    });
    if (error) throw new Error(`createUser ${a.email}: ${error.message}`);
    user = data.user;
    console.log(`created ${a.email} (${user.id})`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) throw new Error(`updateUser ${a.email}: ${error.message}`);
    console.log(`exists ${a.email} (${user.id}) — password refreshed`);
  }

  // Profile: enforce final role + read-only flag + demo tenant.
  const { error: profErr } = await admin
    .from('gw_profiles')
    .update({ role: a.finalRole, is_demo_viewer: true, tenant_id: tenant.id, status: 'active' })
    .eq('user_id', user.id);
  if (profErr) throw new Error(`profile ${a.email}: ${profErr.message}`);

  // Membership: the trigger inserts one on signup; upsert covers repaired users.
  const { error: memErr } = await admin
    .from('gw_tenant_members')
    .upsert({ user_id: user.id, tenant_id: tenant.id, role: a.finalRole }, { onConflict: 'user_id,tenant_id' });
  if (memErr) throw new Error(`membership ${a.email}: ${memErr.message}`);

  console.log(`  ✓ ${a.email} → role=${a.finalRole}, is_demo_viewer=true`);
}

console.log('done');
```

- [ ] **Step 2: Syntax-check**

Run: `node --check scripts/seed-demo-accounts.mjs`
Expected: exit 0, no output. (Execution against prod happens in Task 12.)

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-demo-accounts.mjs
git commit -m "feat(demo): add idempotent seeder for the three demo role accounts"
```

---

### Task 4: `/try` entry route

One-click entry point. Signs the visitor in as Director and hard-redirects to the Command Center. On failure, falls back to `/auth?demoError=1` (banner added in Task 9).

**Files:**
- Create: `src/pages/TryDemo.tsx`
- Modify: `src/App.tsx` (lazy import near the other `lazy()` consts ~line 42; route next to the `/tour-sandbox` route)

**Interfaces:**
- Consumes: `startDemoSession`, `DEMO_HOME` from `@/lib/demoSession` (Task 1).
- Produces: route `GET /try` (linked by marketing in Task 7 and external URLs `https://demo.gleeworld.org/try`). Sets `sessionStorage['gw-demo-welcome-pending'] = '1'` for the overlay (Task 6).

- [ ] **Step 1: Write `src/pages/TryDemo.tsx`**

```tsx
// /try — one-click demo entry (linked from gleeworld.org "Try the demo").
// Mints a Director session via demo-login and drops the prospect into the
// Command Center. Full-page redirect (not navigate()) so AuthContext and
// every JWT-derived hook boot cleanly against the fresh session.

import { useEffect, useRef, useState } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { startDemoSession, DEMO_HOME } from '@/lib/demoSession';

export default function TryDemo() {
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return; // StrictMode double-invoke guard
    started.current = true;
    (async () => {
      try {
        await startDemoSession('director');
        sessionStorage.setItem('gw-demo-welcome-pending', '1');
        window.location.replace(DEMO_HOME.director);
      } catch (e) {
        console.error('[try-demo] failed', e);
        setFailed(true);
        window.setTimeout(() => window.location.replace('/auth?demoError=1'), 1500);
      }
    })();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, hsl(187 80% 35% / 0.55) 0%, transparent 50%), ' +
          'radial-gradient(ellipse at 75% 80%, hsl(271 75% 45% / 0.55) 0%, transparent 55%), ' +
          'linear-gradient(135deg, hsl(220 60% 12%) 0%, hsl(265 50% 18%) 50%, hsl(290 45% 20%) 100%)',
      }}
    >
      <img src="/lovable-uploads/gleeworld-logo.png" alt="GleeWorld" className="h-14 drop-shadow-lg" />
      {failed ? (
        <p className="text-white/90 text-sm font-medium">
          The demo hit a snag — taking you to sign-in…
        </p>
      ) : (
        <>
          <LoadingSpinner size="lg" />
          <p className="text-white/90 text-sm font-medium">Opening the Harmony Hall Choir demo…</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register the route in `src/App.tsx`**

Next to the other lazy consts (around line 42):

```tsx
const TryDemo = lazy(() => import("./pages/TryDemo"));
```

Next to the `/tour-sandbox` route (search for `path="/tour-sandbox"`):

```tsx
{/* One-click prospect demo entry — mints a read-only Director session. */}
<Route path="/try" element={<TryDemo />} />
```

- [ ] **Step 3: Verify locally**

Run: `npm run dev`, open `http://localhost:5173/try` (Vite prints the port).
Expected: the branded loading screen renders, then (since local has no deployed `demo-login`) it lands on `/auth?demoError=1` after ~1.5s. The happy path is verified in Task 12 against prod.

- [ ] **Step 4: Commit**

```bash
git add src/pages/TryDemo.tsx src/App.tsx
git commit -m "feat(demo): add /try one-click demo entry route"
```

---

### Task 5: `RequestWorkspaceDialog` (unified conversion CTA)

Generalize `BecomeTenantDialog` into the single lead-capture dialog used everywhere (demo bar, dashboard CTA, marketing). Backend (`tenant-intake` fn, `gw_tenant_leads`) is unchanged.

**Files:**
- Create: `src/components/leads/RequestWorkspaceDialog.tsx` (move + rename of `src/components/onboarding/BecomeTenantDialog.tsx`)
- Modify: `src/components/dashboard/DashboardShell.tsx` (import + JSX usage)
- Delete: `src/components/onboarding/BecomeTenantDialog.tsx`

**Interfaces:**
- Produces: `export function RequestWorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void })` — prop-compatible with both old dialogs, so swaps are mechanical. Used by Tasks 6, 7, 9.

- [ ] **Step 1: Create the new component**

`git mv src/components/onboarding/BecomeTenantDialog.tsx src/components/leads/RequestWorkspaceDialog.tsx`, then apply these content changes (everything else stays as-is — form fields, `tenant-intake` invoke, gradient, module options):

1. Rename the interface and component: `BecomeTenantDialogProps` → `RequestWorkspaceDialogProps`; `export function BecomeTenantDialog` → `export function RequestWorkspaceDialog`.
2. Header copy block:

```tsx
<h2 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ letterSpacing: "-0.02em" }}>
  {sent ? "You're on the list." : "Request your GleeWorld workspace."}
</h2>
<p className="mt-2 text-white/85 text-sm sm:text-base">
  {sent
    ? "Kevin will reach out personally within one business day — most workspaces are live within two."
    : "Tell us a bit about your program. Every workspace is set up personally, and most are live within two business days."}
</p>
```

3. The top-of-file comment: replace the first paragraph with

```tsx
// "Request your workspace" — the single conversion CTA for prospects,
// opened from the demo bar, the dashboard upsell, and every marketing
// "Get started" button. Submissions land in gw_tenant_leads via the
// tenant-intake edge function; Kevin provisions manually.
```

4. Footer line under the submit button:

```tsx
<p className="text-xs text-slate-500 text-center">
  Every setup is hands-on — no bots, no self-serve maze.
</p>
```

- [ ] **Step 2: Rewire `DashboardShell.tsx`**

Replace the import (currently `import { BecomeTenantDialog } from '@/components/onboarding/BecomeTenantDialog';`):

```tsx
import { RequestWorkspaceDialog } from '@/components/leads/RequestWorkspaceDialog';
```

Replace every `<BecomeTenantDialog` JSX usage with `<RequestWorkspaceDialog` (search the file; the open/onClose props stay identical). Also update the visible CTA label if it says "Become a tenant" — search `DashboardShell.tsx` for the button text and change it to `Request your workspace`.

- [ ] **Step 3: Verify no stale imports**

Run: `grep -rn "BecomeTenantDialog" src/`
Expected: no matches. Then `npm run lint` — expect the same lint status as before the task (repo may have pre-existing warnings; no NEW errors).

- [ ] **Step 4: Commit**

```bash
git add -A src/components/leads src/components/onboarding src/components/dashboard/DashboardShell.tsx
git commit -m "feat(leads): unify conversion CTA as RequestWorkspaceDialog"
```

---

### Task 6: `DemoBar` + welcome overlay, mounted globally

The persistent prospect chrome: role switcher, Request-your-workspace button, welcome overlay, write-blocked toast.

**Files:**
- Create: `src/components/demo/DemoBar.tsx`
- Create: `src/components/demo/DemoWelcomeOverlay.tsx`
- Modify: `src/App.tsx` (mount + interceptor install)

**Interfaces:**
- Consumes: `getDemoSessionRole`, `startDemoSession`, `DEMO_HOME`, `DEMO_ROLES`, `DEMO_WRITE_BLOCKED_EVENT`, `installDemoWriteInterceptor` (Task 1); `RequestWorkspaceDialog` (Task 5); `toast` from `sonner` (already a dependency — `Sonner` toaster is mounted in App).
- Produces: `<DemoBar />` — self-gating (renders nothing for non-demo sessions), safe to mount unconditionally.

**Design note (deviation from spec, agreed):** the spec sketched per-button "try it" popovers on headline features plus a global fallback. This plan ships the global path only — the interceptor toast (with a "Request your workspace" action) IS the try-it moment, and it covers every write everywhere with zero per-feature wiring. Per-button popovers become follow-up polish if the toast proves too subtle in practice.

- [ ] **Step 1: Write `src/components/demo/DemoWelcomeOverlay.tsx`**

```tsx
// First-landing welcome for prospects entering via /try. Shown once per
// browser session; explains what the demo is and that nothing can break.

import { X } from 'lucide-react';

const PROMO_GRADIENT = 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)';

export function DemoWelcomeOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 5, 24, 0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onDismiss}
    >
      <div
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: PROMO_GRADIENT }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onDismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="px-7 pt-8 pb-5 text-white">
          <div className="text-xs uppercase tracking-[0.18em] font-semibold opacity-80 mb-2">
            Welcome to the demo
          </div>
          <h2 className="text-2xl font-bold leading-tight" style={{ letterSpacing: '-0.02em' }}>
            Meet the Harmony Hall Choir.
          </h2>
        </div>
        <div className="bg-card px-7 py-6">
          <p className="text-sm text-foreground leading-relaxed">
            Harmony Hall is a fictional program running on GleeWorld — real screens, real
            sample data. Look around freely: <strong>nothing you click can break anything</strong>.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Use the bar at the top to see the same program through a director's, a student's,
            or a fan's eyes — or request a workspace of your own.
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-6 w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: PROMO_GRADIENT }}
          >
            Start exploring
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/demo/DemoBar.tsx`**

```tsx
// Persistent chrome for prospect demo sessions (demo_viewer JWT claim).
// Renders nothing for everyone else — safe to mount unconditionally in App.
// Owns: role switcher, "Request your workspace" CTA, first-visit welcome
// overlay, and the friendly toast for blocked writes.

import { useEffect, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEMO_HOME,
  DEMO_ROLES,
  DEMO_WRITE_BLOCKED_EVENT,
  getDemoSessionRole,
  startDemoSession,
  type DemoRole,
} from '@/lib/demoSession';
import { RequestWorkspaceDialog } from '@/components/leads/RequestWorkspaceDialog';
import { DemoWelcomeOverlay } from '@/components/demo/DemoWelcomeOverlay';

const ROLE_LABEL: Record<DemoRole, string> = {
  director: 'Director',
  student: 'Student',
  fan: 'Fan',
};

const WELCOME_SEEN_KEY = 'gw-demo-welcome-seen';
const WELCOME_PENDING_KEY = 'gw-demo-welcome-pending';

export function DemoBar() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState<DemoRole | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDemoSessionRole().then((r) => {
      if (cancelled || !r) return;
      setRole(r);
      const pending = sessionStorage.getItem(WELCOME_PENDING_KEY) === '1';
      const seen = sessionStorage.getItem(WELCOME_SEEN_KEY) === '1';
      if (pending || !seen) setShowWelcome(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Friendly fallback when an unguarded write hits the read-only RLS wall.
  useEffect(() => {
    if (!role) return;
    const onBlocked = () => {
      toast.info("This is a preview — in your own GleeWorld, that change would save.", {
        id: 'demo-write-blocked', // dedupe bursts
        action: { label: 'Request your workspace', onClick: () => setLeadOpen(true) },
      });
    };
    window.addEventListener(DEMO_WRITE_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(DEMO_WRITE_BLOCKED_EVENT, onBlocked);
  }, [role]);

  if (!role) return null;

  const dismissWelcome = () => {
    sessionStorage.setItem(WELCOME_SEEN_KEY, '1');
    sessionStorage.removeItem(WELCOME_PENDING_KEY);
    setShowWelcome(false);
  };

  const switchRole = async (next: DemoRole) => {
    setMenuOpen(false);
    if (next === role || switching) return;
    setSwitching(next);
    try {
      await startDemoSession(next);
      // Full reload: AuthContext, role hooks, and RLS-scoped queries all
      // re-derive from the new JWT.
      window.location.assign(DEMO_HOME[next]);
    } catch (e) {
      console.error('[demo-bar] role switch failed', e);
      setSwitching(null);
      toast.error("Couldn't switch views — try again in a moment.");
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 bg-card border-b border-border px-3 sm:px-6 h-11 flex items-center gap-2 sm:gap-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs sm:text-sm text-muted-foreground truncate">
          You're exploring GleeWorld as
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-foreground rounded-md border border-border px-2 py-1 hover:bg-muted transition-colors"
          >
            {switching ? `Switching…` : ROLE_LABEL[role]}
            <ChevronDown className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-border bg-card shadow-lg py-1 z-50">
              {DEMO_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchRole(r)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                    r === role ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setLeadOpen(true)}
          className="text-xs sm:text-sm font-semibold text-white rounded-full px-3 sm:px-4 py-1.5 transition-transform hover:scale-[1.02] shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)' }}
        >
          Request your workspace
        </button>
      </div>

      <RequestWorkspaceDialog open={leadOpen} onClose={() => setLeadOpen(false)} />
      {showWelcome && <DemoWelcomeOverlay onDismiss={dismissWelcome} />}
    </>
  );
}
```

- [ ] **Step 3: Mount in `src/App.tsx`**

Add the import with the other non-lazy imports:

```tsx
import { DemoBar } from '@/components/demo/DemoBar';
import { installDemoWriteInterceptor } from '@/lib/demoSession';
```

Inside the `App` component render, directly above `<Suspense` (the one wrapping `<Routes>`, after `<DesignSystemEnforcer />` / `<UsageTracker>` opening tag), add:

```tsx
<DemoBar />
```

And install the interceptor once — add at module scope in `App.tsx` (right after imports):

```tsx
// Global fallback that converts read-only-demo RLS rejections into a
// friendly DemoBar toast. No-ops for non-demo sessions (event has no listener).
if (typeof window !== 'undefined') installDemoWriteInterceptor();
```

- [ ] **Step 4: Verify locally with the demo-tenant simulation**

Edit `public/tenant-bootstrap.js` (temporarily, per Global Constraints) to set `window.__TENANT_CONFIG__ = { tenant: 'demo', org: 'Harmony Hall Choir' };`. Run `npm run dev`. Because there's no local demo session, the bar should NOT render on `/` (gates on the JWT claim, not the tenant slug) — confirm no bar and no console errors. Full behavioral verification happens against prod in Task 12. Revert with `git checkout public/tenant-bootstrap.js`.

- [ ] **Step 5: Run tests + commit**

Run: `npm test` — expected: same results as Task 1.

```bash
git add src/components/demo/ src/App.tsx
git commit -m "feat(demo): add DemoBar with role switcher, welcome overlay, write-blocked toast"
```

---### Task 7: Marketing CTA cleanup (`GleeWorldLanding.tsx`)

Collapse every prospect CTA to two: **Try the demo** (`https://demo.gleeworld.org/try`) and **Request your workspace** (`RequestWorkspaceDialog`). Remove the credentials popup and demo mailtos.

**Files:**
- Modify: `src/pages/GleeWorldLanding.tsx`
- Delete: `src/components/landing/DemoCredsPopup.tsx`, `src/components/landing/InquiryDialog.tsx`

**Interfaces:**
- Consumes: `RequestWorkspaceDialog` (Task 5), route `/try` (Task 4).

- [ ] **Step 1: Swap the dialog and kill the popup**

In `src/pages/GleeWorldLanding.tsx`:

1. Replace `import { InquiryDialog } from "@/components/landing/InquiryDialog";` with `import { RequestWorkspaceDialog } from "@/components/leads/RequestWorkspaceDialog";` and delete `import { DemoCredsPopup } from "@/components/landing/DemoCredsPopup";`.
2. Replace `<InquiryDialog open={inquiryOpen} onClose={() => setInquiryOpen(false)} />` with `<RequestWorkspaceDialog open={inquiryOpen} onClose={() => setInquiryOpen(false)} />` and delete the `<DemoCredsPopup />` line below it.

- [ ] **Step 2: Unify the demo links**

Still in `GleeWorldLanding.tsx`:

1. Near the `MAILTO_BUY` constant (~line 514), add:

```tsx
const TRY_DEMO_URL = 'https://demo.gleeworld.org/try';
```

2. Delete the `MAILTO_PERSONAL` and `MAILTO_DEMO` constants. Any remaining `MAILTO_PERSONAL` usage (pricing fallback around line 1657) switches to `MAILTO_BUY`. `MAILTO_BUY` itself stays — it's the purchase-contact fallback for tiers without a checkout link, not a demo CTA.
3. Every `MAILTO_DEMO` href (nav link ~672, final CTA ~1470, pricing card ~1519) becomes `TRY_DEMO_URL`, and the visible labels change from "Demo" / "Book a demo" / "Book a live demo →" to **"Try the demo"**.
4. The hero secondary button (~line 745, `href="https://demo.gleeworld.org"`, label "Watch a demo") becomes `href={TRY_DEMO_URL}` with the label **"Try the demo"**.
5. The legacy tenant-clone page's raw mailto (~line 365, `href="mailto:kevin@gleeworld.org?subject=GleeWorld%20demo%20request"`, label "Book a demo") becomes `href={TRY_DEMO_URL}` label **"Try the demo"** (keep `target="_blank"` if present).

- [ ] **Step 3: Delete the dead components and check references**

```bash
git rm src/components/landing/DemoCredsPopup.tsx src/components/landing/InquiryDialog.tsx
grep -rn "DemoCredsPopup\|InquiryDialog\|MAILTO_DEMO\|MAILTO_PERSONAL" src/
```

Expected: grep returns no matches.

- [ ] **Step 4: Visual check**

Run `npm run dev`, open `http://localhost:5173/` (with `public/tenant-bootstrap.js` untouched, i.e. `main` tenant → marketing site). Confirm: no credentials popup after scrolling/12s; nav shows "Try the demo"; hero secondary button says "Try the demo"; "Get started" opens the Request-workspace dialog with the new copy.

- [ ] **Step 5: Commit**

```bash
git add -A src/pages/GleeWorldLanding.tsx src/components/landing
git commit -m "feat(marketing): collapse CTAs to Try-the-demo + Request-your-workspace"
```

---

### Task 8: Consolidate demo-tenant detection

One slug-based helper; remove the hardcoded tenant UUID from the client; hide sandbox toggles from read-only prospects.

**Files:**
- Create: `src/lib/demoTenant.ts`
- Modify: `src/components/dashboard/DashboardShell.tsx` (~lines 90-101)
- Modify: `src/pages/dashboard/WorkspaceSettingsPage.tsx` (~lines 230-270)

**Interfaces:**
- Produces: `isDemoTenant(): boolean` from `@/lib/demoTenant`.
- Note: the server-side pin in `supabase/functions/gw-demo-toggle-addon/index.ts` (hardcoded `DEMO_TENANT_ID`) stays — it's a server hard-gate and out of scope.

- [ ] **Step 1: Create `src/lib/demoTenant.ts`**

```ts
// Tenant-level demo detection (is this SUBDOMAIN the public demo?).
// For session-level detection (is this VISITOR a read-only prospect?)
// use getDemoSessionRole() from '@/lib/demoSession' — demo-admin browses
// the demo tenant without being a demo viewer.

export function isDemoTenant(): boolean {
  if (typeof window === 'undefined') return false;
  const slug = (window as unknown as { __TENANT_CONFIG__?: { tenant?: string } })
    .__TENANT_CONFIG__?.tenant;
  return slug === 'demo';
}
```

- [ ] **Step 2: Use it in `DashboardShell.tsx`**

Delete the local `function isDemoTenant()` block (the one with the "True when the current subdomain is the public demo" comment) and add to the imports:

```tsx
import { isDemoTenant } from '@/lib/demoTenant';
```

`showBecomeTenantCta` usage keeps working unchanged.

- [ ] **Step 3: Fix `WorkspaceSettingsPage.tsx`**

1. Delete the `const DEMO_TENANT_ID = 'ae2fbec2-7562-45f9-9028-c4df93b99cef';` constant (and its comment).
2. Find the `workspace-is-demo` query. Replace its claim comparison so it keys off the slug and excludes read-only prospects:

```tsx
// Demo tenant (sandbox toggles) — but never for read-only demo viewers:
// their writes are RLS-blocked, so showing toggles would just fail.
const { data: isDemo = false } = useQuery({
  queryKey: ['workspace-is-demo'],
  queryFn: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return false;
    const { decodeJwtClaims } = await import('@/lib/demoSession');
    const claims = decodeJwtClaims(token);
    return claims?.tenant_slug === 'demo' && claims?.demo_viewer !== true;
  },
});
```

(Keep the rest of the panel logic that branches on `isDemo` as-is.)

- [ ] **Step 4: Verify**

Run: `grep -rn "ae2fbec2-7562" src/` — expected: no matches (the UUID survives only in `supabase/functions/gw-demo-toggle-addon/`). Run `npm run lint` on the two touched files' status: no new errors. `npm test`: unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/lib/demoTenant.ts src/components/dashboard/DashboardShell.tsx src/pages/dashboard/WorkspaceSettingsPage.tsx
git commit -m "refactor(demo): single slug-based demo-tenant helper; hide sandbox toggles from demo viewers"
```

---

### Task 9: AuthPage — demo-tenant signup redirect + `/try` failure banner

On `demo.gleeworld.org/auth`: no public signup into the demo tenant (prospects get pointed at Request-your-workspace), and a friendly banner when `/try` bounced them here.

**Files:**
- Modify: `src/pages/AuthPage.tsx`

**Interfaces:**
- Consumes: `isDemoTenant` (Task 8), `RequestWorkspaceDialog` (Task 5); the `?demoError=1` param set by `TryDemo` (Task 4).

- [ ] **Step 1: Add imports and state**

In `src/pages/AuthPage.tsx` add:

```tsx
import { isDemoTenant } from '@/lib/demoTenant';
import { RequestWorkspaceDialog } from '@/components/leads/RequestWorkspaceDialog';
```

Inside the component, next to the existing `isLogin` state (~line 45):

```tsx
const onDemoTenant = isDemoTenant();
const demoError = new URLSearchParams(window.location.search).get('demoError') === '1';
const [workspaceOpen, setWorkspaceOpen] = useState(false);
```

- [ ] **Step 2: Force login mode + swap the signup toggle on the demo tenant**

Find the login/signup toggle block (the button with `onClick={() => setIsLogin(!isLogin)}` and the "Don't have an account?" copy, ~lines 439-450). Wrap it:

```tsx
<div className="mt-5 text-center">
  {onDemoTenant ? (
    <button
      type="button"
      onClick={() => setWorkspaceOpen(true)}
      className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
    >
      Want GleeWorld for your program?{' '}
      <span className="underline underline-offset-2">Request your workspace</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setIsLogin(!isLogin)}
      className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
    >
      {isLogin ? "Don't have an account? " : 'Already have an account? '}
      <span className="underline underline-offset-2">
        {isLogin ? 'Create one' : 'Sign in'}
      </span>
    </button>
  )}
</div>
```

Also guard the mode itself — near the top of the component add:

```tsx
useEffect(() => {
  if (onDemoTenant) setIsLogin(true); // no public signup into the demo tenant
}, [onDemoTenant]);
```

And render the dialog before the component's closing wrapper:

```tsx
<RequestWorkspaceDialog open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} />
```

- [ ] **Step 3: Add the `/try` failure banner**

Directly above the `<form` element, add:

```tsx
{demoError && (
  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
    <p className="text-xs text-amber-800 leading-relaxed">
      The one-click demo hit a snag. Try{' '}
      <a href="/try" className="font-semibold underline underline-offset-2">opening it again</a>
      {' '}— or reach us via "Request your workspace" below.
    </p>
  </div>
)}
```

- [ ] **Step 4: Verify locally**

With the demo-tenant simulation active in `public/tenant-bootstrap.js` (per Global Constraints), open `http://localhost:5173/auth?demoError=1`: banner shows, no "Create one" toggle, the workspace link opens the dialog. Revert the bootstrap edit afterward.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AuthPage.tsx
git commit -m "feat(demo): demo-tenant auth page — no public signup, /try failure banner"
```

---

### Task 10: Native demo entry alignment

`NativeTenantGate`'s "Try the demo choir" uses `demo-login` instead of bundled credentials. Web-asset change only — **do not build or submit an iOS binary** (Kevin approves that separately; `demo@gleeworld.org` keeps working for App Review in the currently shipped build regardless).

**Files:**
- Modify: `src/components/native/NativeTenantGate.tsx`

**Interfaces:**
- Consumes: `startDemoSession` (Task 1), which calls the `demo-login` fn (Task 2).

- [ ] **Step 1: Replace the credential constants and `tryDemo`**

In `src/components/native/NativeTenantGate.tsx`:

1. Delete the `DEMO_EMAIL` and `DEMO_PASSWORD` constants (keep `DEMO_SLUG`) and the comment above them. Add the import:

```tsx
import { startDemoSession } from '@/lib/demoSession';
```

2. Add error state next to the other state hooks:

```tsx
const [demoError, setDemoError] = useState(false);
```

3. Replace the `tryDemo` function:

```tsx
const tryDemo = async () => {
  if (!demo || demoLoading) return;
  setDemoLoading(true);
  setDemoError(false);
  try {
    // Server-minted read-only Director session — no credentials in the bundle.
    await startDemoSession('director');
    sessionStorage.setItem('gw-demo-welcome-pending', '1');
    selectTenant(demo); // persists tenant choice, then reloads
  } catch (e) {
    console.error('[native-demo] demo-login failed', e);
    setDemoLoading(false);
    setDemoError(true);
  }
};
```

4. Under the "Try the demo choir" button's helper text, surface the error:

```tsx
{demoError && (
  <p className="text-xs text-amber-300 mt-2">
    Couldn't open the demo — check your connection and try again.
  </p>
)}
```

- [ ] **Step 2: Verify**

Run: `grep -rn "GleeDemo2026" src/` — expected: **no matches** (this was the last credential in the bundle). Run `npm test` + `npm run lint`: unchanged status.

- [ ] **Step 3: Commit**

```bash
git add src/components/native/NativeTenantGate.tsx
git commit -m "feat(native): demo entry via demo-login — no credentials in the bundle"
```

---

### Task 11: Harmony Hall Choir demo data

Fresh, tenant-neutral sample content. Split: a script for what's schema-stable (roster accounts, calendar events), a curation checklist through the product (as `demo-admin@`) for the rest — using the real UI both guarantees valid data and dogfoods the flows a prospect will see.

**Files:**
- Create: `scripts/seed-demo-roster.mjs`
- Create: `scripts/seed-demo-events.sql`
- Create: `docs/superpowers/specs/2026-07-06-demo-curation-checklist.md`

**Interfaces:**
- Consumes: demo tenant row (`gw_tenants.slug = 'demo'`); `gw_events.calendar_id` is NOT NULL → the SQL creates/uses a "Harmony Hall Season" calendar first.
- Produces: 12 student roster members, 8 season events. Everything named Harmony Hall / fictional people.

- [ ] **Step 1: Write `scripts/seed-demo-roster.mjs`**

```js
// scripts/seed-demo-roster.mjs
// Seed 12 fictional Harmony Hall Choir students into the demo tenant so the
// roster, attendance, and messaging screens look alive. Idempotent.
//
//   SUPABASE_URL=https://supabase.gleeworld.org SERVICE_ROLE_KEY=... \
//   node scripts/seed-demo-roster.mjs

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const url = process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SERVICE_ROLE_KEY are required');
  process.exit(1);
}

// Fictional names — no real people, no institution references.
const STUDENTS = [
  'Amara Fields', 'Jordan Blake', 'Priya Raman', 'Marcus Bell',
  'Sofia Alvarez', 'Tyler Nguyen', 'Zoe Whitfield', 'Elias Grant',
  'Naomi Carter', 'Deshawn Reed', 'Lily Okafor', 'Gabriel Santos',
];

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: tenant, error: tErr } = await admin
  .from('gw_tenants').select('id').eq('slug', 'demo').single();
if (tErr || !tenant) { console.error('demo tenant not found'); process.exit(1); }

for (const name of STUDENTS) {
  const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@demo.harmonyhall.example`;
  const { data: existing } = await admin
    .from('gw_profiles').select('user_id').eq('email', email).maybeSingle();
  if (existing) { console.log(`exists ${email}`); continue; }

  // Random throwaway password — these accounts are roster dressing, never logins.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: randomBytes(24).toString('base64'),
    email_confirm: true,
    user_metadata: { tenant_slug: 'demo', role: 'student', full_name: name },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  console.log(`created ${email} (${data.user.id})`);
}

console.log('done');
```

- [ ] **Step 2: Write `scripts/seed-demo-events.sql`**

```sql
-- Harmony Hall Choir season events for the demo tenant. Idempotent
-- (keyed on title + demo tenant). Run on the droplet:
--   docker exec -i supabase-db psql -U postgres -d postgres < seed-demo-events.sql
--
-- BEFORE first run, sanity-check column names against the live schema:
--   docker exec supabase-db psql -U postgres -d postgres -c '\d public.gw_events'
-- gw_events.calendar_id is NOT NULL, so the calendar comes first.

DO $$
DECLARE
  v_tenant uuid;
  v_calendar uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.gw_tenants WHERE slug = 'demo';
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'demo tenant not found'; END IF;

  SELECT id INTO v_calendar FROM public.gw_calendars
   WHERE name = 'Harmony Hall Season' LIMIT 1;
  IF v_calendar IS NULL THEN
    INSERT INTO public.gw_calendars (name, description, color, is_default, is_visible)
    VALUES ('Harmony Hall Season', 'Concert season for the Harmony Hall Choir', '#2563eb', true, true)
    RETURNING id INTO v_calendar;
  END IF;

  INSERT INTO public.gw_events
    (tenant_id, calendar_id, title, description, location, start_date, end_date,
     event_type, category, is_public, status)
  SELECT v_tenant, v_calendar, e.title, e.descr, e.loc, e.starts, e.ends,
         e.etype, e.cat, true, 'confirmed'
  FROM (VALUES
    ('Fall Kickoff Rehearsal', 'First full-choir rehearsal of the season. Bring your folders.', 'Harmony Hall, Room 204', timestamptz '2026-08-24 18:00-04', timestamptz '2026-08-24 20:00-04', 'rehearsal', 'rehearsal'),
    ('Sectionals: Sopranos & Altos', 'Upper-voice sectional on the Fall program.', 'Harmony Hall, Room 108', timestamptz '2026-08-31 18:00-04', timestamptz '2026-08-31 19:30-04', 'rehearsal', 'rehearsal'),
    ('Sectionals: Tenors & Basses', 'Lower-voice sectional on the Fall program.', 'Harmony Hall, Room 110', timestamptz '2026-09-02 18:00-04', timestamptz '2026-09-02 19:30-04', 'rehearsal', 'rehearsal'),
    ('Fall Preview Concert', 'A first look at the season repertoire. Free for students, tickets for guests.', 'Harmony Hall Auditorium', timestamptz '2026-09-26 19:30-04', timestamptz '2026-09-26 21:00-04', 'concert', 'performance'),
    ('Community Sing-Along', 'Open community event — the choir leads, everyone sings.', 'Riverside Park Bandshell', timestamptz '2026-10-10 15:00-04', timestamptz '2026-10-10 16:30-04', 'concert', 'community'),
    ('Retreat Weekend', 'Intensive rehearsal retreat: musicianship workshops and full runs.', 'Camp Crescendo', timestamptz '2026-10-23 17:00-04', timestamptz '2026-10-25 12:00-04', 'retreat', 'rehearsal'),
    ('Winter Gala', 'The season centerpiece — full program with guest instrumentalists.', 'Harmony Hall Auditorium', timestamptz '2026-12-12 19:30-05', timestamptz '2026-12-12 21:30-05', 'concert', 'performance'),
    ('Holiday Pops & Reception', 'Lighter holiday set followed by a donor reception.', 'Grand Atrium', timestamptz '2026-12-19 18:00-05', timestamptz '2026-12-19 20:30-05', 'concert', 'performance')
  ) AS e(title, descr, loc, starts, ends, etype, cat)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gw_events x
    WHERE x.tenant_id = v_tenant AND x.title = e.title
  );
END $$;
```

- [ ] **Step 3: Write the curation checklist**

Create `docs/superpowers/specs/2026-07-06-demo-curation-checklist.md`:

```markdown
# Harmony Hall demo curation checklist

Done through the product UI signed in as demo-admin@gleeworld.org (writable
curator account) on https://demo.gleeworld.org — using the real flows both
produces valid data and dogfoods what prospects see. Tenant-neutral only:
no Spelman, no real people. Terminology: "students", "graduates".

- [ ] Branding: workspace name "Harmony Hall Choir", pick a logo + colors
      (Workspace Settings → Branding).
- [ ] Landing page: hero headline, about blurb, 2-3 stock-style photos,
      upcoming-events block (Landing Editor).
- [ ] Repertoire / music library: add 8-10 public-domain pieces
      (e.g. Mozart "Ave Verum Corpus", Handel "Hallelujah", trad. spirituals
      arr. entries) with parts/PDFs where available.
- [ ] Setlist: build the "Winter Gala" program from the repertoire.
- [ ] Glee Academy: one course ("Sight-Singing Fundamentals") with 3-4
      lessons; enroll several seeded students with varied progress.
- [ ] Box Office: create the "Winter Gala" ticketed event (sandbox — no
      real Stripe products), 2 price tiers, a handful of comp orders so
      the sales dashboard isn't empty.
- [ ] Announcements: 2-3 posts (retreat logistics, gala call time).
- [ ] Walk each DemoBar role (Director / Student / Fan) and confirm every
      headline screen shows content, not empty states.
```

- [ ] **Step 4: Syntax checks + commit**

Run: `node --check scripts/seed-demo-roster.mjs` — exit 0. (SQL is validated on the droplet in Task 12 via the `\d gw_events` pre-check.)

```bash
git add scripts/seed-demo-roster.mjs scripts/seed-demo-events.sql docs/superpowers/specs/2026-07-06-demo-curation-checklist.md
git commit -m "feat(demo): Harmony Hall seed scripts + curation checklist"
```

---

### Task 12: Deploy, secrets, seeding, rotation, end-to-end verification

Everything server-side, in dependency order. All droplet commands target `root@198.211.113.144`.

**Files:** none in-repo (operational task; the curation checklist from Task 11 gets executed afterwards by Kevin/demo-admin).

- [ ] **Step 1: Generate the three demo passwords (keep them out of the repo)**

```bash
for r in DIRECTOR STUDENT FAN; do echo "DEMO_${r}_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"; done
```

Save the three lines somewhere transient (they go into the droplet env next and are never needed client-side).

- [ ] **Step 2: Add secrets to the functions runtime**

```bash
ssh root@198.211.113.144
# Confirm how the functions service gets env (expected: env_file or environment in compose):
cd /opt/supabase && grep -n -A15 'functions:' docker-compose.yml | head -30
# Append the three DEMO_*_PASSWORD lines to the env file the functions service reads
# (expected /opt/supabase/.env — confirm from the compose output above):
printf '%s\n' 'DEMO_DIRECTOR_PASSWORD=...' 'DEMO_STUDENT_PASSWORD=...' 'DEMO_FAN_PASSWORD=...' >> /opt/supabase/.env
```

If the compose file's functions service uses an explicit `environment:` list rather than wholesale env_file, add the three variables there too (`DEMO_DIRECTOR_PASSWORD: ${DEMO_DIRECTOR_PASSWORD}` etc.).

- [ ] **Step 3: Deploy `demo-login` and recreate the functions container**

```bash
rsync -av supabase/functions/demo-login/ root@198.211.113.144:/opt/supabase/volumes/functions/demo-login/
ssh root@198.211.113.144 'cd /opt/supabase && docker compose config --services | grep functions && docker compose up -d --force-recreate functions && sleep 5 && docker compose logs --tail=20 functions'
```

Expected: container recreates; logs show no boot errors mentioning demo-login.

- [ ] **Step 4: Seed the demo accounts**

```bash
SUPABASE_URL=https://supabase.gleeworld.org \
SERVICE_ROLE_KEY=$(ssh root@198.211.113.144 "grep '^SERVICE_ROLE_KEY' /opt/supabase/.env | cut -d= -f2-") \
DEMO_DIRECTOR_PASSWORD=... DEMO_STUDENT_PASSWORD=... DEMO_FAN_PASSWORD=... \
node scripts/seed-demo-accounts.mjs
```

Expected output: three `✓ ... role=..., is_demo_viewer=true` lines. Verify in SQL:

```bash
ssh root@198.211.113.144 "docker exec supabase-db psql -U postgres -d postgres -c \"SELECT p.email, p.role, p.is_demo_viewer, tm.role AS member_role FROM gw_profiles p JOIN gw_tenant_members tm ON tm.user_id = p.user_id JOIN gw_tenants t ON t.id = tm.tenant_id WHERE t.slug='demo' AND p.email LIKE 'demo-%@gleeworld.org' ORDER BY p.email;\""
```

Expected: `demo-admin` (admin, is_demo_viewer=f) plus the three new rows — director/admin, student, fan, all `is_demo_viewer = t`.

- [ ] **Step 5: Smoke-test `demo-login`**

```bash
curl -s -X POST https://supabase.gleeworld.org/functions/v1/demo-login \
  -H 'Content-Type: application/json' -d '{"role":"director"}' | head -c 200
curl -s -X POST https://supabase.gleeworld.org/functions/v1/demo-login \
  -H 'Content-Type: application/json' -d '{"role":"nope"}'
```

Expected: first returns `{"access_token":"eyJ...` ; second returns `{"error":"bad_role"}`. (If the gateway requires an apikey header for /functions/v1, add `-H "apikey: <anon key>"` — the browser client sends it automatically.)

- [ ] **Step 6: Seed demo data**

```bash
ssh root@198.211.113.144 "docker exec supabase-db psql -U postgres -d postgres -c '\d public.gw_events'" | head -30   # column sanity check
scp scripts/seed-demo-events.sql root@198.211.113.144:/root/
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U postgres -d postgres < /root/seed-demo-events.sql'

SUPABASE_URL=https://supabase.gleeworld.org SERVICE_ROLE_KEY=... node scripts/seed-demo-roster.mjs
```

Expected: SQL runs without error (if a column in the INSERT doesn't exist in `\d` output, fix the SQL to match the live schema before running); roster script prints 12 created/exists lines.

- [ ] **Step 7: Build and deploy the frontend**

```bash
npm run build   # if it fails on the vite pin: bun x vite build
rsync -av dist/ root@198.211.113.144:/var/www/gleeworld/html/   # NO --delete, ever
```

- [ ] **Step 8: Rotate the leaked demo-admin password**

`demo-admin@gleeworld.org / GleeDemo2026` was published by the old popup. Rotate it (new value to Kevin's password manager); **do not touch `demo@gleeworld.org`**:

```bash
NEWPW=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24) && echo "demo-admin new password: $NEWPW"
# then via the GoTrue admin API:
curl -s -X PUT "https://supabase.gleeworld.org/auth/v1/admin/users/$(curl -s 'https://supabase.gleeworld.org/auth/v1/admin/users?page=1&per_page=200' -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" | python3 -c 'import json,sys; print([u["id"] for u in json.load(sys.stdin)["users"] if u["email"]=="demo-admin@gleeworld.org"][0])')" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' -d "{\"password\":\"$NEWPW\"}"
```

- [ ] **Step 9: End-to-end verification (the prospect journey)**

On `https://gleeworld.org`: no credentials popup (scroll past hero + wait 15s); nav + hero say "Try the demo"; "Get started" opens the Request-workspace dialog.

On `https://demo.gleeworld.org/try` (fresh incognito window):
1. Lands signed-in on `/dashboard` with the welcome overlay; dismiss it.
2. DemoBar shows "as Director"; switch to Student → reload onto `/dashboard` with student-scoped view; switch to Fan → lands on `/fan`.
3. As Director, attempt a write (e.g. create a calendar event): friendly "This is a preview…" toast — no raw RLS error.
4. DemoBar "Request your workspace" → submit a test lead → confirm the row: `ssh root@198.211.113.144 "docker exec supabase-db psql -U postgres -d postgres -c \"SELECT org_name, email, source_tenant_slug, created_at FROM gw_tenant_leads ORDER BY created_at DESC LIMIT 3;\""` and delete the test row afterwards.
5. `demo.gleeworld.org/auth`: no "Create one" toggle; workspace link opens the dialog.
6. Sign in as `demo@gleeworld.org` with its unchanged password (from App Review notes): still works, still read-only.
7. Mobile width (Chrome devtools 390px): DemoBar fits, no horizontal scroll.

- [ ] **Step 10: Wrap up**

Hand the Task 11 curation checklist to Kevin/demo-admin. Note for later (requires Kevin's explicit approval, never automatic): a new iOS build is needed before the native "Try the demo choir" button uses the new flow in the shipped app.

```bash
git add docs/superpowers/plans/2026-07-06-demo-onboarding-redesign.md
git commit -m "docs: check off demo redesign deploy plan" --allow-empty
```
