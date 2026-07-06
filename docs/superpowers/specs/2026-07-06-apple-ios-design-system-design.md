# Apple iOS Design System for GleeWorld — Design Spec

**Date:** 2026-07-06
**Status:** Approved (brainstorming session with Kevin)
**Supersedes:** the "tactile brutalism / typography as architecture" visual direction in `src/index.css`. Complements (does not replace) the House & Stage direction (2026-07-04): House = iOS light, Stage = iOS dark.

## Goal

Give GleeWorld a full iOS 26 look-and-feel — Apple's type scale, 8pt spacing discipline, semantic color system, and native-feeling components — across web and the Capacitor iOS app. All values come from Apple's Human Interface Guidelines (Dec 16, 2025 revision, iOS 26 "unified" palette).

## Decisions (locked)

1. **Scope:** full iOS look-and-feel, whole app (not iOS-app-only, not a token-only reskin).
2. **Tenant branding:** neutral iOS chrome everywhere; each tenant's brand color becomes the single system **tint** (Apple AccentColor model). Replaces both `--primary`-as-chrome and the indigo `--link`.
3. **House & Stage:** House surfaces use the iOS light palette; Stage rooms (Studio, Tonight mode) use Apple's dark palette. One semantic token set, two value sets.
4. **Font:** system font stack (real SF Pro on Apple devices; Segoe/Roboto elsewhere). No self-hosted SF (license), no Inter for UI. Bravura stays for music notation.
5. **Rollout:** hybrid — token big-bang PR first, then agent audit sweeps, then per-surface refinement (same playbook as the 2026-06 light-theme migration).

## 1. Typography

**Stack** (replaces Inter/Bebas Neue/Graduate/Oswald; remove their font loads):

```css
font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
```

**Scale** — Apple Dynamic Type "Large" (1pt = 1px CSS). Exposed as CSS tokens and mapped onto Tailwind `fontSize` so existing utilities inherit:

| Token | Size/Leading | Weight | Tracking | Tailwind | Usage |
|---|---|---|---|---|---|
| `--font-large-title` | 34/41 | 700 | +0.4px | `text-3xl` + h1 | Page titles |
| `--font-title-1` | 28/34 | 700 | +0.38px | `text-2xl` + h2 | Section heads |
| `--font-title-2` | 22/28 | 700 | −0.26px | `text-xl` + h3 | Card group titles |
| `--font-title-3` | 20/25 | 600 | −0.45px | `text-lg` + h4 | Sub-sections |
| `--font-headline` | 17/22 | 600 | −0.43px | `.font-headline` | List/card item titles |
| `--font-body` | 17/22 | 400 | −0.43px | `text-base`, body | Body text |
| `--font-callout` | 16/21 | 400 | −0.31px | — (rare) | Callouts |
| `--font-subhead` | 15/20 | 400 | −0.23px | `text-sm` | Secondary text |
| `--font-footnote` | 13/18 | 400 | −0.08px | `text-xs` | Metadata, timestamps |
| `--font-caption` | 12/16 and 11/13 | 400 | 0 | `text-2xs` | Badges, tab labels |

Rules:

- **Kill viewport-scaling headlines.** `h1 { clamp(2rem, 8vw, 5.5rem) }` and the Bebas display blocks are deleted. Page titles are 34px bold, left-aligned.
- **Hierarchy by weight, not size:** regular body vs. semibold headline at the same 17px is the default emphasis move.
- Emphasized variants follow Apple: Large Title/Title 1/Title 2 embolden to Bold (already 700); Body/Subhead/Footnote embolden to Semibold 600.
- Floors: 11px absolute minimum (tab labels only); 13px minimum for readable UI text — satisfies the existing Studio sizing standard (no sub-12px in DAW chrome).
- Inputs render ≥16px so iOS Safari never auto-zooms.

## 2. Spacing & Geometry

- **Grid:** 8pt with 4pt subdivisions. Screen margins `px-4` (16pt) compact / `px-5`–`px-6` regular width. Card padding 16pt. Stack gaps 8/12/16pt. No new spacing plumbing needed (Tailwind is 4px-based); enforcement happens in the audit sweep.
- **Tap targets:** 44×44pt minimum. Buttons default `h-11`; list rows `min-h-11`; icon buttons `w-11 h-11` hit area (icon may be smaller).
- **Corner radius:** `--radius: 12px` (from `0`). Remove the `xl/2xl/3xl → 0px` flattening in `tailwind.config.ts` (restore 12/16/24px). Cards + grouped lists 12px; sheets/modals/popovers 16px; standalone CTAs capsule (`rounded-full`); avatars/pills unchanged.
- **Depth:** delete the film-grain `body::before` overlay. Shadow system collapses to one token: `--shadow-card: 0 1px 3px rgba(0,0,0,0.06)`. Elevation = white card on gray canvas, not shadow stacks.
- **Press feedback:** replace `translateY(1px) scale(0.99)` with iOS-style `active:opacity-60` (plain/text controls) and `active:scale-[0.97]` (cards, tiles).

## 3. Color

Keep the HSL-CSS-variable plumbing (tenant-theme.css compatibility). Three token groups:

### 3a. Neutrals (fixed, tenant-independent) — iOS 26 values

| Role | Light (House) | Dark (Stage) |
|---|---|---|
| `--background` | `#F2F2F7` | `#000000` |
| `--card` | `#FFFFFF` | `#1C1C1E` |
| `--card-secondary` / `--muted` | `#F2F2F7` | `#2C2C2E` |
| `--foreground` | `#000000` | `#FFFFFF` |
| `--text-secondary` | `#3C3C43` @ 60% | `#EBEBF5` @ 60% |
| `--text-tertiary` | `#3C3C43` @ 30% | `#EBEBF5` @ 30% |
| `--border` (hairline separator) | `#3C3C43` @ 29% | `#545458` @ 65% |
| `--input` | `#FFFFFF` | `#1C1C1E` |
| System grays 1–6 | `#8E8E93 #AEAEB2 #C7C7CC #D1D1D6 #E5E5EA #F2F2F7` | `#8E8E93 #636366 #48484A #3A3A3C #2C2C2E #1C1C1E` |

