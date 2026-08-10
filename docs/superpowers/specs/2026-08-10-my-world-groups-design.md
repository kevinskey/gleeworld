# My World — member-named groups

- **Status:** approved, unbuilt
- **Date:** 2026-08-10
- **Supersedes nothing.** Extends `docs/superpowers/specs/2026-08-08-my-space-nav-design.md` (the My World recut) and the uncap decision shipped in PR #584.
- **Decided by:** the product owner, in the brainstorming session of 2026-08-10.

## 1. Summary

My World's shelf is a single ordered list. PR #584 removed the 8-tool cap, so that
list can now grow to whatever a member pins — and a long flat list is the problem
the original recut set out to solve. This spec gives the member **named groups** to
file their tools into, on both surfaces the shelf drives.

A group is created and named by the member. It is personal: nobody else sees yours.
Tools that are not in a group stay loose at the top of the shelf, which means a
member who never makes a group sees exactly the shelf they see today.

## 2. The tension this design has to hold

The recut replaced a sidebar of 52 destinations across 10 collapsible sections
because that sidebar was an inventory wall. This spec adds collapsible sections back.

The difference is authorship, and it is the whole design:

> Ten pre-made sections holding everything is an inventory. A few member-made groups
> holding only what that member pinned is a filing system.

Every decision below is checked against that. Where a choice would drift back toward
"a place where all the app's destinations live," it is rejected — that is what
All Tools and ⌘K are for.

## 3. Goals / non-goals

**Goals**

- A member can create, name, fill, reorder, collapse, and delete groups.
- Grouping shows up on both surfaces the shelf drives: the sidebar and the home keycaps.
- A member who wants no groups is not made to have any, and sees no new chrome.
- A tenant admin can seed groups so a new member's first shelf is already organized.

**Non-goals**

- **No nesting.** A group holds tools, not groups.
- **No caps on group count or shelf length.** Bounds in §4 are corruption guards
  only. Reinstating a product cap here repeats the mistake PR #584 undid.
- **No automatic grouping.** Nothing files a tool on the member's behalf, and nothing
  reorders the shelf. Usage informs what a member is *offered*, never placement —
  muscle memory is the feature.
- **Groups are not a permission surface.** Hiding a tool is Workspace Settings →
  Navigation, and gating is `NavGate`. A group is presentation.

## 4. Data model — `MyTools` v5

Stored where v4 is stored: the `user_preferences.nav_item_order` jsonb column. **No DDL
for Phase 1.**

```ts
interface ToolGroup {
  /** generated uuid; never derived from name, so renaming preserves identity */
  id: string;
  /** member-authored, clamped to GROUP_NAME_MAX */
  name: string;
  /** ordered catalog keys */
  tools: string[];
  collapsed: boolean;
}

interface MyTools {
  v: 5;
  /** LOOSE tools, rendered above every group. v4's field, unchanged meaning. */
  tools: string[];
  groups: ToolGroup[];
  widgets: string[];
  setupComplete: boolean;
}
```

### 4.1 v4 → v5 is a pure widening

Because unfiled tools stay loose at the top, `tools` keeps its exact v4 meaning. A v4
record read as v5 is that record with `groups: []`. There is no backfill, no migration
script, and no shape reconciliation: an existing member's shelf renders byte-identical
to today until they create their first group. v5 rolls back to v4 as cleanly as v4
rolled back to v3 — a v4 reader encountering a v5 record reads `tools` and ignores
`groups`, losing the filing but never a tool.

### 4.2 Invariants

- **A key appears at most once** across `tools` + every `groups[].tools`. `sanitizeTools`
  keeps the first occurrence in render order (loose first, then groups in array order)
  and drops later duplicates. This is what "a tool belongs to one group" means
  mechanically; without it the grouped keycap grid would render the same tile twice.
- **`id` is stable across rename.** Collapse state, React keys, and the editor's
  "Move to…" menu all key off it.
- **Order is: loose tools, then groups in array order, then each group's tools in its
  own array order.** Nothing sorts. Nothing re-ranks.

### 4.3 Bounds — corruption guards, not product limits

