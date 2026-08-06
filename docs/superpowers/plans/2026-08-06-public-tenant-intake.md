# Public Tenant Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anonymous visitors on a tenant's public page book an appointment or complete an audition without ever hitting a login wall, registering them as part of the submission and confirming by email and SMS.

**Architecture:** One anon-callable Supabase Edge Function, `public-intake`, is the single write path for both flows. Its decision logic lives in a pure, dependency-injected module (`_shared/publicIntake.ts`) so vitest can test it in Node; `public-intake/index.ts` is a thin Deno wrapper supplying real I/O. The function runs with the service role internally, so neither `book_appointment` nor any write is exposed to `anon` — that is what makes the rate limit unbypassable.

**Tech Stack:** Vite + React 18 + TypeScript, React Router v6, TanStack Query, shadcn/Radix, Supabase (self-hosted) with Deno Edge Functions, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-06-public-tenant-intake-design.md`

## Global Constraints

- **Worktree:** all work happens in `~/Documents/GitHub/gw-worktrees/public-intake` on branch `feat/public-tenant-intake`. Never the shared `~/Documents/GitHub/gleeworld` checkout.
- **Worktree deps:** if `node_modules` is absent, install with `npm ci --legacy-peer-deps` (pdfjs-dist peer conflict). Do not pipe npm to `tail` — it hides the failure.
- **Tenant-neutral:** no tenant's name may appear in shipped code, copy, or defaults. One build serves ~50 tenants. "Doc's World" belongs in that tenant's `gw_branding_settings` row, never in a source file.
- **Never use `_shared/branding.ts:getOrgName()` on this path.** It selects `.order("id").limit(1)` from `gw_branding_settings` under service role (RLS bypassed) and caches globally for 60s — an arbitrary tenant's name, pinned. Use the tenant-scoped helper from Task 2.
- **`gw_branding_settings` writes** always use `onConflict: 'tenant_id'` plus a `getTenantSlug()` pin. Bare upserts have poisoned the main tenant's row twice.
- **Migrations:** new files only under `supabase/migrations/`. Never edit a historical migration.
- **Typecheck gate:** `npm run typecheck:guard` (baseline diff). Do not edit `.typecheck-baseline.txt`.
- **Never split** react/react-dom/Radix/shadcn into their own Vite chunks.
- Terminology in user-visible copy: "students", not "singers" or "members"; "graduates", not "alumnae/alumni".
- Every task ends with a commit. Do not push or open a PR until the whole plan is done and Kevin has reviewed.

## File Structure

**Create:**
- `supabase/functions/_shared/publicIntake.ts` — pure intake orchestration + template rendering + rate-limit evaluation. No Deno-only imports, so vitest can import it.
- `supabase/functions/_shared/__tests__/publicIntake.test.ts` — vitest suite for the above.
- `supabase/functions/_shared/tenantBranding.ts` — tenant-scoped branding lookup by slug.
- `supabase/functions/_shared/__tests__/tenantBranding.test.ts`
- `supabase/functions/public-intake/index.ts` — Deno wrapper wiring real I/O into `handleIntake`.
- `supabase/functions/send-booking-confirmation-email/index.ts` — booking-side sibling of the audition confirmation email.
- `supabase/migrations/20260806120000_public_intake.sql` — rate-limit table, `welcome_sms_template` column, anon grant on `get_available_time_slots`.
- `src/pages/PublicBookingPage.tsx` — the `/book` route.
- `src/components/publicBooking/BookingServicePicker.tsx`
- `src/components/publicBooking/BookingSlotPicker.tsx`
- `src/components/publicBooking/BookingAccountForm.tsx`
- `src/lib/publicIntakeClient.ts` — typed browser-side caller for the edge function, shared by both flows.
- `src/lib/__tests__/publicIntakeClient.test.ts`
- `src/components/audition/auditionPages.ts` — ordered page model replacing the dual-branch switch.
- `src/components/audition/__tests__/auditionPages.test.ts`
- `e2e/public-intake.spec.ts`

**Modify:**
- `src/App.tsx:1063` — retarget the `/book-appointment` redirect; add the `/book` route.
- `src/components/public-site/blocks/appointment-booking.tsx:64,526` — default booking URL.
- `src/components/audition/AuditionFormProvider.tsx` — adopt the page model, add draft persistence.
- `src/components/audition/pages/RegistrationPage.tsx` — becomes the final step; stops calling `signUp`.
- `src/pages/AuditionPage.tsx` — delete the `!user` submit bail; submit via `publicIntakeClient`.
- The tenant branding settings admin surface — add the welcome-SMS field. Path is identified in Task 10 Step 1 rather than guessed here.

---

### Task 1: Pure intake logic — template rendering and rate-limit evaluation

Start with the two smallest pure functions so the test harness for this module is proven before the orchestrator lands on top of it.

**Files:**
- Create: `supabase/functions/_shared/publicIntake.ts`
- Test: `supabase/functions/_shared/__tests__/publicIntake.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `renderSmsTemplate(template: string | null | undefined, vars: { orgName: string; firstName: string }): string`
  - `DEFAULT_WELCOME_SMS_TEMPLATE: string`
  - `evaluateRateLimit(counts: { email: number; ip: number }): { allowed: boolean }`
  - `RATE_LIMIT_PER_EMAIL_PER_HOUR: number` (5), `RATE_LIMIT_PER_IP_PER_HOUR: number` (20)
  - `interface TenantBranding { tenantId: string | null; orgName: string; welcomeSmsTemplate: string }` — declared here, consumed by Task 2, so imports run one way only.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/_shared/__tests__/publicIntake.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  renderSmsTemplate,
  DEFAULT_WELCOME_SMS_TEMPLATE,
  evaluateRateLimit,
  RATE_LIMIT_PER_EMAIL_PER_HOUR,
  RATE_LIMIT_PER_IP_PER_HOUR,
} from '../publicIntake';

describe('renderSmsTemplate', () => {
  it('substitutes org_name and first_name', () => {
    expect(
      renderSmsTemplate('Thank you for coming to {org_name}, {first_name}!', {
        orgName: "Doc's World",
        firstName: 'Ada',
      }),
    ).toBe("Thank you for coming to Doc's World, Ada!");
  });

  it('falls back to the default template when none is set', () => {
    expect(renderSmsTemplate(null, { orgName: 'Testing Choir', firstName: 'Ada' }))
      .toBe('Thanks for joining Testing Choir!');
    expect(renderSmsTemplate('   ', { orgName: 'Testing Choir', firstName: 'Ada' }))
      .toBe('Thanks for joining Testing Choir!');
  });

  it('substitutes every occurrence of a placeholder', () => {
    expect(renderSmsTemplate('{org_name} — {org_name}', { orgName: 'X', firstName: 'A' }))
      .toBe('X — X');
  });

  it('leaves unknown placeholders untouched rather than blanking them', () => {
    expect(renderSmsTemplate('Hi {first_name}, see {nonsense}', { orgName: 'X', firstName: 'Ada' }))
      .toBe('Hi Ada, see {nonsense}');
  });

  it('does not let template values inject further placeholders', () => {
    // A tenant whose org_name literally contains "{first_name}" must not have
    // it expanded — otherwise branding text becomes a template injection.
    expect(renderSmsTemplate('{org_name}', { orgName: 'A {first_name} B', firstName: 'Ada' }))
      .toBe('A {first_name} B');
  });

  it('exports the documented default', () => {
    expect(DEFAULT_WELCOME_SMS_TEMPLATE).toBe('Thanks for joining {org_name}!');
  });
});

