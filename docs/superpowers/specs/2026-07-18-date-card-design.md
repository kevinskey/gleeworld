# Configurable Date Card — Design

**Date:** 2026-07-18
**Status:** Approved, pending implementation plan
**Supersedes:** the hardcoded card in `docs/superpowers/specs/2026-07-17-liturgical-day-card-design.md`

## Context

`fix/liturgy-title-sync` added `LiturgicalDayCard` to the dashboard home, mounted behind an inline
`moduleSet.has('liturgy_planner')` check at `HouseHome.tsx:161`. It was requested by Lyke House, a
Catholic tenant, and it works — but it hardcodes one card type into the top slot of every tenant's
dashboard.

The ask was to make that card available to all tenants. Investigation showed the premise needed
adjusting: the card was never gated to Lyke House. It is gated on the `liturgy_planner` billing
add-on, so any tenant who buys that add-on already gets it.

The real requirement is different and better: **the top-of-dashboard slot should be a pluggable
card whose type each tenant chooses.** Liturgical is one option among several, plus a custom option
tenants author themselves. This also resolves a tenant-neutrality problem — GleeWorld serves ~50
tenants, most of them secular school and community ensembles, and "TODAY'S LITURGY" should never
appear on a marching band's dashboard by default.

**Outcome:** every tenant gets a date card. The default is a plain date. Tenant admins can switch
it to up-next, today-at-a-glance, liturgical (add-on required), or a custom token-driven card.

## Non-goals

- Per-**user** card choice. This is a tenant-level setting; users do not override it.
- Multiple simultaneous cards. Exactly one card occupies the slot.
- Rich text / HTML authoring. See "Custom card" below for why.
- Academic term/week data. No term table exists; `{{term_week}}` is deliberately excluded.
- Changing `liturgy_planner` pricing or tier. The Liturgy Planner page stays a paid add-on.

## Architecture

### Registry

New `src/components/home/date-card/registry.ts`, cloning the block-registry contract in
`src/components/public-site/types.ts:88-111` and `src/components/public-site/registry.ts`.

```ts
export interface DateCardModule<S extends z.ZodTypeAny = z.ZodTypeAny> {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  requiredAddon?: string;              // gw_billing_modules.id
  configSchema: S;
  defaultConfig: z.infer<S>;
  EditorForm?: ComponentType<DateCardEditorProps<z.infer<S>>>;   // optional; AutoForm otherwise
  Render: ComponentType<DateCardRenderProps<z.infer<S>>>;
}

export const DATE_CARD_REGISTRY: Record<string, DateCardModule>;
export function getDateCardModule(type: string): DateCardModule | undefined;
export function isDateCardAvailable(mod: DateCardModule, activeAddons: string[]): boolean;
```

Reuse `safeConfig()` from `src/components/public-site/types.ts:113-118` verbatim — it makes config
parsing forward-compatible, so a config written by a newer build never white-screens an older one;
it falls back to `defaultConfig`.

Adding a sixth card type later = one new file in `./cards` + one registry entry. Keep `configSchema`
shapes **flat** (no nested objects or arrays) so `AutoForm` (`src/components/public-site/AutoForm.tsx`)
renders the settings UI automatically; only reach for a bespoke `EditorForm` when that breaks down.

Differences from `BlockModule`: no `position`, no `is_visible` (exactly one card), no `tier`/`group`
(the picker is short enough not to need grouping).

### Card types

| `type` | Source | Gate |
|---|---|---|
| `plain` **(default)** | `now` | — |
| `up_next` | `selectUpNext()`, `fuseProgress()` — `src/lib/home/upNext.ts:7-22` | — |
| `today` | `todayRows` — `HouseHome.tsx:113-119` | — |
| `liturgical` | `usccb-readings` edge fn + `ReadingsModal` | `liturgy_planner` |
| `custom` | `substituteText()` — `src/lib/planner/templates.ts` | — |

Every non-liturgical type draws on data **already in scope** in `HouseHome`. No new queries, no new
network calls on the dashboard's critical path.

`liturgical` and `ReadingsModal` are lifted from `fix/liturgy-title-sync` essentially unchanged. Its
inline `moduleSet.has('liturgy_planner')` conditional becomes `requiredAddon: 'liturgy_planner'` on
the module descriptor.

### Rendering context

The registry's `Render` components receive one context object assembled once in `HouseHome`:

```ts
interface DateCardContext {
  now: Date;
  firstName: string;
  rows: FeedRow[];          // v_command_center_feed, already fetched
  upNext: FeedRow | null;
  todayRows: FeedRow[];
  moduleSet: Set<string>;
}
```

This keeps cards pure and independently testable — a card is a function of `(config, ctx)`.

### Storage

Add a `date_card jsonb` column to `gw_branding_settings`. That table already has exactly one row per
tenant and the `set_tenant_id_default()` trigger supplies `tenant_id` — **do not pass `tenant_id`
explicitly on write** (see `WorkspaceSettingsPage.tsx:712-726` for the established upsert shape).

Versioned envelope, following `useHomeTileLayout` (`src/hooks/useHomeTileLayout.ts`):

```jsonc
{ "v": 1, "type": "plain", "config": {} }
```

Read/write through a new `useDateCardConfig()` hook wrapping `useBrandingSettings()`, with a
`parseDateCardConfig()` validator mirroring `parseTileLayout` — malformed JSON degrades to the
default rather than throwing.