| Constant | Value | Why it exists |
|---|---|---|
| `MY_TOOLS_SANITY_MAX` | 64 | Existing. Now counts loose + grouped **combined**, so a corrupt blob still cannot render unbounded rows. The whole catalog is well under it. |
| `GROUPS_SANITY_MAX` | 32 | Same reasoning, applied to group count. |
| `GROUP_NAME_MAX` | 32 chars | The one *real* constraint here: a longer name cannot render in a sidebar header or a keycap band. Enforced by clamping input, not by rejecting a save. |

Comment each of these at its definition with this paragraph's reasoning, the way
`MY_TOOLS_SANITY_MAX` already carries the "do not reinstate a cap" note. A future
reader must not mistake any of them for a product decision.

## 5. Surfaces

### 5.1 The shelf — sidebar and mobile drawer (`NavShelf`)

```
⌂ Command Center          always first, never in a group
  Calendar                loose tools — bare rows, exactly as today
  Messages
▾ Sunday                  group header: caret + name. Expanded, the rows
    Liturgy Planner       speak for themselves — no count.
    Worship Aids
▸ Teaching           3    collapsed: count stands in for the hidden rows
  ─────────
  ⊞ All Tools
  ⚙ Setup
```

Collapse state persists per member (§4). Toggling collapse is a save, so it obeys the
same gate as every other write in §7.

`NavShelf`'s header comment currently reads "No sections on the shelf, no accordions."
Rewrite it — do not leave it contradicting the code.

### 5.2 Home keycaps (`HomeTileGrid`)

Grouped bands. Loose keycaps first under no heading, then a heading per group with its
keycaps flowing beneath. The keycap grid renders at ≥768px, so the vertical cost of
headings lands on iPad and desktop, where there is room; the phone home screen is not
a keycap grid.

This preserves the existing ruling that the grid shows the **same set** as the shelf.

> **The grid must never write back a flattened projection.** This is the trap that
> already cost this feature a review round: `HomeTileGrid` seeded from a filtered
> `primary` and saved it whole, deleting sidebar-only keys, which is why
> `mergeGridOrder` preserves non-representable keys. Grouping is authored in the
> editor only. The grid reads `groups`; it never persists them.

### 5.3 Empty groups

**Empty groups are hidden on live surfaces and visible only in the editor.**

One rule, covering two cases: the group a member made but has not filled, and the group
whose every tool is gated off for this viewer (module disabled, role narrowed). A header
over zero rows is noise in the sidebar and worse over a keycap band.

The editor always shows every group, empty or not — otherwise a member could create a
group and watch it vanish.

### 5.4 The editor — `MyWorldEditor`

The existing Control-Center shape is kept: an "In Your World" inset card, then "More
Tools" grouped by catalog section with ⊕ badges, then Widgets. The first card grows:

- group header rows, inline in the same sortable list, so the editor looks like the
  shelf it edits;
- a `＋ New Group` row at the bottom, which appends a group and focuses an inline name field;
- a per-row overflow menu on every tool: **Move to ‹group›** / **Move out of group** / **New group…**;
- a per-header menu on every group: **Rename** / **Move up** / **Move down** / **Delete group**.

Drag-and-drop survives and is extended to dnd-kit multi-container, but **no group change
depends on a drag**. GleeWorld is used heavily on iPad and iOS, where drag-between-containers
is the least reliable gesture available; the menu is also the only path that works for
keyboard and VoiceOver users.

> **Deleting a group never unpins its tools.** They fall back to loose, in order, at the
> end of the loose list. Silently removing tools the member deliberately pinned is the
> worst failure this feature could have.

`MyWorldEditor` is presentation-only and is mounted by three owners (the personal page,
the admin defaults tab, the first-run sheet). That stays true: it takes `groups` and
`onGroupsChange` alongside `tools`/`onToolsChange`, and persists nothing itself.

## 6. Tenant-seeded groups (Phase 2)

An admin arranges named groups once per role in Workspace Settings → **Defaults for
members**, and a new member of that role inherits the whole arrangement as their starting
point, then edits their own copy. Nothing pushes changes to existing members.

### 6.1 The migration, and the trap in it

