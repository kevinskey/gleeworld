# Tenants Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the static /superadmin/ console's three unique functions (platform stats, staged provisioning, resend-welcome) into the React /admin/tenants page so all tenant management lives in one command-center surface.

**Architecture:** Frontend-only. Both surfaces already call the same superadmin API (nginx proxies `/superadmin/api/*` → `127.0.0.1:3035`), authenticated with the SPA's Supabase session JWT. The API already supports `staged`, `temp_password`, and `POST /tenants/:id/resend-welcome` — no server, route, or migration changes. Pure display/copy logic is extracted into `src/lib/` helpers with unit tests; component wiring is verified by typecheck + build + manual pass.

**Tech Stack:** React 18 + TypeScript, TanStack Query, shadcn/Radix (Card, Checkbox, AlertDialog), vitest, lucide-react.

## Global Constraints

- Work in worktree `~/Documents/GitHub/gleeworld-wt-tenants`, branch `feat/tenants-command-center` (already created, spec committed).
- `npm ci` in this worktree requires `--legacy-peer-deps` (plain `npm ci` fails with ERESOLVE — confirmed in sibling worktree).
- Light theme rules: white cards, dark text; stat/label text `text-xs`/`text-sm`; never set `color` on bare h1–h6.
- Tenant-neutral copy — never hardcode a specific tenant/org name in UI strings.
- The `main` platform card never shows the Welcome (resend) button.
- Staged checkbox defaults **ON** (matches the static console).
- `/superadmin/` static page keeps ALL current functionality; it only gains one pointer line.
- Real gates: `npm run typecheck:guard` (baseline 170) and no NEW eslint errors (page files carry pre-existing ones).

---

### Task 1: Platform stats helper + strip on /admin/tenants

**Files:**
- Create: `src/lib/platformStats.ts`
- Test: `src/lib/__tests__/platformStats.test.ts`
- Modify: `src/pages/admin/PlatformTenantsPortal.tsx` (imports at top; stats query after the existing tenants `useQuery` ~line 89; strip rendered between the header row and the search box ~line 196)

**Interfaces:**
- Produces: `formatPlatformStats(raw: unknown): Array<{ label: string; value: string }>` — filters entries to number/string values, `_` → space in labels. Task 1 only; no later task consumes it.

- [ ] **Step 1: One-time worktree setup — install deps**

```bash
cd ~/Documents/GitHub/gleeworld-wt-tenants && npm ci --legacy-peer-deps --no-audit --no-fund
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/__tests__/platformStats.test.ts
import { describe, it, expect } from 'vitest';
import { formatPlatformStats } from '../platformStats';

describe('formatPlatformStats', () => {
  it('keeps number and string entries and prettifies snake_case labels', () => {
    expect(formatPlatformStats({ total_tenants: 12, active_tenants: 9, newest: 'eastside' })).toEqual([
      { label: 'total tenants', value: '12' },
      { label: 'active tenants', value: '9' },
      { label: 'newest', value: 'eastside' },
    ]);
  });

  it('drops object, array, boolean, and null values', () => {
    expect(formatPlatformStats({ nested: { a: 1 }, list: [1], flag: true, missing: null, ok: 3 })).toEqual([
      { label: 'ok', value: '3' },
    ]);
  });

  it('returns [] for undefined or non-object input', () => {
    expect(formatPlatformStats(undefined)).toEqual([]);
    expect(formatPlatformStats('x')).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/platformStats.test.ts`
Expected: FAIL — cannot resolve `../platformStats`.

- [ ] **Step 4: Write the helper**