**Do not use `dashboard_settings`.** That table has no tenant column and is global across all
tenants; extending it would leak one tenant's choice to every other tenant.

### Settings UI

`src/pages/dashboard/WorkspaceSettingsPage.tsx`, route `/dashboard/workspace`:

1. New `<TabsTrigger value="datecard">` near `:69`.
2. New `<TabsContent value="datecard">` near `:77`.
3. Bump the `TabsList` from `md:grid-cols-6` to `md:grid-cols-7` at `:63`.
4. New `DateCardTabPanel({ canManage })` in the same file, modeled on `BrandingTabPanel` (`:691-781`):
   local `form` state seeded by `useEffect`, controlled inputs, `save()` upsert, `toast.success`,
   `refetch()`.

Panel contents: a card-type picker (name + description + icon per registry entry), a **live preview**
rendering the selected card with real context, and the selected type's config form. Types whose
`requiredAddon` is not active render disabled with an "Add-on required" affordance rather than being
hidden — that makes the Liturgy add-on discoverable.

Respect `canManage`: disable inputs and hide the save button for non-admins, as every other panel does.

### Custom card

Extend `TEMPLATE_VARS` in `src/lib/planner/templates.ts`. The engine there is already the right one —
its header documents the contract: a fixed allowlist, plain string replacement, no expressions, no
helpers, no code execution, unknown placeholders pass through unchanged.

Tokens: `{{date}}`, `{{time}}`, `{{user_name}}`, `{{ensemble_name}}`, `{{next_event}}`,
`{{next_event_date}}`. `{{date}}` and `{{time}}` already exist.

Config is three plain-text fields — `eyebrow`, `title`, `subtitle` — each rendered as a **React text
node**.

**No `dangerouslySetInnerHTML`.** This repo has no sanitizer: `dompurify` appears in `node_modules`
only transitively via `jspdf@3.0.1` and is imported nowhere in `src/`. There are already 26
unsanitized `dangerouslySetInnerHTML` sites. Tenant-authored HTML rendered on every member's
dashboard would be a stored-XSS vector across a multi-tenant platform, and adding a sanitizer is a
larger decision than this feature should force.

Unknown tokens rendering literally is intentional: a typo is visible to the author rather than
silently producing an empty line.

### Degradation

If a tenant selects `liturgical` and later drops the add-on, `isDateCardAvailable()` returns false
and the slot falls back to `plain`. The stored config is preserved, so resubscribing restores the
choice. The same fallback covers an unknown `type` from a future build.

## Testing

- **Unit — registry:** `safeConfig` falls back on malformed/unknown config; `isDateCardAvailable`
  respects `requiredAddon`.
- **Unit — tokens:** extend `src/lib/planner/__tests__/templates.test.ts` for the new vars; assert
  unknown tokens pass through and that no token can inject markup.
- **Unit — parsing:** `parseDateCardConfig` degrades to default on `null`, `{}`, wrong `v`, unknown `type`.
- **Component:** each of the five `Render` components against a fixture `DateCardContext`, including
  empty states (`upNext === null`, `todayRows === []`).
- **Manual (per the repo verify skill):** a tenant with no config shows `plain`; switching types in
  Workspace Settings updates the dashboard; a tenant without `liturgy_planner` sees the liturgical
  option disabled; custom tokens substitute correctly at a 390px viewport and desktop.

## Implementation risks

1. **Branch dependency.** `LiturgicalDayCard`, `ReadingsModal`, and `src/components/liturgy/` exist
   only on `fix/liturgy-title-sync`, not on `main`. That work must land first or be cherry-picked.

2. **`roleLoading` regression on that branch — must not be reintroduced.** `fix/liturgy-title-sync`
   drops the `loading: roleLoading` destructure at `HouseHome.tsx:33`, the `|| roleLoading` condition
   at `:143`, and the `&& !roleLoading` guard at `:253`, plus the explanatory comment at `:126-130`.
   That guard is the fix for the faculty/student tile-identity flash recorded in the
   `nav-role-loading-flash` note. Merging must **keep the guard from the current branch** and take
   only the card additions.

3. **Shared checkout.** Concurrent sessions share `~/Documents/GitHub/gleeworld`; verify the branch
   before every commit and build. Consider an isolated worktree for this work.

4. **Schema drift.** `docs/manual/_factsheets/VERIFY-QUEUE.md:43-44` records that
   `gw_billing_modules` and `v_tenant_active_modules` were found only in
   `migrations/phase6_tenant_modules.sql`, outside `supabase/migrations/`. Confirm the live droplet
   schema before relying on `liturgy_planner` provisioning.

## Files touched

| File | Change |
|---|---|
| `src/components/home/date-card/registry.ts` | new — registry + types + availability |
| `src/components/home/date-card/cards/*.tsx` | new — five card modules |
| `src/components/liturgy/{LiturgicalDayCard,ReadingsModal}.tsx` | lifted from branch, adapted to registry |
| `src/hooks/useDateCardConfig.ts` | new — read/write + validation |
| `src/lib/planner/templates.ts` | extend `TEMPLATE_VARS` |
| `src/pages/dashboard/HouseHome.tsx` | build `DateCardContext`, render slot; preserve `roleLoading` guard |
| `src/pages/dashboard/WorkspaceSettingsPage.tsx` | new tab + `DateCardTabPanel`; grid-cols 6→7 |
| `supabase/migrations/<ts>_date_card.sql` | new — `date_card jsonb` on `gw_branding_settings` |