Retired: oatmeal canvas (`36 30% 97%`), paper-white card, warm sand border, slate text tiers, `--hover-accent`, gradient tokens on controls.

Dark values live under the Stage room scope (`.dark` / `[data-room="stage"]` per the House & Stage spec). Studio and Tonight mode adopt this palette wholesale.

### 3b. Tint (tenant-routed) — replaces `--primary` and `--link`

- `--tint` (light) + `--tint-dark` (brighter dark-mode variant, Apple light/dark pair pattern).
- Applies to: filled buttons, links, active tab item, toggles/switches, selected states, focus rings, progress.
- Main tenant: GleeWorld purple aligned to the iOS purple family (`#CB30E0` light / `#DB34F2` dark). Spelman: their gold pair. One pair per tenant in tenant-theme.css.
- Cyan→purple brand gradients survive only on marketing/hero surfaces, never on controls.

### 3c. System semantics (fixed) — iOS 26 unified palette

- Destructive/error: `#FF383C` / `#FF4245` · Success: `#34C759` / `#30D158` · Warning: `#FFCC00` / `#FFD600` · Info: `#0088FF` / `#0091FF`.
- Where a system color carries text on a light background, use Apple's increased-contrast variant (e.g. green `#008932`, orange `#C55300`, red `#E9152D`) to hold WCAG AA.
- Event-type chips remap to iOS-palette pastel-bg + dark-text pairs (performance→blue, rehearsal→green, sectional→purple, meeting→orange, voice-lesson→pink, service→indigo, etc.) so the calendar reads like iOS Calendar. Fixed semantics — not tenant-routed (unchanged rule).

## 4. Components

| Component | Treatment |
|---|---|
| Mobile tab bar | Floating pill, inset ~16pt from edges/bottom, `backdrop-filter: blur(20px)` translucent white (dark: translucent `#1C1C1E`), active item in tint, 11px labels. |
| Page header | Large-title pattern: 34px bold title collapses on scroll to 17px semibold centered inline title on a glass bar. |
| Glass usage | Navigation layer ONLY (tab bar, collapsed header). Never on content surfaces — Liquid Glass rule. |
| Lists | Grouped inset lists: white 12px-radius groups on gray canvas, 44pt rows, hairline separators inset to text alignment, chevrons, 13px uppercase section headers in secondary color. |
| Buttons (shadcn variants) | `filled` = tint capsule, white 17px text · `gray` = systemGray5 bg + tint text · `plain` = tint text only · `destructive` = iOS red. All `h-11`. |
| Forms | Grouped input cells; iOS-style tint switches replace checkbox-style toggles where binary. |
| Cards/tiles | White, 12px radius, hairline or `--shadow-card`, headline titles, footnote metadata. |

Constraint carried forward: all copy/identifiers stay tenant-neutral ("students", "graduates"; never "Spelman" hardcoded).

## 5. Rollout

- **Phase 0 — token big bang (1 PR):** font stack + type scale + full color token rewrite + radius restore + grain/press-effect/Bebas removal + button, tab bar, header restyle. `src/index.css`, `tailwind.config.ts`, `src/components/ui/*`.
- **Phase 1 — audit sweep:** ui-design-auditor + fix agents convert hardcoded `bg-white`, `text-slate-*`, oatmeal/sand hexes, ad-hoc radii and font sizes to tokens across `src/`.
- **Phase 2 — surface passes:** Home, Calendar, Roster/Members, Dashboard get grouped lists + large titles; then Stage rooms (Studio, Tonight) flip to the dark palette.
- **Phase 3 — verify + ship:** demo + Spelman tenant tint check; 390px mobile-sweep harness; Playwright smoke on local preview (write-heavy prod E2E is gated); build locally, rsync **without `--delete`** (tenant-bootstrap.js lives outside dist/); no service worker reintroduction. Capacitor iOS app inherits everything.

## Error handling / edge cases

- **Tenant tint contrast:** validate each tenant pair for ≥4.5:1 on white (light) and on `#1C1C1E` (dark) at onboarding; fall back to the increased-contrast variant or darkened tint for text-on-white uses (tint-on-white text is the known risk with golds/yellows — Spelman gold likely needs a darkened text variant, like Apple's yellow `#A16A00`).
- **Windows/Android rendering:** Segoe/Roboto metrics differ slightly from SF; leading tokens are explicit (not font-derived) so layout holds.
- **Legacy hardcoded colors:** anything the audit misses still sits on white cards — degraded, not broken. Sweep is iterative.
- **`prefers-reduced-transparency` / older Safari:** tab bar and header fall back to solid `#FFFFFFF2` / `#1C1C1EF2` when `backdrop-filter` is unavailable.

## Testing

- Playwright visual smoke on local preview: home, calendar, roster, a Studio room, in both House (light) and Stage (dark) scopes, at 390px and 1280px.
- Tenant matrix: main (purple) + demo + one gold-tint tenant.
- Manual: iPhone Safari (real SF rendering, tab bar safe-area), one Windows browser (Segoe fallback).

## Success criteria

Side-by-side with a stock iOS 26 app, GleeWorld's chrome (nav, lists, buttons, tab bar) is visually indistinguishable in structure — while a tenant's tint and content imagery still make it unmistakably theirs.
