# Contacts & Groups Implementation Plan (House & Stage — Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People and groups become first-class, tappable objects — a People hub at `/dashboard/people` with contact cards (message / call / text / email via native handoffs), a Groups view reusing messaging groups, the faculty Roster tab retargeted there — plus the Plan-1 polish wave (CommandCenter deletion, shared role helper, needs-attention names, ledger local-day fix, a11y nits).

**Architecture:** Zero new tables (YAGNI): people come from the tenant-scoped `gw_profiles_directory` view; groups reuse `gw_message_groups` (non-`direct` types) + `gw_group_members`; 1:1 message uses the existing `useCreateDirectMessage` pattern. Pure contact-action helpers are TDD'd; UI composes shadcn primitives per the design system (tokens, square corners, 44pt targets). Event-roster targeting tables are deliberately deferred to the Tonight-mode plan.

**Tech Stack:** React 18 + Vite + Tailwind tokens + shadcn, vitest, supabase-js, existing hooks `useUserRole`, `useMessaging` (`useCreateDirectMessage`).

## Global Constraints (every task inherits)

- Tokens only — no hex, no raw Tailwind palette classes. Square corners; `rounded-full` only for pills/avatars. `text-xs` floor; `tabular-nums` for counts. Touch targets ≥44pt. Tenant-neutral copy. Reduced-motion gates on animation. No service worker. No new deps.
- Phone fields: prefer `phone_number`, fall back to `phone` (matches `src/lib/messenger-contacts.ts:37-39`).
- Commands: build `bun x vite build`; tests `bun x vitest run <path>`. Branch `feat/contacts-groups` off `main`.

---

### Task 1: Shared role helper + CommandCenter deletion

**Files:**
- Create: `src/lib/roles.ts`
- Test: `src/lib/__tests__/roles.test.ts`
- Modify: `src/components/navigation/MobileBottomNav.tsx` (isFaculty block), `src/pages/dashboard/HouseHome.tsx` (isFaculty block)
- Delete: `src/pages/dashboard/CommandCenter.tsx`

**Interfaces:**
- Produces: `isFacultyProfile(p: { role?: string | null; is_admin?: boolean | null; is_super_admin?: boolean | null } | null | undefined): boolean` — true for admins/super-admins or role ∈ {instructor, teacher, conductor} (case-insensitive). Tasks 3–5 consume it.

- [ ] **Step 1: Failing test** `src/lib/__tests__/roles.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isFacultyProfile } from '../roles';

describe('isFacultyProfile', () => {
  it('true for admin flags and faculty roles, case-insensitive', () => {
    expect(isFacultyProfile({ is_admin: true })).toBe(true);
    expect(isFacultyProfile({ is_super_admin: true })).toBe(true);
    expect(isFacultyProfile({ role: 'Instructor' })).toBe(true);
    expect(isFacultyProfile({ role: 'conductor' })).toBe(true);
    expect(isFacultyProfile({ role: 'teacher' })).toBe(true);
  });
  it('false for students, null, undefined', () => {
    expect(isFacultyProfile({ role: 'student' })).toBe(false);
    expect(isFacultyProfile(null)).toBe(false);
    expect(isFacultyProfile(undefined)).toBe(false);
    expect(isFacultyProfile({})).toBe(false);
  });
});
```

- [ ] **Step 2:** Run `bun x vitest run src/lib/__tests__/roles.test.ts` — expect FAIL (module missing).

- [ ] **Step 3: Implement** `src/lib/roles.ts`:

```ts
const FACULTY_ROLES = new Set(['instructor', 'teacher', 'conductor']);

export function isFacultyProfile(
  p: { role?: string | null; is_admin?: boolean | null; is_super_admin?: boolean | null } | null | undefined,
): boolean {
  if (!p) return false;
  if (p.is_admin || p.is_super_admin) return true;
  return FACULTY_ROLES.has((p.role || '').toLowerCase());
}
```

- [ ] **Step 4:** Run the test — PASS. Then replace the duplicated inline `isFaculty` derivations in `MobileBottomNav.tsx` and `HouseHome.tsx` with `isFacultyProfile(profile)` (import from `@/lib/roles`); delete `src/pages/dashboard/CommandCenter.tsx` (`git rm`); grep repo for `pages/dashboard/CommandCenter` imports — must be zero (sandbox-mock comments referencing the name are fine).