`supabase/migrations/20260808320000_tenant_default_tools.sql` is **written but not
applied**, which is why its shape is still free to change. It must become jsonb holding
`{tools, groups}` — the v5 shape minus `widgets`/`setupComplete`. Empty (`'{}'`) means no
tenant default, and callers fall back to `DEFAULT_TOOLS_FACULTY` / `DEFAULT_TOOLS_STUDENT`
exactly as designed.

> **Verify before editing the file.** The migration reads
> `ADD COLUMN IF NOT EXISTS default_tools text[]`. If that column already exists in
> production as `text[]`, rewriting the file to say `jsonb` **silently no-ops** — the
> `IF NOT EXISTS` guard sees the column and skips, leaving production on `text[]` while
> every reader expects `jsonb`. There is no error; the failure surfaces later as garbage
> reads.
>
> Step one of Phase 2 is therefore: query the live column type. If absent, edit the file
> in place. If present as `text[]`, the migration must **convert** (`ALTER COLUMN … TYPE
> jsonb USING …`) rather than add, and the `IF NOT EXISTS` form must be dropped.
>
> This could not be checked while writing the spec — the DB query was blocked by the
> permission classifier. It is an unresolved fact, not an assumption.

Apply with the deploy, then `NOTIFY pgrst, 'reload schema'`.

### 6.2 Reader

`useTenantDefaultTools.ts` returns the parsed `{tools, groups}`. Seeding a new member
copies it wholesale and assigns **fresh group ids** — the tenant's ids must never become
a member's ids, or a later tenant-side edit would appear to reach into members' saved
records.

Editing another role's defaults still narrows with `applyPreviewRole(navCtx, targetRole)`.
Grouping does not change that: an admin offering an `adminOnly` tool to a student role
would burn an invisible slot in every member of that role.

## 7. Error handling

- **Gating filters at render, never at storage.** A member who temporarily loses a module
  keeps their filing; the tool reappears in its group when access returns. Nothing prunes
  storage on read.
- **`saveMyTools` fills omitted fields from the current record.** `groups` joins that list.
  The existing consequence still bites: any save fired before the record loads persists
  emptiness, so every editor and the collapse toggle stay gated on `loading`/null.
- **Unknown or malformed `groups`** (hand-edited blob, future version) degrade to
  `groups: []` rather than throwing. A member sees their flat shelf, not a white screen.
- **A group whose tools all vanish from the catalog** renders as empty and is hidden per
  §5.3; it is not auto-deleted, because a catalog key can come back.

## 8. Acceptance tests

1. A v4 record loads as v5 with `groups: []` and renders a shelf identical to v4.
2. A key present in two groups survives once, first occurrence winning.
3. Deleting a group moves its tools to loose — count before equals count after.
4. Renaming a group preserves its collapse state and its tools (id-keyed, not name-keyed).
5. Collapse state round-trips through a save/reload.
6. A group with no tools, and a group whose every tool is gated off, both render on the
   editor and on neither the shelf nor the keycap grid.
7. `HomeTileGrid` performs no write that drops `groups` or sidebar-only keys.
8. Pinning from All Tools and from ⌘K lands the tool loose, above the first group.
9. A save fired while the record is still loading does not persist an empty `groups`.
10. Seeding from tenant defaults assigns fresh group ids, not the tenant's.

> Tests for the "Move to…" and header menus must drive **`mouseDown`**, not
> `fireEvent.click` — these are Radix controls, which activate on `mouseDown`. A
> `fireEvent.click` on a Radix trigger passes vacuously and has already silently killed
> 3+ tests on this feature.

## 9. Phasing

**Phase 1 — personal groups.** v5 model and `sanitizeTools`, shelf rendering, keycap
bands, editor (headers, `＋ New Group`, both menus, multi-container drag). No DDL. Ships
and is useful alone.

**Phase 2 — tenant-seeded groups.** The §6.1 verification, the migration rewrite,
`useTenantDefaultTools`, and the defaults tab. Blocked on the live column type.

## 10. Open questions

None blocking Phase 1. Phase 2 is blocked on one fact: the live type of
`gw_tenant_nav_prefs.default_tools` (§6.1).