describe('evaluateRateLimit', () => {
  it('allows counts below both thresholds', () => {
    expect(evaluateRateLimit({ email: 0, ip: 0 }).allowed).toBe(true);
    expect(evaluateRateLimit({ email: 4, ip: 19 }).allowed).toBe(true);
  });

  it('blocks once the email threshold is reached', () => {
    expect(evaluateRateLimit({ email: RATE_LIMIT_PER_EMAIL_PER_HOUR, ip: 0 }).allowed).toBe(false);
  });

  it('blocks once the IP threshold is reached', () => {
    expect(evaluateRateLimit({ email: 0, ip: RATE_LIMIT_PER_IP_PER_HOUR }).allowed).toBe(false);
  });

  it('uses the documented thresholds', () => {
    expect(RATE_LIMIT_PER_EMAIL_PER_HOUR).toBe(5);
    expect(RATE_LIMIT_PER_IP_PER_HOUR).toBe(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/_shared/__tests__/publicIntake.test.ts`
Expected: FAIL — cannot resolve `../publicIntake`.

- [ ] **Step 3: Write minimal implementation**

Create `supabase/functions/_shared/publicIntake.ts`:

```ts
// Pure decision logic for the public-intake edge function.
//
// Deliberately free of Deno-only imports so vitest (Node) can drive it
// directly — same arrangement as _shared/permissionSlipToken.ts. All I/O is
// injected by public-intake/index.ts.

export const DEFAULT_WELCOME_SMS_TEMPLATE = 'Thanks for joining {org_name}!';

export const RATE_LIMIT_PER_EMAIL_PER_HOUR = 5;
export const RATE_LIMIT_PER_IP_PER_HOUR = 20;

// Declared here rather than in tenantBranding.ts so imports between the two
// modules run one way only: tenantBranding → publicIntake, never back.
export interface TenantBranding {
  tenantId: string | null;
  orgName: string;
  welcomeSmsTemplate: string;
}

/**
 * Fill {org_name} / {first_name} in a tenant's welcome SMS template.
 *
 * Substitution is single-pass: a value that itself contains a placeholder is
 * emitted literally, never re-expanded. A tenant's org_name is untrusted
 * input as far as this function is concerned.
 */
export function renderSmsTemplate(
  template: string | null | undefined,
  vars: { orgName: string; firstName: string },
): string {
  const source = (template ?? '').trim() || DEFAULT_WELCOME_SMS_TEMPLATE;
  const values: Record<string, string> = {
    org_name: vars.orgName,
    first_name: vars.firstName,
  };
  return source.replace(/\{(org_name|first_name)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

export function evaluateRateLimit(counts: { email: number; ip: number }): { allowed: boolean } {
  return {
    allowed:
      counts.email < RATE_LIMIT_PER_EMAIL_PER_HOUR && counts.ip < RATE_LIMIT_PER_IP_PER_HOUR,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/_shared/__tests__/publicIntake.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/publicIntake.ts supabase/functions/_shared/__tests__/publicIntake.test.ts
git commit -m "feat(public-intake): SMS template rendering and rate-limit thresholds"
```

---

### Task 2: Tenant-scoped branding lookup

**Files:**
- Create: `supabase/functions/_shared/tenantBranding.ts`
- Test: `supabase/functions/_shared/__tests__/tenantBranding.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_WELCOME_SMS_TEMPLATE` and the `TenantBranding` interface from Task 1.
- Produces:
  - `resolveTenantBranding(query: BrandingQuery, tenantSlug: string | null | undefined): Promise<TenantBranding>`
  - `type BrandingQuery = (slug: string) => Promise<{ tenant_id: string; org_name: string | null; welcome_sms_template: string | null } | null>`
  - `DEFAULT_ORG_NAME: string` (`'GleeWorld'`)

The query function is injected rather than built inside, both so vitest can drive it and so the caller controls which Supabase client is used.

**Import direction matters here.** `TenantBranding` is declared in `publicIntake.ts` (Task 1 adds it) and imported by `tenantBranding.ts`, never the reverse. Declaring it in `tenantBranding.ts` and importing it back into `publicIntake.ts` creates a cycle between the two modules — survivable today because the back-edge is type-only and gets erased, but it breaks the moment anyone needs a runtime value across it.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/_shared/__tests__/tenantBranding.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { resolveTenantBranding, DEFAULT_ORG_NAME } from '../tenantBranding';
import { DEFAULT_WELCOME_SMS_TEMPLATE } from '../publicIntake';

describe('resolveTenantBranding', () => {
  it('returns the tenant row when the slug resolves', async () => {
    const query = vi.fn().mockResolvedValue({
      tenant_id: 't-1',
      org_name: "Doc's World",
      welcome_sms_template: 'Thank you for coming to {org_name}!',
    });
    const result = await resolveTenantBranding(query, 'docsworld');
    expect(query).toHaveBeenCalledWith('docsworld');
    expect(result).toEqual({
      tenantId: 't-1',
      orgName: "Doc's World",
      welcomeSmsTemplate: 'Thank you for coming to {org_name}!',
    });
  });

  it('falls back to the default template when the tenant has not set one', async () => {
    const query = vi.fn().mockResolvedValue({
      tenant_id: 't-2', org_name: 'Testing Choir', welcome_sms_template: null,
    });
    const result = await resolveTenantBranding(query, 'testing');
    expect(result.welcomeSmsTemplate).toBe(DEFAULT_WELCOME_SMS_TEMPLATE);
  });

  it('falls back to the default org name when the row has none', async () => {
    const query = vi.fn().mockResolvedValue({
      tenant_id: 't-3', org_name: '   ', welcome_sms_template: null,
    });
    const result = await resolveTenantBranding(query, 'blank');
    expect(result.orgName).toBe(DEFAULT_ORG_NAME);
  });

  it('never queries when the slug is missing, and returns a null tenantId', async () => {
    const query = vi.fn();
    const result = await resolveTenantBranding(query, null);
    expect(query).not.toHaveBeenCalled();
    expect(result).toEqual({
      tenantId: null,
      orgName: DEFAULT_ORG_NAME,
      welcomeSmsTemplate: DEFAULT_WELCOME_SMS_TEMPLATE,
    });
  });

  it('degrades to defaults when the query throws rather than failing the submission', async () => {
    const query = vi.fn().mockRejectedValue(new Error('db down'));
    const result = await resolveTenantBranding(query, 'testing');
    expect(result.orgName).toBe(DEFAULT_ORG_NAME);
    expect(result.tenantId).toBeNull();
  });

  it('does not cache across tenants', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ tenant_id: 'a', org_name: 'Alpha', welcome_sms_template: null })
      .mockResolvedValueOnce({ tenant_id: 'b', org_name: 'Beta', welcome_sms_template: null });
    expect((await resolveTenantBranding(query, 'alpha')).orgName).toBe('Alpha');
    expect((await resolveTenantBranding(query, 'beta')).orgName).toBe('Beta');
  });
});
```

The final test is the whole reason this module exists — `_shared/branding.ts` caches one org name process-wide and would return "Alpha" for both.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/_shared/__tests__/tenantBranding.test.ts`
Expected: FAIL — cannot resolve `../tenantBranding`.

- [ ] **Step 3: Write minimal implementation**

Create `supabase/functions/_shared/tenantBranding.ts`:

```ts
// Tenant-scoped branding lookup for public (unauthenticated) flows.
//
// _shared/branding.ts:getOrgName() must NOT be used here. It selects
// gw_branding_settings with .order("id").limit(1) and memoizes the result for
// 60s. Edge functions run as service role, which bypasses RLS, so that query
// returns whichever tenant happens to sort first — and then pins it for every
// other tenant's requests for the next minute. This module resolves by slug
// and holds no cache.

import { DEFAULT_WELCOME_SMS_TEMPLATE, type TenantBranding } from './publicIntake.ts';

export const DEFAULT_ORG_NAME = 'GleeWorld';

export type { TenantBranding };

export type BrandingQuery = (slug: string) => Promise<{
  tenant_id: string;
  org_name: string | null;
  welcome_sms_template: string | null;
} | null>;

const FALLBACK: TenantBranding = {
  tenantId: null,
  orgName: DEFAULT_ORG_NAME,
  welcomeSmsTemplate: DEFAULT_WELCOME_SMS_TEMPLATE,
};

export async function resolveTenantBranding(
  query: BrandingQuery,
  tenantSlug: string | null | undefined,
): Promise<TenantBranding> {
  const slug = (tenantSlug ?? '').trim();
  if (!slug) return { ...FALLBACK };

  try {
    const row = await query(slug);
    if (!row) return { ...FALLBACK };
    return {
      tenantId: row.tenant_id,
      orgName: row.org_name?.trim() || DEFAULT_ORG_NAME,
      welcomeSmsTemplate: row.welcome_sms_template?.trim() || DEFAULT_WELCOME_SMS_TEMPLATE,
    };
  } catch {
    // Branding is cosmetic; never fail a submission over it.
    return { ...FALLBACK };
  }
}
```

Note the `.ts` extension on the relative import — Deno requires it, and the vitest alias config resolves it fine.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/_shared/__tests__/tenantBranding.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/tenantBranding.ts supabase/functions/_shared/__tests__/tenantBranding.test.ts
git commit -m "feat(public-intake): tenant-scoped branding lookup, no cross-tenant cache"
```

---

### Task 3: The intake orchestrator

The heart of the feature: ordering, the no-orphan guarantee, and the never-touch-existing-accounts rule, all as a pure function over injected I/O.

**Files:**
- Modify: `supabase/functions/_shared/publicIntake.ts`
- Test: `supabase/functions/_shared/__tests__/publicIntake.test.ts` (append)

**Interfaces:**
- Consumes: `renderSmsTemplate`, `evaluateRateLimit` (Task 1); `TenantBranding` (Task 2).
- Produces:

```ts
export type IntakeKind = 'appointment' | 'audition';

export interface IntakeAccount {
  email: string; password: string; firstName: string; lastName: string; phone?: string | null;
}

export interface IntakeInput {
  kind: IntakeKind;
  tenantSlug: string | null;
  sourceIp: string;
  account: IntakeAccount;
  payload: Record<string, unknown>;
}

export type IntakeFailure =
  | 'rate_limited' | 'invalid_input' | 'unavailable' | 'no_active_session' | 'write_failed';

export interface IntakeDeps {
  countRecentAttempts(email: string, ip: string): Promise<{ email: number; ip: number }>;
  recordAttempt(email: string, ip: string): Promise<void>;
  preflight(input: IntakeInput): Promise<{ ok: true } | { ok: false; reason: IntakeFailure; message: string }>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  createAccount(account: IntakeAccount, tenantSlug: string | null): Promise<{ id: string }>;
  deleteAccount(userId: string): Promise<void>;
  writeRecord(input: IntakeInput, userId: string): Promise<{ id: string }>;
  branding(tenantSlug: string | null): Promise<TenantBranding>;
  sendEmail(args: { to: string; kind: IntakeKind; recordId: string; input: IntakeInput }): Promise<void>;
  sendSms(args: { to: string; body: string }): Promise<void>;
  log(event: string, detail: unknown): void;
}

export interface IntakeSuccess {
  ok: true; recordId: string; accountStatus: 'created' | 'existing';
}
export interface IntakeError {
  ok: false; reason: IntakeFailure; message: string;
}

export function handleIntake(deps: IntakeDeps, input: IntakeInput): Promise<IntakeSuccess | IntakeError>;
```

- [ ] **Step 1: Write the failing test**

Append to `supabase/functions/_shared/__tests__/publicIntake.test.ts`:

```ts
import { handleIntake, type IntakeDeps, type IntakeInput } from '../publicIntake';

const INPUT: IntakeInput = {
  kind: 'audition',
  tenantSlug: 'testing',
  sourceIp: '203.0.113.9',
  account: { email: 'ada@example.com', password: 'correct horse battery', firstName: 'Ada', lastName: 'Lovelace', phone: '5551234567' },
  payload: { sectionType: 'vocal' },
};

function makeDeps(over: Partial<IntakeDeps> = {}): IntakeDeps {
  return {
    countRecentAttempts: vi.fn().mockResolvedValue({ email: 0, ip: 0 }),
    recordAttempt: vi.fn().mockResolvedValue(undefined),
    preflight: vi.fn().mockResolvedValue({ ok: true }),
    findUserByEmail: vi.fn().mockResolvedValue(null),
    createAccount: vi.fn().mockResolvedValue({ id: 'new-user' }),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    writeRecord: vi.fn().mockResolvedValue({ id: 'rec-1' }),
    branding: vi.fn().mockResolvedValue({
      tenantId: 't-1', orgName: "Doc's World",
      welcomeSmsTemplate: 'Thank you for coming to {org_name}!',
    }),
    sendEmail: vi.fn().mockResolvedValue(undefined),
    sendSms: vi.fn().mockResolvedValue(undefined),
    log: vi.fn(),
    ...over,
  };
}

describe('handleIntake', () => {
  it('creates the account, writes the record, and notifies', async () => {
    const deps = makeDeps();
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({ ok: true, recordId: 'rec-1', accountStatus: 'created' });
    expect(deps.createAccount).toHaveBeenCalledOnce();
    expect(deps.writeRecord).toHaveBeenCalledWith(INPUT, 'new-user');
    expect(deps.sendEmail).toHaveBeenCalledOnce();
    expect(deps.sendSms).toHaveBeenCalledWith({
      to: '5551234567', body: "Thank you for coming to Doc's World!",
    });
  });

  it('links an existing account without ever modifying it', async () => {
    const deps = makeDeps({ findUserByEmail: vi.fn().mockResolvedValue({ id: 'old-user' }) });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({ ok: true, recordId: 'rec-1', accountStatus: 'existing' });
    expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.deleteAccount).not.toHaveBeenCalled();
    expect(deps.writeRecord).toHaveBeenCalledWith(INPUT, 'old-user');
  });

  it('deletes the account it just created when the record write fails', async () => {
    const deps = makeDeps({ writeRecord: vi.fn().mockRejectedValue(new Error('slot gone')) });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({
      ok: false, reason: 'write_failed',
      message: 'We could not save your submission. Please try again.',
    });
    expect(deps.deleteAccount).toHaveBeenCalledWith('new-user');
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.sendSms).not.toHaveBeenCalled();
  });

  it('never deletes a pre-existing account when the record write fails', async () => {
    const deps = makeDeps({
      findUserByEmail: vi.fn().mockResolvedValue({ id: 'old-user' }),
      writeRecord: vi.fn().mockRejectedValue(new Error('slot gone')),
    });
    const result = await handleIntake(deps, INPUT);
    expect(result.ok).toBe(false);
    expect(deps.deleteAccount).not.toHaveBeenCalled();
  });

  it('rejects a rate-limited submission before touching anything', async () => {
    const deps = makeDeps({ countRecentAttempts: vi.fn().mockResolvedValue({ email: 5, ip: 0 }) });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({
      ok: false, reason: 'rate_limited',
      message: 'Too many attempts. Please try again shortly.',
    });
    expect(deps.findUserByEmail).not.toHaveBeenCalled();
    expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.preflight).not.toHaveBeenCalled();
  });

  it('rejects a failed pre-flight before creating an account', async () => {
    const deps = makeDeps({
      preflight: vi.fn().mockResolvedValue({
        ok: false, reason: 'no_active_session',
        message: 'No active audition session found. Please contact administration.',
      }),
    });
    const result = await handleIntake(deps, INPUT);
    expect(result).toEqual({
      ok: false, reason: 'no_active_session',
      message: 'No active audition session found. Please contact administration.',
    });
    expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.writeRecord).not.toHaveBeenCalled();
  });

  it('records the attempt even when the submission is rejected', async () => {
    const deps = makeDeps({ preflight: vi.fn().mockResolvedValue({ ok: false, reason: 'unavailable', message: 'Taken' }) });
    await handleIntake(deps, INPUT);
    expect(deps.recordAttempt).toHaveBeenCalledWith('ada@example.com', '203.0.113.9');
  });

  it('still succeeds when the email send throws', async () => {
    const deps = makeDeps({ sendEmail: vi.fn().mockRejectedValue(new Error('resend down')) });
    const result = await handleIntake(deps, INPUT);
    expect(result.ok).toBe(true);
    expect(deps.log).toHaveBeenCalledWith('notify_failed', expect.anything());
  });

  it('still succeeds when the SMS send throws', async () => {
    const deps = makeDeps({ sendSms: vi.fn().mockRejectedValue(new Error('twilio down')) });
    const result = await handleIntake(deps, INPUT);
    expect(result.ok).toBe(true);
  });

  it('skips SMS entirely when no phone was given', async () => {
    const deps = makeDeps();
    const noPhone = { ...INPUT, account: { ...INPUT.account, phone: null } };
    const result = await handleIntake(deps, noPhone);
    expect(result.ok).toBe(true);
    expect(deps.sendSms).not.toHaveBeenCalled();
  });

  it('rejects a malformed email without hitting the database', async () => {
    const deps = makeDeps();
    const bad = { ...INPUT, account: { ...INPUT.account, email: 'not-an-email' } };
    const result = await handleIntake(deps, bad);
    expect(result).toEqual({
      ok: false, reason: 'invalid_input', message: 'Please enter a valid email address.',
    });
    expect(deps.countRecentAttempts).not.toHaveBeenCalled();
  });

  it('rejects a password under 8 characters', async () => {
    const deps = makeDeps();
    const bad = { ...INPUT, account: { ...INPUT.account, password: 'short' } };
    const result = await handleIntake(deps, bad);
    expect(result.reason).toBe('invalid_input');
    expect(deps.createAccount).not.toHaveBeenCalled();
  });

  it('normalizes the email to lowercase before lookup so case cannot fork an account', async () => {
    const deps = makeDeps();
    await handleIntake(deps, { ...INPUT, account: { ...INPUT.account, email: 'Ada@Example.COM' } });
    expect(deps.findUserByEmail).toHaveBeenCalledWith('ada@example.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/_shared/__tests__/publicIntake.test.ts`
Expected: FAIL — `handleIntake` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `supabase/functions/_shared/publicIntake.ts` (keep the existing exports above it):

`TenantBranding` is already declared in this file by Task 1 — do not import it from
`tenantBranding.ts`, which would create a cycle.

```ts
export type IntakeKind = 'appointment' | 'audition';

export interface IntakeAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface IntakeInput {
  kind: IntakeKind;
  tenantSlug: string | null;
  sourceIp: string;
  account: IntakeAccount;
  payload: Record<string, unknown>;
}

export type IntakeFailure =
  | 'rate_limited'
  | 'invalid_input'
  | 'unavailable'
  | 'no_active_session'
  | 'write_failed';

export interface IntakeDeps {
  countRecentAttempts(email: string, ip: string): Promise<{ email: number; ip: number }>;
  recordAttempt(email: string, ip: string): Promise<void>;
  preflight(
    input: IntakeInput,
  ): Promise<{ ok: true } | { ok: false; reason: IntakeFailure; message: string }>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  createAccount(account: IntakeAccount, tenantSlug: string | null): Promise<{ id: string }>;
  deleteAccount(userId: string): Promise<void>;
  writeRecord(input: IntakeInput, userId: string): Promise<{ id: string }>;
  branding(tenantSlug: string | null): Promise<TenantBranding>;
  sendEmail(args: {
    to: string; kind: IntakeKind; recordId: string; input: IntakeInput;
  }): Promise<void>;
  sendSms(args: { to: string; body: string }): Promise<void>;
  log(event: string, detail: unknown): void;
}

export interface IntakeSuccess {
  ok: true;
  recordId: string;
  accountStatus: 'created' | 'existing';
}

export interface IntakeError {
  ok: false;
  reason: IntakeFailure;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function fail(reason: IntakeFailure, message: string): IntakeError {
  return { ok: false, reason, message };
}

/**
 * Orchestrates a public submission.
 *
 * Ordering is load-bearing:
 *   validate → rate-limit → pre-flight → account → record → notify
 *
 * The account must precede the record because audition_applications.user_id
 * is NOT NULL REFERENCES auth.users(id). The no-orphan guarantee therefore
 * comes from pre-flight (catching everything that can be caught without
 * writing) plus a compensating delete of an account we created ourselves. An
 * account that already existed is never created, never modified, never
 * deleted — that rule is what stops this endpoint being an account-takeover
 * vector.
 */
export async function handleIntake(
  deps: IntakeDeps,
  input: IntakeInput,
): Promise<IntakeSuccess | IntakeError> {
  const email = input.account.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return fail('invalid_input', 'Please enter a valid email address.');
  }
  if ((input.account.password ?? '').length < MIN_PASSWORD_LENGTH) {
    return fail('invalid_input', 'Please choose a password of at least 8 characters.');
  }

  const counts = await deps.countRecentAttempts(email, input.sourceIp);
  if (!evaluateRateLimit(counts).allowed) {
    // Deliberately uniform: never disclose whether the email is registered.
    return fail('rate_limited', 'Too many attempts. Please try again shortly.');
  }
  await deps.recordAttempt(email, input.sourceIp);

  const pre = await deps.preflight(input);
  if (!pre.ok) return fail(pre.reason, pre.message);

  const existing = await deps.findUserByEmail(email);
  let userId: string;
  let accountStatus: 'created' | 'existing';
  if (existing) {
    userId = existing.id;
    accountStatus = 'existing';
  } else {
    const created = await deps.createAccount({ ...input.account, email }, input.tenantSlug);
    userId = created.id;
    accountStatus = 'created';
  }

  let recordId: string;
  try {
    const record = await deps.writeRecord(input, userId);
    recordId = record.id;
  } catch (err) {
    if (accountStatus === 'created') {
      try {
        await deps.deleteAccount(userId);
      } catch (cleanupErr) {
        // Nothing further we can do; surface it so it can be reconciled.
        deps.log('orphan_account', { userId, email, error: String(cleanupErr) });
      }
    }
    deps.log('write_failed', { kind: input.kind, error: String(err) });
    return fail('write_failed', 'We could not save your submission. Please try again.');
  }

  // Notifications are best-effort. The record is real either way, so a dead
  // mail or SMS provider must never turn a successful submission into a
  // failure the visitor sees.
  try {
    await deps.sendEmail({ to: email, kind: input.kind, recordId, input });
  } catch (err) {
    deps.log('notify_failed', { channel: 'email', error: String(err) });
  }

  const phone = (input.account.phone ?? '').trim();
  if (phone) {
    try {
      const brand = await deps.branding(input.tenantSlug);
      await deps.sendSms({
        to: phone,
        body: renderSmsTemplate(brand.welcomeSmsTemplate, {
          orgName: brand.orgName,
          firstName: input.account.firstName,
        }),
      });
    } catch (err) {
      deps.log('notify_failed', { channel: 'sms', error: String(err) });
    }
  }

  return { ok: true, recordId, accountStatus };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/_shared/__tests__/publicIntake.test.ts`
Expected: PASS, 23 tests (10 from Task 1 + 13 here).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/publicIntake.ts supabase/functions/_shared/__tests__/publicIntake.test.ts
git commit -m "feat(public-intake): intake orchestrator with no-orphan guarantee"
```

---

### Task 4: Migration — rate-limit table, SMS template column, anon slot read

**Files:**
- Create: `supabase/migrations/20260806120000_public_intake.sql`

**Interfaces:**
- Produces: table `gw_public_intake_attempts`; column `gw_branding_settings.welcome_sms_template`; `GRANT EXECUTE ON FUNCTION public.get_available_time_slots(...) TO anon`.

Read `docs/` or an existing recent migration first to match the house style for tenant columns. Every new tenant-scoped table in this codebase needs `tenant_id uuid DEFAULT current_tenant_id()`, a RESTRICTIVE RLS policy, and a BEFORE INSERT trigger — but note this table is written **only** by the service role, so it gets RLS enabled with no permissive policy at all, which denies every anon/authenticated caller by default.

- [ ] **Step 1: Confirm the exact signature of `get_available_time_slots`**

Run:
```bash
grep -rn "FUNCTION public.get_available_time_slots" supabase/migrations/*.sql | tail -3
```
Use the argument types from the most recent definition verbatim in the GRANT below. If the signature differs from `(uuid, date, integer)`, adjust.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/20260806120000_public_intake.sql`:

```sql
-- Public intake: anonymous appointment booking and audition submission.
--
-- Rate-limit ledger for public-intake. Written ONLY by the edge function
-- under the service role, so RLS is enabled with no permissive policy —
-- anon and authenticated are denied by default, service_role bypasses RLS.
CREATE TABLE IF NOT EXISTS public.gw_public_intake_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  source_ip   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_public_intake_attempts ENABLE ROW LEVEL SECURITY;

-- Both lookups are equality-on-caller plus a range on time
-- (WHERE email = ? AND created_at >= now() - interval '1 hour'), so the
-- EQUALITY column must lead. A btree can only use a leading range predicate
-- as a scan bound; with created_at first, the caller column degrades to a
-- row-by-row filter over every attempt from every caller in the window,
-- making the rate-limit check O(global recent traffic).
CREATE INDEX IF NOT EXISTS idx_public_intake_attempts_email
  ON public.gw_public_intake_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_intake_attempts_ip
  ON public.gw_public_intake_attempts (source_ip, created_at DESC);

COMMENT ON TABLE public.gw_public_intake_attempts IS
  'Rate-limit ledger for the public-intake edge function. Service-role only. '
  'Rows older than 24h are disposable.';

-- Per-tenant welcome SMS copy. One build serves every tenant, so this text
-- can never live in the frontend bundle. {org_name} and {first_name} are
-- substituted at send time; anything else is emitted literally.
ALTER TABLE public.gw_branding_settings
  ADD COLUMN IF NOT EXISTS welcome_sms_template text;

COMMENT ON COLUMN public.gw_branding_settings.welcome_sms_template IS
  'Welcome SMS sent after a public appointment booking or audition. '
  'Placeholders: {org_name}, {first_name}. NULL falls back to '
  '"Thanks for joining {org_name}!".';

-- The public booking page renders open slots before the visitor has any
-- session. Read-only, and it exposes nothing the appointment block does not
-- already advertise publicly.
GRANT EXECUTE ON FUNCTION public.get_available_time_slots(uuid, date, integer)
  TO anon;

-- Deliberately NOT granted to anon: public.book_appointment. Every public
-- booking goes through the public-intake edge function so the rate limit
-- cannot be bypassed by calling the RPC directly.
```

- [ ] **Step 3: Verify the SQL parses**

This repo's self-hosted DB has no `schema_migrations` table, so migrations are verified by object existence rather than by a migration runner. Ask Kevin to apply it (he runs prod DB statements via the `!` prefix, as `-U supabase_admin` for DDL), then verify:

```sql
SELECT to_regclass('public.gw_public_intake_attempts');
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'gw_branding_settings' AND column_name = 'welcome_sms_template';
SELECT has_function_privilege('anon', 'public.get_available_time_slots(uuid, date, integer)', 'EXECUTE');
```
Expected: a non-null regclass, one row, and `t`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260806120000_public_intake.sql
git commit -m "feat(public-intake): rate-limit ledger, welcome SMS template, anon slot read"
```

---

### Task 5: The `public-intake` edge function

**Files:**
- Create: `supabase/functions/public-intake/index.ts`
- Create: `supabase/functions/send-booking-confirmation-email/index.ts`

**Interfaces:**
- Consumes: `handleIntake`, `IntakeDeps`, `IntakeInput` (Task 3); `resolveTenantBranding` (Task 2); the migration objects (Task 4).
- Produces: `POST /functions/v1/public-intake` accepting
  `{ kind, tenantSlug, account: { email, password, firstName, lastName, phone }, payload }`
  and returning `{ ok: true, recordId, accountStatus }` or `{ ok: false, reason, message }`.

This function has **no `authenticateCaller` gate** — that is the point. `FUNCTIONS_VERIFY_JWT` is false in production, so the rate limit and the input validation in `handleIntake` are the only things standing between this endpoint and the open internet. Do not add an auth gate, and do not remove the rate limit.

- [ ] **Step 1: Write the function**

Create `supabase/functions/public-intake/index.ts`:

```ts
// Public intake — the single write path for anonymous appointment bookings
// and audition submissions.
//
// INTENTIONALLY UNAUTHENTICATED. Every other edge function calls
// authenticateCaller(); this one must not, because its whole purpose is to
// serve visitors with no session. FUNCTIONS_VERIFY_JWT is false in
// production, so the rate limit in handleIntake is the only protection this
// endpoint has. Do not remove it.
//
// All decision logic lives in _shared/publicIntake.ts so it can be tested
// under vitest. This file supplies real I/O and nothing else.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleIntake,
  type IntakeDeps,
  type IntakeInput,
  type IntakeAccount,
} from "../_shared/publicIntake.ts";
import { resolveTenantBranding } from "../_shared/tenantBranding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-tenant-slug",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const HTTP_STATUS: Record<string, number> = {
  rate_limited: 429,
  invalid_input: 400,
  unavailable: 409,
  no_active_session: 409,
  write_failed: 500,
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Use POST." }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "invalid_input", message: "Malformed request." }, 400);
  }

  const account = (body.account ?? {}) as IntakeAccount;
  const kind = body.kind === "appointment" ? "appointment" : "audition";
  const sourceIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  const input: IntakeInput = {
    kind,
    tenantSlug:
      (typeof body.tenantSlug === "string" ? body.tenantSlug : null) ||
      req.headers.get("x-tenant-slug"),
    sourceIp,
    account,
    payload: (body.payload ?? {}) as Record<string, unknown>,
  };

  const deps: IntakeDeps = {
    async countRecentAttempts(email, ip) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const [byEmail, byIp] = await Promise.all([
        admin.from("gw_public_intake_attempts")
          .select("id", { count: "exact", head: true })
          .eq("email", email).gte("created_at", since),
        admin.from("gw_public_intake_attempts")
          .select("id", { count: "exact", head: true })
          .eq("source_ip", ip).gte("created_at", since),
      ]);
      return { email: byEmail.count ?? 0, ip: byIp.count ?? 0 };
    },

    async recordAttempt(email, ip) {
      await admin.from("gw_public_intake_attempts").insert({ email, source_ip: ip });
    },

    async preflight(inp) {
      if (inp.kind === "audition") {
        const { data } = await admin
          .from("audition_sessions").select("id").eq("is_active", true).limit(1);
        if (!data || data.length === 0) {
          return {
            ok: false, reason: "no_active_session",
            message: "No active audition session found. Please contact administration.",
          };
        }
        return { ok: true };
      }
      // Appointment: the service must exist and be active, and the slot free.
      const serviceId = inp.payload.serviceId as string;
      const { data: svc } = await admin
        .from("gw_services").select("id, duration_minutes")
        .eq("id", serviceId).eq("is_active", true).maybeSingle();
      if (!svc) {
        return { ok: false, reason: "unavailable", message: "That service is no longer available." };
      }
      const { data: avail } = await admin.rpc("check_appointment_availability", {
        p_service_id: serviceId,
        p_appointment_date: inp.payload.appointmentDate,
        p_start_time: inp.payload.startTime,
        p_duration_minutes: svc.duration_minutes,
      });
      if (!avail?.available) {
        return {
          ok: false, reason: "unavailable",
          message: avail?.error ?? "That time was just taken. Please pick another.",
        };
      }
      return { ok: true };
    },

    async findUserByEmail(email) {
      // gw_profiles mirrors auth.users and is directly queryable by email,
      // which avoids paging the admin user list.
      const { data } = await admin
        .from("gw_profiles").select("user_id").ilike("email", email).maybeSingle();
      return data?.user_id ? { id: data.user_id } : null;
    },

    async createAccount(acct, tenantSlug) {
      const { data, error } = await admin.auth.admin.createUser({
        email: acct.email,
        password: acct.password,
        // Auto-confirm: the confirmation-link round trip is exactly what
        // stranded visitors in the old flow. They receive a confirmation
        // email moments later regardless.
        email_confirm: true,
        user_metadata: {
          full_name: `${acct.firstName} ${acct.lastName}`.trim(),
          phone: acct.phone ?? null,
          signup_context: "public_intake",
          tenant_slug: tenantSlug,
        },
      });
      if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
      return { id: data.user.id };
    },

    async deleteAccount(userId) {
      await admin.auth.admin.deleteUser(userId);
    },

    async writeRecord(inp, userId) {
      if (inp.kind === "appointment") {
        const { data, error } = await admin.rpc("book_appointment", {
          p_service_id: inp.payload.serviceId,
          p_appointment_date: inp.payload.appointmentDate,
          p_start_time: inp.payload.startTime,
          p_customer_name: `${inp.account.firstName} ${inp.account.lastName}`.trim(),
          p_customer_email: inp.account.email,
          p_customer_phone: inp.account.phone ?? null,
          p_attendee_count: 1,
          p_special_requests: (inp.payload.notes as string) ?? null,
        });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error ?? "Booking failed");
        // book_appointment sets created_by = auth.uid(), which is NULL under
        // the service role. Point it at the person who actually booked so the
        // appointment shows up on their dashboard.
        await admin.from("gw_appointments")
          .update({ created_by: userId }).eq("id", data.appointment_id);
        return { id: data.appointment_id as string };
      }

      const { data: sessions } = await admin
        .from("audition_sessions").select("id").eq("is_active", true).limit(1);
      const { data, error } = await admin
        .from("audition_applications")
        .insert({ ...(inp.payload.application as Record<string, unknown>),
                  user_id: userId, session_id: sessions![0].id, status: "submitted" })
        .select("id").single();
      if (error) throw new Error(error.message);
      return { id: data.id as string };
    },

    branding: (tenantSlug) =>
      resolveTenantBranding(async (slug) => {
        const { data } = await admin
          .from("gw_branding_settings")
          .select("tenant_id, org_name, welcome_sms_template")
          .eq("tenant_id", (await admin.from("gw_tenants").select("id").eq("slug", slug).maybeSingle()).data?.id ?? "")
          .maybeSingle();
        return data ?? null;
      }, tenantSlug),

    async sendEmail({ to, kind, recordId, input: inp }) {
      const fn = kind === "audition"
        ? "send-audition-confirmation-email"
        : "send-booking-confirmation-email";
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ recordId, to, tenantSlug: inp.tenantSlug, payload: inp.payload }),
      });
      if (!res.ok) throw new Error(`email fn ${res.status}`);
    },

    async sendSms({ to, body: smsBody }) {
      // gw-send-sms requires an authenticated caller; the service-role key
      // resolves to { internal: true } in _shared/auth.ts.
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gw-send-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ to, message: smsBody }),
      });
      if (!res.ok) throw new Error(`sms fn ${res.status}`);
    },

    log(event, detail) {
      console.log(`[public-intake] ${event}`, JSON.stringify(detail));
    },
  };

  const result = await handleIntake(deps, input);
  return json(result, result.ok ? 200 : (HTTP_STATUS[result.reason] ?? 400));
});
```

- [ ] **Step 2: Simplify the branding dependency**

The inline nested query above is unreadable. Extract it to a named local function before the `deps` object:

```ts
async function brandingQuery(slug: string) {
  const { data: tenant } = await admin
    .from("gw_tenants").select("id").eq("slug", slug).maybeSingle();
  if (!tenant) return null;
  const { data } = await admin
    .from("gw_branding_settings")
    .select("tenant_id, org_name, welcome_sms_template")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  return data ?? null;
}
```

and replace the `branding` dep with:

```ts
branding: (tenantSlug) => resolveTenantBranding(brandingQuery, tenantSlug),
```

- [ ] **Step 3: Write the booking confirmation email function**

Create `supabase/functions/send-booking-confirmation-email/index.ts`, modelled on
`supabase/functions/send-audition-confirmation-email/index.ts`. Read that file first and
mirror its structure: same CORS block, same Resend setup, same `RESEND_API_KEY` guard.
Two deliberate differences — it takes `{ recordId, to, tenantSlug, payload }` as shown in
`sendEmail` above, and it resolves the org name via `resolveTenantBranding` rather than
`getOrgName()`, for the cross-tenant-cache reason in the Global Constraints.

- [ ] **Step 4: Verify the shared module still passes under vitest**

Run: `npx vitest run supabase/functions/_shared/__tests__/`
Expected: PASS, 29 tests. The Deno wrapper is not exercised here — that is what the E2E in Task 11 is for.

- [ ] **Step 5: Deploy the functions**

Edge functions live at `/opt/supabase/volumes/functions/` on the droplet; deploy with
`bash scripts/deploy-functions.sh`. Read the script header first. Deno requires the `.ts`
extension on relative imports — if `public-intake` 500s on boot with a module-resolution
error, that is the cause.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/public-intake supabase/functions/send-booking-confirmation-email
git commit -m "feat(public-intake): edge function and booking confirmation email"
```

---

### Task 6: Browser-side intake client

**Files:**
- Create: `src/lib/publicIntakeClient.ts`
- Test: `src/lib/__tests__/publicIntakeClient.test.ts`

**Interfaces:**
- Consumes: the `public-intake` endpoint (Task 5).
- Produces:
  - `submitPublicIntake(input: PublicIntakeInput): Promise<PublicIntakeResult>`
  - `interface PublicIntakeInput { kind: 'appointment' | 'audition'; account: {...}; payload: Record<string, unknown> }`
  - `type PublicIntakeResult = { ok: true; recordId: string; accountStatus: 'created' | 'existing' } | { ok: false; reason: string; message: string }`

Both flows call this. It attaches the tenant slug and never throws on a non-2xx — the
caller renders `message` directly.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/publicIntakeClient.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitPublicIntake } from '../publicIntakeClient';

vi.mock('@/integrations/supabase/client', () => ({
  getTenantSlug: () => 'testing',
  SUPABASE_URL: 'https://supabase.example.org',
  SUPABASE_ANON_KEY: 'anon-key',
}));

const ACCOUNT = {
  email: 'ada@example.com', password: 'correct horse battery',
  firstName: 'Ada', lastName: 'Lovelace', phone: '5551234567',
};

describe('submitPublicIntake', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('posts to public-intake with the tenant slug attached', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, recordId: 'rec-1', accountStatus: 'created' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitPublicIntake({
      kind: 'audition', account: ACCOUNT, payload: { sectionType: 'vocal' },
    });

    expect(result).toEqual({ ok: true, recordId: 'rec-1', accountStatus: 'created' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://supabase.example.org/functions/v1/public-intake');
    expect(JSON.parse(init.body).tenantSlug).toBe('testing');
    expect(init.headers['x-tenant-slug']).toBe('testing');
  });

  it('returns the server message on a rejection instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, reason: 'unavailable', message: 'That time was just taken.' }),
    }));
    const result = await submitPublicIntake({ kind: 'appointment', account: ACCOUNT, payload: {} });
    expect(result).toEqual({
      ok: false, reason: 'unavailable', message: 'That time was just taken.',
    });
  });

  it('surfaces a friendly message when the network fails outright', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await submitPublicIntake({ kind: 'appointment', account: ACCOUNT, payload: {} });
    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/connect/i);
  });

  it('surfaces a friendly message when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: async () => { throw new Error('not json'); },
    }));
    const result = await submitPublicIntake({ kind: 'audition', account: ACCOUNT, payload: {} });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/publicIntakeClient.test.ts`
Expected: FAIL — cannot resolve `../publicIntakeClient`.

- [ ] **Step 3: Check what the Supabase client module actually exports**

Run:
```bash
grep -n "^export" src/integrations/supabase/client.ts
```
The mock above assumes `getTenantSlug`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are named
exports. If the URL/key are not exported, read them from `window.__TENANT_CONFIG__` the way
`client.ts` does and adjust both the implementation and the mock to match. Do not invent
exports.

- [ ] **Step 4: Write the implementation**

Create `src/lib/publicIntakeClient.ts`:

```ts
// Browser-side caller for the public-intake edge function.
//
// Used by both the public booking page and the audition form. The visitor has
// no session, so this posts with the anon key and lets the function do the
// work. It never throws: every failure comes back as { ok: false, message }
// so callers can render the message directly.

import { getTenantSlug, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

export interface PublicIntakeAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface PublicIntakeInput {
  kind: 'appointment' | 'audition';
  account: PublicIntakeAccount;
  payload: Record<string, unknown>;
}

export type PublicIntakeResult =
  | { ok: true; recordId: string; accountStatus: 'created' | 'existing' }
  | { ok: false; reason: string; message: string };

export async function submitPublicIntake(
  input: PublicIntakeInput,
): Promise<PublicIntakeResult> {
  const tenantSlug = getTenantSlug();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-tenant-slug': tenantSlug,
      },
      body: JSON.stringify({ ...input, tenantSlug }),
    });
    return (await res.json()) as PublicIntakeResult;
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: "We couldn't connect. Check your connection and try again.",
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/publicIntakeClient.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/publicIntakeClient.ts src/lib/__tests__/publicIntakeClient.test.ts
git commit -m "feat(public-intake): browser client for the intake endpoint"
```

---

### Task 7: Public booking page and block rewiring

This is the task that actually removes the login wall. It ships the page and the two
one-line redirect changes together, because either alone leaves the flow broken.

**Files:**
- Create: `src/pages/PublicBookingPage.tsx`
- Create: `src/components/publicBooking/BookingServicePicker.tsx`
- Create: `src/components/publicBooking/BookingSlotPicker.tsx`
- Create: `src/components/publicBooking/BookingAccountForm.tsx`
- Modify: `src/App.tsx:1063` and the lazy-import block near `src/App.tsx:148`
- Modify: `src/components/public-site/blocks/appointment-booking.tsx:64,526`

**Interfaces:**
- Consumes: `submitPublicIntake` (Task 6); the `get_available_time_slots` anon grant (Task 4).
- Produces: route `/book`; nothing importable by later tasks.

- [ ] **Step 1: Read the existing booking UI to match patterns**

Read `src/components/officehours/StudentBooking.tsx` in full. It already does service
selection, `useAvailableTimeSlots(serviceId, date, durationOverride)`, and slot rendering.
Reuse `useAvailableTimeSlots` from `@/hooks/useAppointments` verbatim — it calls
`get_available_time_slots`, which Task 4 granted to anon. Do **not** reuse its
`book_appointment` mutation; public bookings go through `submitPublicIntake`.

- [ ] **Step 2: Build the three components**

Split by responsibility so no file does too much:

- `BookingServicePicker.tsx` — props `{ services, selectedId, onSelect }`. Queries nothing;
  the page owns the query. Renders active services as selectable cards, styled to match the
  `appointment-booking` block's tile treatment (accent stripe, icon pill).
- `BookingSlotPicker.tsx` — props `{ serviceId, date, onDateChange, selectedSlot, onSelect }`.
  Owns the `useAvailableTimeSlots` call.
- `BookingAccountForm.tsx` — props `{ value, onChange, disabled }`. The password floor must
  be 8 characters, matching the server rule in Task 3, or the visitor gets a server
  rejection after filling in everything. Shape:

```tsx
export interface BookingAccount {
  firstName: string; lastName: string; email: string;
  phone: string; password: string; confirmPassword: string;
}

export const MIN_PASSWORD_LENGTH = 8; // must match handleIntake's rule

export function isBookingAccountComplete(a: BookingAccount): boolean {
  return !!(a.firstName && a.lastName && a.email && a.phone) &&
    a.password.length >= MIN_PASSWORD_LENGTH &&
    a.password === a.confirmPassword;
}

export function BookingAccountForm({ value, onChange, disabled }: {
  value: BookingAccount;
  onChange: (next: BookingAccount) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<BookingAccount>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      {/* Say this before they type, not after. The old flow's failure was
          asking for a login they did not have, at the end. */}
      <p className="text-sm text-muted-foreground">
        Booking creates your account so you can see and reschedule this
        appointment. No extra step — just fill this in.
      </p>
      {/* first/last/email/phone/password/confirm Inputs calling set(...) */}
    </div>
  );
}
```

Follow the light theme: white cards, dark text, cream page, tokens only — never dark-navy
cards. Sizing floor is `text-xs`/`text-sm` with `w-4 h-4` icons.

- [ ] **Step 3: Build the page**

Create `src/pages/PublicBookingPage.tsx`. It queries active services with the anon client,
composes the three components as a three-step flow, and on submit calls:

```tsx
const result = await submitPublicIntake({
  kind: 'appointment',
  account,
  payload: { serviceId, appointmentDate, startTime, notes },
});
```

On `ok: true` render a success panel. When `accountStatus === 'existing'`, the panel says
the booking is confirmed **and** that an account already exists for that email, with a link
to `/auth`. When `accountStatus === 'created'`, it says the account is ready and a
confirmation email is on the way. On `ok: false`, render `result.message` inline and — for
`reason === 'unavailable'` — send the visitor back to slot selection and refetch slots.

Wrap in `UniversalLayout` with header and footer enabled (the public/marketing shell), not
`DashboardShell`.

- [ ] **Step 4: Wire the route**

In `src/App.tsx`, add the lazy import alongside the others near line 148:

```tsx
const PublicBookingPage = lazy(() => import("./pages/PublicBookingPage"));
```

Replace the redirect at line 1063:

```tsx
{/* /book is public by design — the appointment block on every tenant's
    public page links here. This used to redirect to /dashboard/office-hours,
    which is a ProtectedRoute, so every visitor who clicked "Book now" hit a
    login screen. Blocks saved before this change still point at
    /book-appointment, hence the redirect. */}
<Route path="/book" element={<PublicRoute><PublicBookingPage /></PublicRoute>} />
<Route path="/book-appointment" element={<Navigate to="/book" replace />} />
```

- [ ] **Step 5: Update the block defaults**

In `src/components/public-site/blocks/appointment-booking.tsx`, change the fallback at line
64 and the `defaultConfig` value at line 526 from `'/book-appointment'` to `'/book'`. Update
the two editor helper strings that name `/book-appointment` (around lines 323 and 404) to
say `/book`.

- [ ] **Step 6: Verify**

```bash
npm run lint
npm run typecheck:guard
npx vitest run
```
Expected: lint clean, no new typecheck errors against the baseline, all tests pass.

Then `npm run dev` and confirm in a **logged-out** browser (private window — an existing
session hides the whole bug) that `/book` renders, `/book-appointment` redirects to it, and
neither bounces to `/auth`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/PublicBookingPage.tsx src/components/publicBooking src/App.tsx src/components/public-site/blocks/appointment-booking.tsx
git commit -m "feat(public-intake): public booking page, no login wall"
```

---

### Task 8: Audition page model

Before moving registration, replace the dual-branch `canProceed` switch — it already has
two parallel page numberings and adding a third arrangement to it by hand is how this
breaks.

**Files:**
- Create: `src/components/audition/auditionPages.ts`
- Test: `src/components/audition/__tests__/auditionPages.test.ts`
- Modify: `src/components/audition/AuditionFormProvider.tsx:107,143-207`
- Modify: `src/components/audition/pages/RegistrationPage.tsx:13,24,56` — it reads and sets
  `isNewUser`, which Step 5 deletes. Remove those references only; the rest of that file is
  Task 9's job.

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type AuditionPageId = 'basic' | 'background' | 'skills' | 'personal' | 'scheduling' | 'account'`
  - `buildAuditionPages(isSignedIn: boolean): AuditionPageId[]`
  - `canLeavePage(pageId: AuditionPageId, values: AuditionFormValues, ctx: { capturedImage: string | null }): boolean`

`buildAuditionPages` returns the account step **last** for signed-out visitors and omits it
entirely for signed-in ones. That single change is what moves registration to the end.

- [ ] **Step 1: Write the failing test**

Create `src/components/audition/__tests__/auditionPages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAuditionPages, canLeavePage } from '../auditionPages';

const FULL = {
  firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '5551234567',
  password: 'correct horse battery', confirmPassword: 'correct horse battery',
  sectionType: 'vocal',
  personalityDescription: Array.from({ length: 50 }, (_, i) => `word${i}`).join(' '),
  auditionDate: new Date('2026-09-01'), auditionTime: '3:30 PM', tshirtSize: 'M',
} as never;

describe('buildAuditionPages', () => {
  it('puts the account step last for signed-out visitors', () => {
    expect(buildAuditionPages(false)).toEqual([
      'basic', 'background', 'skills', 'personal', 'scheduling', 'account',
    ]);
  });

  it('omits the account step for signed-in users', () => {
    const pages = buildAuditionPages(true);
    expect(pages).not.toContain('account');
    expect(pages).toEqual(['basic', 'background', 'skills', 'personal', 'scheduling']);
  });

  it('never asks a signed-out visitor for credentials first', () => {
    expect(buildAuditionPages(false)[0]).toBe('basic');
  });
});

describe('canLeavePage', () => {
  const ctx = { capturedImage: 'data:image/png;base64,x' };

  it('requires name, email, and phone on basic', () => {
    expect(canLeavePage('basic', FULL, ctx)).toBe(true);
    expect(canLeavePage('basic', { ...FULL, phone: '' } as never, ctx)).toBe(false);
  });

  it('requires a section type on background', () => {
    expect(canLeavePage('background', FULL, ctx)).toBe(true);
    expect(canLeavePage('background', { ...FULL, sectionType: '' } as never, ctx)).toBe(false);
  });

  it('lets skills through unconditionally', () => {
    expect(canLeavePage('skills', {} as never, ctx)).toBe(true);
  });

  it('requires a 50-word personality description on personal', () => {
    expect(canLeavePage('personal', FULL, ctx)).toBe(true);
    expect(canLeavePage('personal', { ...FULL, personalityDescription: 'too short' } as never, ctx)).toBe(false);
  });

  it('requires slot, selfie, and shirt size on scheduling', () => {
    expect(canLeavePage('scheduling', FULL, ctx)).toBe(true);
    expect(canLeavePage('scheduling', FULL, { capturedImage: null })).toBe(false);
    expect(canLeavePage('scheduling', { ...FULL, tshirtSize: '' } as never, ctx)).toBe(false);
  });

  it('requires matching passwords of at least 8 characters on account', () => {
    expect(canLeavePage('account', FULL, ctx)).toBe(true);
    expect(canLeavePage('account', { ...FULL, confirmPassword: 'different' } as never, ctx)).toBe(false);
    expect(canLeavePage('account', { ...FULL, password: 'short', confirmPassword: 'short' } as never, ctx)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/audition/__tests__/auditionPages.test.ts`
Expected: FAIL — cannot resolve `../auditionPages`.

- [ ] **Step 3: Write the implementation**

Create `src/components/audition/auditionPages.ts`:

```ts
// Ordered page model for the audition interview.
//
// This replaces a switch that carried two parallel page numberings (one for
// signed-in users, one for anonymous) and validated by page NUMBER. Adding
// the account step at the end under that scheme meant editing eight case
// labels in lockstep. Pages are identified by name here, and the order is
// data.
//
// The account step is LAST for anonymous visitors. It used to be first,
// which meant a visitor created an account before seeing a single question —
// and if email confirmation was on, signUp returned no session and the whole
// interview dead-ended at submit.

import type { AuditionFormData } from './AuditionFormProvider';

export type AuditionPageId =
  | 'basic' | 'background' | 'skills' | 'personal' | 'scheduling' | 'account';

const INTERVIEW_PAGES: AuditionPageId[] = [
  'basic', 'background', 'skills', 'personal', 'scheduling',
];

export function buildAuditionPages(isSignedIn: boolean): AuditionPageId[] {
  return isSignedIn ? [...INTERVIEW_PAGES] : [...INTERVIEW_PAGES, 'account'];
}

const MIN_PERSONALITY_WORDS = 50;
const MIN_PASSWORD_LENGTH = 8;

function wordCount(text: string | undefined | null): number {
  return (text ?? '').trim().split(/\s+/).filter(Boolean).length;
}

export function canLeavePage(
  pageId: AuditionPageId,
  values: AuditionFormData,
  ctx: { capturedImage: string | null },
): boolean {
  switch (pageId) {
    case 'basic':
      return !!(values.firstName && values.lastName && values.email && values.phone);
    case 'background':
      return !!values.sectionType;
    case 'skills':
      return true;
    case 'personal':
      return wordCount(values.personalityDescription) >= MIN_PERSONALITY_WORDS;
    case 'scheduling':
      return !!(values.auditionDate && values.auditionTime && ctx.capturedImage && values.tshirtSize);
    case 'account':
      return (
        !!values.email &&
        (values.password ?? '').length >= MIN_PASSWORD_LENGTH &&
        values.password === values.confirmPassword
      );
    default:
      return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/audition/__tests__/auditionPages.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Adopt the model in the provider**

In `src/components/audition/AuditionFormProvider.tsx`:
- Replace `const totalPages = user ? 5 : 6;` (line 107) with
  `const pages = useMemo(() => buildAuditionPages(!!user), [user]);` and
  `const totalPages = pages.length;`.
- Replace the whole `canProceed` body (lines 143–207) with
  `return canLeavePage(pages[currentPage - 1], form.getValues(), { capturedImage });`.
- Delete the `console.log` debug calls in that function — they dump full form values,
  including the password, to the console on every render.
- Export `pages` and `currentPageId` (`pages[currentPage - 1]`) on the context so the page
  component can render by id instead of by number.
- Delete `isNewUser` / `setIsNewUser` and every reference to them. The page order no longer
  branches on it, and `RegistrationPage` is about to stop setting it.

- [ ] **Step 6: Verify**

```bash
npx vitest run src/components/audition/
npm run typecheck:guard
```
Expected: PASS; no new typecheck errors. Compile errors will point at every remaining
`isNewUser` reference — fix them all.

- [ ] **Step 7: Commit**

```bash
git add src/components/audition/auditionPages.ts src/components/audition/__tests__/auditionPages.test.ts src/components/audition/AuditionFormProvider.tsx
git commit -m "refactor(audition): name-based page model, account step last"
```

---

### Task 9: Audition submits through public-intake

**Files:**
- Modify: `src/pages/AuditionPage.tsx:39-295` (submit) and `:297-333` (page dispatch)
- Modify: `src/components/audition/pages/RegistrationPage.tsx`
- Modify: `src/components/audition/AuditionFormProvider.tsx` (draft persistence)

**Interfaces:**
- Consumes: `submitPublicIntake` (Task 6); `buildAuditionPages`, `canLeavePage` (Task 8).
- Produces: nothing importable.

- [ ] **Step 1: Strip signUp out of RegistrationPage**

In `src/components/audition/pages/RegistrationPage.tsx`:
- Delete `handleRegisterAndContinue` and the `supabase.auth.signUp` call entirely
  (lines 29–65). The account is created server-side at submit now.
- Delete the `if (user) return null;` early return (lines 19–21) — the page model already
  omits this step for signed-in users, so the guard is dead code that would silently blank
  the final step if it ever ran.
- Change the heading to "Create your account & submit" and the blurb to say the account is
  created when they submit, so they can track their application.
- Keep the email / password / confirm-password fields and the "Already have an account?
  Sign In" button, but change its target to `/auth?redirect=/auditions`.
- Remove the two Create-Account buttons. Submission is the form's own submit button now.

- [ ] **Step 2: Rewrite the submit handler**

In `src/pages/AuditionPage.tsx`, replace the body of `onSubmit` (lines 39–295):
- Delete the `if (!user) { toast.error("Please log in to submit your audition form"); return; }`
  bail at lines 44–48. This is the bug.
- Keep the selfie check, the date/time check, `capitalizeNames`, and `normalizeVoicePart`
  exactly as they are — they are correct and still needed.
- Keep building `submissionData` as today, but **remove `user_id` and `session_id`** from it.
  The edge function supplies both; a client-supplied `user_id` would let anyone file an
  application against another account.
- **Move**, do not delete, the idempotent-save block (the `audition_applications` lookup,
  the update path, the `minimalData` fallback, lines 156 onward) into a
  `submitAsAuthenticatedUser(submissionData)` helper, unchanged. It remains the write path
  for a signed-in user, who has no account step and therefore no password for the server to
  validate. Anonymous visitors — the case this feature exists for — go through
  `submitPublicIntake` instead. Two paths, one branch, both legible.
- Submit with:

```tsx
const result = await submitPublicIntake({
  kind: 'audition',
  account: {
    email: data.email,
    password: data.password ?? '',
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
  },
  payload: { application: submissionData },
});

if (!result.ok) {
  toast.error(result.message);
  return;
}
clearAuditionDraft();
setShowCongratulations(true);
```

- The branch itself: `if (user) return submitAsAuthenticatedUser(submissionData);` before
  the `submitPublicIntake` call above. A signed-in user has no password to send, and the
  server's 8-character rule would reject them.
- In `CongratulationsDialog`, when `result.accountStatus === 'existing'`, add a line saying
  an account already exists for that email and linking to `/auth`.

- [ ] **Step 3: Render pages by id**

Replace `renderCurrentPage` (lines 297–333) — both branches of the switch — with a single
map keyed on `currentPageId` from the provider:

```tsx
const PAGE_COMPONENTS: Record<AuditionPageId, () => JSX.Element> = {
  basic: () => <BasicInfoPage />,
  background: () => <MusicalBackgroundPage />,
  skills: () => <MusicSkillsPage />,
  personal: () => <PersonalInfoPage />,
  scheduling: () => <SchedulingAndSelfiePage />,
  account: () => <RegistrationPage />,
};
```

- [ ] **Step 4: Persist the draft**

Six pages of answers must survive a refresh — that is the whole complaint. Add to
`AuditionFormProvider`:

```tsx
const DRAFT_KEY = `audition-draft:${getTenantSlug()}`;

// Credentials are never written to storage, and capturedImage is a base64
// data URL big enough to blow the ~5MB sessionStorage quota by itself.
const OMIT_FROM_DRAFT = ['password', 'confirmPassword'] as const;

function readDraft(): Partial<AuditionFormData> {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function clearAuditionDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

// inside the provider, after `form` is created:
useEffect(() => {
  const sub = form.watch((values) => {
    const draft = { ...values } as Record<string, unknown>;
    for (const key of OMIT_FROM_DRAFT) delete draft[key];
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Quota or private-mode failure is not worth interrupting the form over.
    }
  });
  return () => sub.unsubscribe();
}, [form]);
```

Seed `defaultValues` from `readDraft()` so a refresh restores. `auditionDate` round-trips
through JSON as a string — revive it with `new Date(...)` when present, or the date picker
gets a string where it expects a `Date`.

Call `clearAuditionDraft()` on successful submit, in Task 9 Step 2's `ok: true` branch.

- [ ] **Step 5: Verify**

```bash
npx vitest run
npm run lint
npm run typecheck:guard
```
Expected: all pass, no new typecheck errors.

Then in a **logged-out private window** with `npm run dev`: walk `/auditions` end to end.
Confirm the account step comes last, that submitting registers you, and that refreshing at
page 4 keeps your answers but leaves the password blank.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AuditionPage.tsx src/components/audition/
git commit -m "feat(audition): submit via public-intake, register at the end"
```

---

### Task 10: Tenant setting for the welcome SMS

Task 4 adds the column and Task 5 reads it, but nothing yet lets a tenant *set* it — which
would leave every tenant stuck on the default string and Kevin editing SQL by hand to give
Doc's World its copy.

**Files:**
- Modify: the branding settings admin surface (find it in Step 1 — do not guess the path)

**Interfaces:**
- Consumes: `gw_branding_settings.welcome_sms_template` (Task 4).
- Produces: nothing importable.

- [ ] **Step 1: Find the branding settings editor**

```bash
grep -rn "gw_branding_settings" src --include="*.tsx" | grep -i "upsert\|update\|save"
```

Pick the admin surface where a tenant edits `org_name` and add the field beside it. If more
than one surface writes the table, add it to the one an ordinary tenant admin reaches, not a
super-admin-only page.

- [ ] **Step 2: Add the field**

A textarea labelled "Welcome SMS", with helper text naming the two placeholders verbatim:

> Sent after someone books an appointment or finishes an audition. Use `{org_name}` and
> `{first_name}`. Leave blank for the default: "Thanks for joining {org_name}!"

- [ ] **Step 3: Save it correctly**

The write **must** use `onConflict: 'tenant_id'` and pin the row with `getTenantSlug()`:

```tsx
await supabase
  .from('gw_branding_settings')
  .upsert(
    { tenant_id: tenantId, welcome_sms_template: value.trim() || null },
    { onConflict: 'tenant_id' },
  );
```

A bare upsert without `onConflict` has poisoned the main tenant's branding row twice — it
falls back to the singleton primary key and overwrites whichever row is already there. If
the surrounding component already has a save handler that does this correctly, extend it
rather than adding a second write path.

- [ ] **Step 4: Verify**

```bash
npm run lint
npm run typecheck:guard
```

Then with `npm run dev`, save a template on a non-main tenant and confirm in the DB that
**only** that tenant's row changed:

```sql
SELECT tenant_id, org_name, welcome_sms_template FROM gw_branding_settings;
```

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(public-intake): per-tenant welcome SMS template setting"
```

---

### Task 11: End-to-end coverage

**Files:**
- Create: `e2e/public-intake.spec.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

Read `e2e/` and its Playwright config first to match the existing harness — the demo tenant
credentials are `demo@…` / `GleeDemo2026!`, and `demo-admin` is stale, so do not use it.
Every test here runs in a **fresh, unauthenticated context**; a leaked storage state would
hide the exact bug these tests exist to catch.

- [ ] **Step 1: Write the specs**

Create `e2e/public-intake.spec.ts` with four tests:

1. **No login wall on `/book`** — visit `/book` with no session, assert the URL stays
   `/book` and does not become `/auth`, and that a service card is visible.
2. **Legacy redirect** — visit `/book-appointment`, assert it lands on `/book` and not
   `/auth`. This is the regression guard for every block config already saved in the wild.
3. **No login wall on `/auditions`** — visit with no session, assert the first step asks for
   name and not for a password.
4. **Audition registers at the end** — fill all six pages with a unique
   `+`-suffixed email, submit, assert the congratulations dialog appears, then sign in at
   `/auth` with those credentials and assert it succeeds. This proves the auto-confirm
   actually took, which is the single most important behavior in the feature.

Use a per-run unique email (`ada+${Date.now()}@example.com`) so the rate limit and the
existing-account path do not make the suite flaky across runs.

- [ ] **Step 2: Run the E2E suite**

Run: `npx playwright test e2e/public-intake.spec.ts`
Expected: 4 passed. Test 4 needs the migration applied and the functions deployed — if it
fails on submit, check the `public-intake` logs before touching the test.

- [ ] **Step 3: Full verification sweep**

```bash
npm run lint
npm run typecheck:guard
npx vitest run
npx playwright test e2e/public-intake.spec.ts
```
All four must pass. Paste the actual output into the completion report — do not summarize it
as "tests pass".

- [ ] **Step 4: Commit**

```bash
git add e2e/public-intake.spec.ts
git commit -m "test(public-intake): e2e coverage for the anonymous flows"
```

---

## Done criteria

- A logged-out visitor can book an appointment and complete an audition without seeing `/auth`.
- Finishing either flow leaves a usable account that can immediately sign in.
- A confirmation email and, when a phone was given, a welcome SMS are sent.
- The SMS text comes from `gw_branding_settings.welcome_sms_template`; no tenant name appears in any source file.
- A failed submission leaves no orphan account, and a pre-existing account is never modified.
- `npm run lint`, `npm run typecheck:guard`, `npx vitest run`, and the Playwright spec all pass.

## Deploy

Do not deploy mid-plan. When everything above is green:
1. Kevin applies `20260806120000_public_intake.sql` to the self-hosted DB.
2. `bash scripts/deploy-functions.sh` for `public-intake` and `send-booking-confirmation-email`.
3. `bash scripts/deploy-frontend.sh` — never with `--delete`; per-tenant bootstraps under `/var/www/gleeworld/html/tenants/` are not in `dist/`.
4. Verify on a real tenant subdomain in a private window, not on the apex.