- [ ] **Step 5:** `bun x vite build` PASS; `bun x vitest run src/lib` all green. Commit: `refactor: shared isFacultyProfile; delete orphaned CommandCenter page`.

---

### Task 2: Contact action helpers (pure, TDD)

**Files:**
- Create: `src/lib/people/contactActions.ts`
- Test: `src/lib/people/__tests__/contactActions.test.ts`

**Interfaces:**
- Consumes: directory row shape (subset): `{ full_name, display_name, first_name, last_name, email, phone, phone_number, voice_part }` all `string | null`.
- Produces (Tasks 3–5 consume verbatim):
  - `displayName(p): string` — display_name → full_name → "first last" → email → 'Member'.
  - `initials(p): string` — 1–2 uppercase letters from displayName.
  - `bestPhone(p): string | null` — phone_number → phone → null (trimmed, empty = null).
  - `contactHrefs(p): { tel: string | null; sms: string | null; mailto: string | null }` — `tel:`/`sms:` from bestPhone digits (keep leading +, strip spaces/dashes/parens), `mailto:` from email.
  - `sectionLabel(voice_part: string | null): string | null` — 'soprano_1' → 'Soprano 1', etc.; null passthrough.

- [ ] **Step 1: Failing test** `src/lib/people/__tests__/contactActions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { displayName, initials, bestPhone, contactHrefs, sectionLabel } from '../contactActions';

const base = { full_name: null, display_name: null, first_name: null, last_name: null, email: null, phone: null, phone_number: null, voice_part: null };

describe('displayName', () => {
  it('prefers display_name, then full_name, then first+last, then email', () => {
    expect(displayName({ ...base, display_name: 'Ray', full_name: 'Raymond K' })).toBe('Ray');
    expect(displayName({ ...base, full_name: 'Raymond K' })).toBe('Raymond K');
    expect(displayName({ ...base, first_name: 'Ada', last_name: 'Lee' })).toBe('Ada Lee');
    expect(displayName({ ...base, email: 'a@b.org' })).toBe('a@b.org');
    expect(displayName(base)).toBe('Member');
  });
});

describe('initials', () => {
  it('two letters from name, one from single word, uppercased', () => {
    expect(initials({ ...base, full_name: 'Ada Lee' })).toBe('AL');
    expect(initials({ ...base, full_name: 'Cher' })).toBe('C');
  });
});

describe('bestPhone / contactHrefs', () => {
  it('prefers phone_number, falls back to phone, null when blank', () => {
    expect(bestPhone({ ...base, phone_number: ' 555-111-2222 ', phone: '999' })).toBe('555-111-2222');
    expect(bestPhone({ ...base, phone: '999' })).toBe('999');
    expect(bestPhone({ ...base, phone_number: '  ' })).toBeNull();
  });
  it('builds sanitized hrefs and nulls when data missing', () => {
    const h = contactHrefs({ ...base, phone_number: '+1 (555) 111-2222', email: 'a@b.org' });
    expect(h.tel).toBe('tel:+15551112222');
    expect(h.sms).toBe('sms:+15551112222');
    expect(h.mailto).toBe('mailto:a@b.org');
    expect(contactHrefs(base)).toEqual({ tel: null, sms: null, mailto: null });
  });
});

describe('sectionLabel', () => {
  it('humanizes voice_part enum values', () => {
    expect(sectionLabel('soprano_1')).toBe('Soprano 1');
    expect(sectionLabel('bass_2')).toBe('Bass 2');
    expect(sectionLabel(null)).toBeNull();
  });
});
```

- [ ] **Step 2:** Run `bun x vitest run src/lib/people` — FAIL.

- [ ] **Step 3: Implement** `src/lib/people/contactActions.ts`:

```ts
export interface ContactablePerson {
  full_name: string | null; display_name: string | null;
  first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; phone_number: string | null;
  voice_part: string | null;
}

export function displayName(p: ContactablePerson): string {
  const dn = p.display_name?.trim();
  if (dn) return dn;
  const fn = p.full_name?.trim();
  if (fn) return fn;
  const composed = [p.first_name, p.last_name].map((s) => s?.trim()).filter(Boolean).join(' ');
  if (composed) return composed;
  return p.email?.trim() || 'Member';
}

export function initials(p: ContactablePerson): string {
  const parts = displayName(p).split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '');
  return letters.join('') || 'M';
}

export function bestPhone(p: ContactablePerson): string | null {
  const v = p.phone_number?.trim() || p.phone?.trim() || '';
  return v.length > 0 ? v : null;
}

export function contactHrefs(p: ContactablePerson): { tel: string | null; sms: string | null; mailto: string | null } {
  const raw = bestPhone(p);
  const digits = raw ? raw.replace(/[^\d+]/g, '') : null;
  const email = p.email?.trim() || null;
  return {
    tel: digits ? `tel:${digits}` : null,
    sms: digits ? `sms:${digits}` : null,
    mailto: email ? `mailto:${email}` : null,
  };
}

export function sectionLabel(voicePart: string | null): string | null {
  if (!voicePart) return null;
  return voicePart.split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}
```

- [ ] **Step 4:** Run `bun x vitest run src/lib/people` — PASS. Commit: `feat(people): contact action helpers`.

---

### Task 3: PersonCard sheet + directory hook

**Files:**
- Create: `src/hooks/usePeopleDirectory.ts`
- Create: `src/components/people/PersonCard.tsx`

**Interfaces:**
- Consumes: Task 2 helpers; `useCreateDirectMessage` from `@/hooks/useMessaging` (pattern: `createDirectMessage.mutateAsync(userId)` — read `src/components/messaging/UserSelector.tsx:101-108` and reuse its post-create navigation/open behavior; if it opens in-place state, PersonCard should navigate to `/messenger` after the mutate resolves).
- Produces:
  - `usePeopleDirectory(): { data: DirectoryPerson[]; isLoading: boolean }` — react-query `['people-directory']`, staleTime 5min, selecting from `gw_profiles_directory`: `user_id, email, full_name, display_name, first_name, last_name, avatar_url, headshot_url, role, title, is_section_leader, voice_part, phone, phone_number, status, disabled` — filtered client-side to `status !== 'inactive' && !disabled`, ordered by `full_name`.
  - `<PersonCard person={DirectoryPerson} open onOpenChange>` — bottom Sheet: avatar (headshot_url → avatar_url → initials pill), display name, `sectionLabel(voice_part)` + role/title badges (+ "Section leader" when is_section_leader), then an action row of four ≥44pt buttons: **Message** (always; disabled while mutating), **Call** / **Text** (only when `contactHrefs.tel` non-null; render as `<a href>`), **Email** (when mailto non-null). Missing-data actions are NOT rendered (no dead buttons).
- `DirectoryPerson` type exported from the hook file with exactly the selected columns.

- [ ] **Step 1:** Implement the hook (straightforward react-query; copy the supabase select shape above exactly).
- [ ] **Step 2:** Implement PersonCard with the shadcn Sheet primitives already used in StudioEditor; action row uses token classes only (`bg-card border border-border`, `text-primary` accents); `aria-label` on each action.
- [ ] **Step 3:** `bun x vite build` PASS (no unit tests for pure presentation; hooks covered via page smoke in Task 4). Commit: `feat(people): directory hook + person contact card`.

---

### Task 4: People hub page + Roster tab retarget

**Files:**
- Create: `src/pages/dashboard/PeopleHub.tsx`
- Modify: `src/App.tsx` (lazy import + new route `/dashboard/people` inside the same ProtectedRoute/UniversalLayout wrapper pattern as `/dashboard`), `src/lib/navigation/appDestinations.ts` (`D.roster.to` → `/dashboard/people`), `src/lib/navigation/__tests__/appDestinations.test.ts` (route fixtures: roster route now `/dashboard/people`; keep `/attendance` in KNOWN_ROUTES only if still referenced by `D.attendance`).

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `/dashboard/people` — search input (name/email/section, client-side), people grouped by `sectionLabel` (ungrouped "Directors & staff" section for faculty-role rows first, then voice-part sections alphabetically, "Other" last), each row ≥44pt with avatar/initials + name + section badge, tap → PersonCard. Faculty-only header action: "Take attendance" button → `/attendance`. Tab bar visible (normal page flow, `pb-24` phone padding). Empty state: "No members yet — invite your roster from People settings."