```ts
// src/lib/platformStats.ts
// The superadmin API's GET /stats returns a flat object whose shape is
// server-defined and may grow; render only scalar entries, like the
// static /superadmin/ console did.
export interface PlatformStat {
  label: string;
  value: string;
}

export function formatPlatformStats(raw: unknown): PlatformStat[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: String(v) }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/platformStats.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Wire the stats strip into PlatformTenantsPortal**

Add imports at the top of `src/pages/admin/PlatformTenantsPortal.tsx`:

```ts
import { formatPlatformStats } from '@/lib/platformStats';
```

Directly after the existing tenants `useQuery` block (ends ~line 89), add:

```ts
  // Platform stats from the superadmin API — same auth pattern as the
  // tenant list. Failure must never block the tenant list, so this is a
  // separate query and errors render as a quiet note.
  const { data: statsData, isError: statsError } = useQuery<Record<string, unknown>>({
    queryKey: ['platform-stats'],
    enabled: isPlatformAdmin,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('not signed in');
      const res = await fetch('/superadmin/api/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
  const stats = formatPlatformStats(statsData);
```

In the JSX, between the closing `</div>` of the header row (the one holding Refresh + CreateTenantDialog, ~line 195) and the search `<div className="relative max-w-md">`, insert:

```tsx
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold leading-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground capitalize">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {statsError && (
        <p className="text-xs text-muted-foreground">Platform stats unavailable right now.</p>
      )}
```

- [ ] **Step 7: Verify gates**

Run: `npx eslint src/lib/platformStats.ts src/lib/__tests__/platformStats.test.ts src/pages/admin/PlatformTenantsPortal.tsx` — new files clean; page file must show no NEW errors vs `git stash` baseline if unsure.
Run: `npm run typecheck:guard` — expected `OK … all pre-existing`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/platformStats.ts src/lib/__tests__/platformStats.test.ts src/pages/admin/PlatformTenantsPortal.tsx
git commit -m "feat(tenants): platform stats strip on /admin/tenants"
```

---

### Task 2: Staged provisioning in CreateTenantDialog

**Files:**
- Create: `src/lib/tenantProvisionNotice.ts`
- Test: `src/lib/__tests__/tenantProvisionNotice.test.ts`
- Modify: `src/components/admin/CreateTenantDialog.tsx`

**Interfaces:**
- Produces: `provisionNotice(body: { staged?: boolean; temp_password?: string }, name: string, adminEmail: string): { toastTitle: string; toastDescription: string; tempPasswordNote: string | null }`. Consumed only inside `CreateTenantDialog`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/tenantProvisionNotice.test.ts
import { describe, it, expect } from 'vitest';
import { provisionNotice } from '../tenantProvisionNotice';

describe('provisionNotice', () => {
  it('staged with a fresh temp password: no-email toast + show-once note', () => {
    const n = provisionNotice({ staged: true, temp_password: 'p4ss' }, 'Eastside', 'dir@x.org');
    expect(n.toastTitle).toBe('Tenant created (staged)');
    expect(n.toastDescription).toBe(
      'Eastside provisioned — no email sent. Press "Welcome" on its card at handoff.',
    );
    expect(n.tempPasswordNote).toBe('Temp password for dir@x.org (shown once): p4ss');
  });

  it('staged but the admin already existed: password-unchanged note', () => {
    const n = provisionNotice({ staged: true }, 'Eastside', 'dir@x.org');
    expect(n.tempPasswordNote).toBe(
      'dir@x.org already had an account — their existing password is unchanged.',
    );
  });

  it('instant (not staged): invite-sent toast and no password note', () => {
    const n = provisionNotice({}, 'Eastside', 'dir@x.org');
    expect(n.toastTitle).toBe('Tenant created');
    expect(n.toastDescription).toBe('Eastside provisioned. Admin invite sent to dir@x.org.');
    expect(n.tempPasswordNote).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tenantProvisionNotice.test.ts`
Expected: FAIL — cannot resolve `../tenantProvisionNotice`.

- [ ] **Step 3: Write the helper**

```ts
// src/lib/tenantProvisionNotice.ts
// Copy for the two provisioning outcomes. Staged setup (superadmin API
// `staged: true`) holds the welcome email and returns temp_password
// exactly once; the resend-welcome action later mints a fresh one.
export interface ProvisionNotice {
  toastTitle: string;
  toastDescription: string;
  tempPasswordNote: string | null;
}

export function provisionNotice(
  body: { staged?: boolean; temp_password?: string },
  name: string,
  adminEmail: string,
): ProvisionNotice {
  if (body.staged) {
    return {
      toastTitle: 'Tenant created (staged)',
      toastDescription: `${name} provisioned — no email sent. Press "Welcome" on its card at handoff.`,
      tempPasswordNote: body.temp_password
        ? `Temp password for ${adminEmail} (shown once): ${body.temp_password}`
        : `${adminEmail} already had an account — their existing password is unchanged.`,
    };
  }
  return {
    toastTitle: 'Tenant created',
    toastDescription: `${name} provisioned. Admin invite sent to ${adminEmail}.`,
    tempPasswordNote: null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/tenantProvisionNotice.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Wire staged mode into CreateTenantDialog**

All edits in `src/components/admin/CreateTenantDialog.tsx`:

a. Add imports:

```ts
import { Checkbox } from '@/components/ui/checkbox';
import { provisionNotice, type ProvisionNotice } from '@/lib/tenantProvisionNotice';
```

b. Extend the created-tenant state — change the `CreatedTenant` interface and add staged state:

```ts
interface CreatedTenant {
  id: string;
  slug: string;
  name: string;
  subdomain: string;
  admin_email: string;
  url: string;
  staged: boolean;
  tempPasswordNote: string | null;
}
```

```ts
  const [staged, setStaged] = useState(true);
```

c. In `reset()`, add `setStaged(true);`.

d. In `handleSubmit`, add `staged` to the POST body (after `deployment_path: deploymentPath,`):

```ts
          staged,
```

e. Replace the success handling (the `setCreated({...})` + `toast({...})` block after the `if (!res.ok)` guard) with:

```ts
      const notice: ProvisionNotice = provisionNotice(body, name.trim(), adminEmail);
      setCreated({
        id: body.id ?? body.tenant?.id ?? 'unknown',
        slug,
        name: name.trim(),
        subdomain: slug,
        admin_email: adminEmail,
        url: `https://${slug}.gleeworld.org`,
        staged: !!body.staged,
        tempPasswordNote: notice.tempPasswordNote,
      });
      toast({ title: notice.toastTitle, description: notice.toastDescription });
```

(`body` here is the parsed response JSON — the existing variable from `const body = await res.json().catch(() => ({}));`.)

f. In the success screen, replace the `<DialogDescription>` contents (currently "…is provisioned and verified. Credentials were emailed to…") with:

```tsx
              <DialogDescription>
                {created.staged ? (
                  <>
                    {created.name} is provisioned <strong>staged</strong> — no email sent yet. Build
                    their site, then press <strong>Welcome</strong> on the tenant card to send
                    credentials to <strong>{created.admin_email}</strong>.
                  </>
                ) : (
                  <>
                    {created.name} is provisioned and verified. Credentials were emailed to{' '}
                    <strong>{created.admin_email}</strong> — they set their own password on first
                    sign-in.
                  </>
                )}
              </DialogDescription>
```

g. In the success screen body (inside `<div className="space-y-2 text-sm">`, after the existing bordered row), add the show-once panel:

```tsx
              {created.tempPasswordNote && (
                <p className="rounded-md border border-amber-400 bg-amber-50 p-3 text-xs select-all">
                  {created.tempPasswordNote}
                </p>
              )}
```

h. In the form (after the deployment-path `<div className="space-y-1.5">` block, before `</div>` closing `space-y-3 py-3`), add the checkbox:

```tsx
              <label className="flex items-center gap-2 pt-1 text-sm font-normal cursor-pointer">
                <Checkbox checked={staged} onCheckedChange={(v) => setStaged(v === true)} />
                Staged setup — don&apos;t email the admin yet; show a temp password so we can build
                their site first
              </label>
```

- [ ] **Step 6: Verify gates**

Run: `npx eslint src/lib/tenantProvisionNotice.ts src/lib/__tests__/tenantProvisionNotice.test.ts src/components/admin/CreateTenantDialog.tsx` — expect clean (dialog file was clean before; keep it that way).
Run: `npm run typecheck:guard` — expected `OK … all pre-existing`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tenantProvisionNotice.ts src/lib/__tests__/tenantProvisionNotice.test.ts src/components/admin/CreateTenantDialog.tsx
git commit -m "feat(tenants): staged provisioning with show-once temp password in New Tenant dialog"
```

---

### Task 3: Resend-welcome (Welcome button) on tenant cards

**Files:**
- Modify: `src/pages/admin/PlatformTenantsPortal.tsx`

**Interfaces:**
- Consumes: nothing from other tasks (independent of Tasks 1–2; merge conflicts limited to the import block if run in parallel — prefer running after Task 1).
- Produces: nothing consumed later.

No new pure logic — this is wiring around a confirm dialog and a POST; covered by typecheck/lint/build + live manual verification in Task 5.

- [ ] **Step 1: Add imports**

In `src/pages/admin/PlatformTenantsPortal.tsx`, extend the lucide import with `Mail` and add the AlertDialog import:

```ts
import {
  ExternalLink,
  Settings,
  LayoutPanelTop,
  Search,
  Lock,
  RefreshCw,
  Loader2,
  Globe,
  Mail,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

- [ ] **Step 2: Add resend state + handler**

Inside `PlatformTenantsPortal()`, after the `openTenantAdmin` function:

```ts
  // Resend welcome = the staged-setup handoff step. The API mints a fresh
  // temp password for the tenant's admin (invalidating any staged one),
  // so it always goes through the confirm dialog below.
  const [resendTarget, setResendTarget] = useState<TenantRow | null>(null);
  const resendWelcome = async (t: TenantRow) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in.');
      const res = await fetch(`/superadmin/api/tenants/${t.id}/resend-welcome`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      toast({ title: 'Welcome email sent', description: `A fresh sign-in email went to the ${t.name} admin.` });
    } catch (e: any) {
      toast({ title: 'Resend failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };
```

- [ ] **Step 3: Make the card grid 2×2 and add the Welcome button**

Change the buttons container from `grid grid-cols-3 gap-1.5 pt-1` to:

```tsx
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
```

After the Pages `<Button>` (closing tag ~line 287), add:

```tsx
                    {!isPlatform && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 min-h-0 lg:min-h-0 px-2 text-xs"
                        onClick={() => setResendTarget(t)}
                        title="Email this tenant's admin a fresh sign-in (invalidates any staged password)"
                      >
                        <Mail className="w-3.5 h-3.5 mr-1" /> Welcome
                      </Button>
                    )}
```

(`isPlatform` already exists in the map callback; the main card keeps 3 buttons in the 2×2 grid.)

- [ ] **Step 4: Add the confirm dialog**

Just before the final closing `</div>` of the page's outer `max-w-7xl` container:

```tsx
      <AlertDialog open={!!resendTarget} onOpenChange={(v) => !v && setResendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend welcome email?</AlertDialogTitle>
            <AlertDialogDescription>
              This emails a fresh temp password to the {resendTarget?.name} admin and invalidates
              any staged password. Use it as the handoff step after building their site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resendTarget && void resendWelcome(resendTarget)}>
              Send welcome email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
```

(AlertDialogAction closes the dialog on click by design; the outcome arrives as a toast.)

- [ ] **Step 5: Verify gates**

Run: `npx eslint src/pages/admin/PlatformTenantsPortal.tsx` — no NEW errors (compare with `git stash` / `git stash pop` if counts are unclear).
Run: `npm run typecheck:guard` — expected `OK … all pre-existing`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/PlatformTenantsPortal.tsx
git commit -m "feat(tenants): Welcome (resend) button with confirm on tenant cards"
```

---

### Task 4: Break-glass note on the static console

**Files:**
- Modify: `public/superadmin/index.html`

- [ ] **Step 1: Add the pointer line**

Directly after `<h1>Superadmin</h1>` in `public/superadmin/index.html`:

```html
<p class="muted" style="margin:-8px 0 16px">
  Day-to-day tenant management now lives at
  <a href="https://gleeworld.org/admin/tenants">gleeworld.org/admin/tenants</a>.
  This page is the emergency fallback — it keeps working even if the main app build is broken.
</p>
```

No other changes to this file — its functionality stays intact deliberately (June 2026 wipe lesson).

- [ ] **Step 2: Commit**

```bash
git add public/superadmin/index.html
git commit -m "docs(superadmin): point static console at /admin/tenants as the daily surface"
```

---

### Task 5: Full verification + PR

- [ ] **Step 1: Run the full local gates**

```bash
npx vitest run src/lib/__tests__/platformStats.test.ts src/lib/__tests__/tenantProvisionNotice.test.ts
npm run typecheck:guard
npm run build
```

Expected: 6 tests pass; guard `OK`; build completes (warnings about chunk size are normal).

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin feat/tenants-command-center
gh pr create --title "feat(tenants): unified Tenants command center on /admin/tenants" --body "Folds the static /superadmin/ console's unique functions into /admin/tenants per docs/superpowers/specs/2026-08-03-tenants-command-center-design.md: platform stats strip, staged provisioning with show-once temp password, Welcome (resend) button with confirm on cards. Static console kept as break-glass with a pointer note. Frontend-only — superadmin API already supported staged/resend.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 3: Post-merge manual verification (after Kevin merges + deploy from main via scripts/deploy-frontend.sh)**

- /admin/tenants shows the stats strip (or the quiet unavailable note).
- New tenant dialog: staged checkbox ON by default; staged create shows the amber show-once password panel.
- A non-main tenant card shows Welcome; confirm → success toast (verify against a demo tenant, e.g. demo-choir).
- The main platform card has no Welcome button.
- /superadmin/ still loads, fully functional, with the new pointer line.