- [ ] **Step 1:** Build the page; group rows with `isFacultyProfile({ role, is_admin: false, is_super_admin: false })`-style faculty grouping using the row's `role` via Task 1 helper (pass the directory row fields).
- [ ] **Step 2:** Route + `D.roster` retarget + test fixture updates. Run `bun x vitest run src/lib/navigation` — all green (update expectations: faculty tabs still labeled Roster, route now `/dashboard/people`; grid `attendance` tile keeps `/attendance` and no longer collides with the roster tab route — assert both).
- [ ] **Step 3:** `bun x vite build` PASS; grep guardrail: no raw palette classes in new files. Commit: `feat(people): People hub at /dashboard/people; Roster tab retargeted`.

---

### Task 5: Groups view

**Files:**
- Create: `src/hooks/useTenantGroups.ts`
- Modify: `src/pages/dashboard/PeopleHub.tsx` (add People | Groups toggle)

**Interfaces:**
- Consumes: `gw_message_groups` (`id, name, group_type, created_at`, exclude `group_type = 'direct'`), `gw_group_members` (`group_id, user_id, role`), Task 3's directory data for member cards.
- Produces: `useTenantGroups(): { data: Array<{ id: string; name: string; group_type: string; member_count: number }>; isLoading }` (two queries joined client-side, react-query `['tenant-groups']`); Groups tab listing name + humanized type pill (`voice_section` → 'Section', `executive` → 'Exec board', `event` → 'Event', `general` → 'General', `private` → 'Private') + member count (`tabular-nums`); tapping a group expands an inline member list (user_ids resolved against the directory map) with PersonCard on tap and a "Message group" button navigating to `/messenger` (the group already IS a messenger group).

- [ ] **Step 1:** Hook + UI per above; exclude empty names (fallback label 'Untitled group').
- [ ] **Step 2:** `bun x vite build` PASS. Commit: `feat(people): groups view over messaging groups`.

---

### Task 6: Plan-1 polish wave

**Files:**
- Modify: `src/pages/dashboard/HouseHome.tsx`, `src/lib/home/ledger.ts`, `src/lib/home/__tests__/ledger.test.ts`

**Interfaces:** unchanged signatures throughout.

- [ ] **Step 1 (names in Needs attention):** in HouseHome's unreviewed-recordings query, also select `user_id`, then batch-fetch `gw_profiles_directory (user_id, full_name, email)` for the distinct ids (same two-step pattern the deleted CommandCenter used) and prefix titles: `"<student> — <title>"` with fallback 'A student'.
- [ ] **Step 2 (ledger local-day):** change `ledger.ts` to compute the week and today-key in LOCAL time (`getDay`, local YYYY-MM-DD formatting via `getFullYear/getMonth/getDate` zero-padded) while STILL normalizing timestamped practice entries via `new Date(s)` then LOCAL date key (not toISOString). Update the four existing tests' fixtures to local-time semantics (construct `today` with `new Date(2026, 6, 9, 12)` style) and keep the offset-timestamp test asserting local bucketing; run `bun x vitest run src/lib/home` — all green.
- [ ] **Step 3 (a11y + query key):** add `aria-hidden="true"` to each ledger glyph span and change the parent `aria-label` to `` `${noteCount} of 7 days practiced this week` ``; include the user id in the my-practice query key (`['house-home-my-practice', uid]` — obtain uid via `supabase.auth.getUser()` in the queryFn is too late for the key, so lift it from `useUserRole().profile?.user_id ?? 'anon'`).
- [ ] **Step 4:** `bun x vite build` + `bun x vitest run src/lib` all green. Commit: `fix(home): student names in queue, local-day ledger, a11y label, scoped query key`.

---

### Task 7: Ship

- [ ] **Step 1:** `bun x vite build && bun x cap sync ios`; bump both `CURRENT_PROJECT_VERSION` entries +1.
- [ ] **Step 2:** Simulator Debug build + launch smoke (no crashes; log stream clean for the app process).
- [ ] **Step 3:** Push branch, open PR "Contacts & Groups (House & Stage plan 2)". Merge/TestFlight/web follow the standing ship gate (Kevin's explicit word).

## Deliberately deferred
- Event↔group roster targeting tables (Tonight-mode plan owns them).
- Broadcast messaging (Plan/Phase for revenue feature).
- Edit-home customization (panel sequence kept).
- Fuse ticker; sweep-test fixture derivation from registry.
