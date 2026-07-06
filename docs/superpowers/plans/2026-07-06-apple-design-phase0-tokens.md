# Apple iOS Design System — Phase 0 (Token Big Bang) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One PR that pivots GleeWorld's base layer to the iOS 26 look: system font stack + Apple type scale, iOS 26 color tokens (light + dark), 12px geometry, and restyled Button / Card / mobile tab bar.

**Architecture:** GleeWorld is a Vite + React + Tailwind + shadcn app where nearly all styling flows through CSS custom properties in `src/index.css` and the Tailwind theme in `tailwind.config.ts`. This plan rewrites those token layers in place (keeping every existing variable NAME so tenant-theme.css and hundreds of component call sites keep working), then restyles the three components that define the "iOS feel": button, card, bottom tab bar.

**Tech Stack:** Vite, React 18, Tailwind 3, class-variance-authority (cva), shadcn/ui conventions.

**Spec:** `docs/superpowers/specs/2026-07-06-apple-ios-design-system-design.md` (approved 2026-07-06).

## Global Constraints

- Work in the scratchpad clone: `/private/tmp/claude-501/-Users-kevinjohnson/367461db-5a7c-4327-b1d7-b152e9f2ad34/scratchpad/gleeworld` (`~/Documents` is TCC-blocked). Branch: `apple-design-phase0` off `main`.
- Keep all existing CSS variable NAMES (`--background`, `--primary`, `--border`, `--text-secondary`, …). Only values change. tenant-theme.css relies on `--site-accent` + `--primary` — do not rename.
- shadcn HSL-triple format (`240 24% 96%`, consumed via `hsl(var(--x))`) must be preserved for every token that already uses it.
- **Do NOT remove the Google Fonts `<link>` in `index.html:43`.** Bebas Neue, Graduate, Playfair etc. are user-selectable fonts in the landing-page builder and concert-planner themes (`src/components/public-site/types.ts`, `src/lib/concertPlanner/themes.ts`). The UI chrome stops *using* them; the loads stay. (Documented spec deviation.)
- Do not touch `src/styles/tenant-theme.css`, landing-page builder blocks, or concert planner themes in this phase.
- Tenant-neutral copy rules apply ("students", "graduates", never hardcoded "Spelman").
- The collapsing large-title glass header (spec §4) is intentionally deferred to Phase 2 surface passes — Phase 0 headers get the large-title type via the `h1` rules only. (Documented spec deviation.)
- Type floors: 11px absolute (tab labels only), 13px minimum for readable UI text; inputs ≥16px (iOS Safari anti-zoom).
- Commit after every task. Do not push until the final task.

## File Structure

| File | Responsibility in this plan |
|---|---|
| `src/index.css` | Font stack, type scale, all color tokens (light `:root` + `.dark`), geometry tokens, removal of grain/press-effect/display-font blocks |
| `tailwind.config.ts` | `fontSize` scale in px, radius restore, shadow token |
| `src/components/ui/button.tsx` | iOS button variants (capsule filled / gray / plain) |
| `src/components/ui/card.tsx` | iOS card (12px radius, shadow elevation, headline title) |
| `src/components/navigation/MobileBottomNav.tsx` | Floating glass pill tab bar |
| `scripts/check-design-tokens.sh` | Create: grep-based regression guard for retired patterns |

---

### Task 1: Branch + regression guard script

**Files:**
- Create: `scripts/check-design-tokens.sh`

**Interfaces:**
- Produces: `bash scripts/check-design-tokens.sh` — exits 0 when all retired patterns are gone; used as the "test" by Tasks 2–6.

- [ ] **Step 1: Create branch**

```bash
cd /private/tmp/claude-501/-Users-kevinjohnson/367461db-5a7c-4327-b1d7-b152e9f2ad34/scratchpad/gleeworld
git fetch origin main && git checkout -b apple-design-phase0 origin/main
```

- [ ] **Step 2: Write the failing check script**

```bash
#!/usr/bin/env bash
# Phase 0 regression guard: retired design patterns must not exist.
set -u
fail=0
check_absent() { # pattern, file, label
  if grep -qE "$1" "$2"; then echo "FAIL: $3 still present in $2"; fail=1; else echo "ok: $3 gone"; fi
}
check_present() {
  if grep -qE "$1" "$2"; then echo "ok: $3 present"; else echo "FAIL: $3 missing from $2"; fail=1; fi
}
# retired
check_absent "clamp\(2rem, 8vw"            src/index.css "viewport-scaling h1"
check_absent "Bebas Neue"                   src/index.css "Bebas UI styling"
check_absent "feTurbulence"                 src/index.css "film-grain overlay"
check_absent "translateY\(1px\) scale"      src/index.css "brutalist press effect"
check_absent "36 30% 97%"                   src/index.css "oatmeal canvas"
check_absent "'2xl': '0px'"                 tailwind.config.ts "flattened 2xl radius"
check_absent "rounded-none"                 src/components/ui/button.tsx "square buttons"
check_absent "rounded-none"                 src/components/ui/card.tsx "square cards"
# required
check_present '\-apple-system'              src/index.css "system font stack"
check_present "240 24% 96%"                 src/index.css "iOS systemGray6 canvas"
check_present "font-size: 17px"             src/index.css "17px body"
check_present "--tint"                      src/index.css "tint token"
exit $fail
```

Save as `scripts/check-design-tokens.sh`, then `chmod +x scripts/check-design-tokens.sh`.

- [ ] **Step 3: Run it — verify it FAILS (baseline still brutalist)**

Run: `bash scripts/check-design-tokens.sh`
Expected: multiple `FAIL:` lines (viewport h1, grain, oatmeal, square radii all still present), exit code 1.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-design-tokens.sh
git commit -m "chore: add Phase 0 design-token regression guard"
```

---

### Task 2: Typography — font stack + Apple type scale

**Files:**
- Modify: `src/index.css` (font/heading region, ~lines 135–193, plus every `font-family` that names Inter/Bebas/Graduate/Oswald for UI chrome: ~lines 724, 779, 794, 808, 980, 999, 1010)
- Modify: `tailwind.config.ts` (add `fontSize` to `theme.extend`)

**Interfaces:**
- Produces: CSS var `--font-ui`; Tailwind sizes `text-2xs/xs/sm/base/lg/xl/2xl/3xl` remapped to the Apple scale in **px** (px, not rem, so the 4px-rem spacing grid is untouched); utility class `.font-headline`.

- [ ] **Step 1: Define the stack and base type in `src/index.css`**

Replace the block at ~line 135–150 (the "Typography scale — Kennedy's responsive guide…" comment, `html, body { font-size: 16px; … }`, and the `p, label, li…` 18px desktop override) with:

```css
  /* Apple iOS 26 typography — HIG Dynamic Type "Large" (1pt = 1px CSS).
     Real SF Pro on Apple devices via the system stack; Segoe/Roboto
     elsewhere. Leading and tracking are explicit so layout holds on
     non-SF platforms. Hierarchy comes from WEIGHT (regular body vs
     semibold headline), not size drama. */
  :root {
    --font-ui: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI",
      Roboto, "Helvetica Neue", sans-serif;
  }
  html, body {
    font-family: var(--font-ui);
    font-size: 17px;
    line-height: 22px;
    letter-spacing: -0.43px;
  }
```

- [ ] **Step 2: Replace the heading rules (same region, the `h1 { clamp… }` block)**

```css
  /* iOS large-title hierarchy — HIG sizes/weights/tracking verbatim. */
  h1 { font-size: 34px; line-height: 41px; font-weight: 700; letter-spacing: 0.4px;  color: hsl(var(--foreground)); }
  h2 { font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: 0.38px; color: hsl(var(--foreground)); }
  h3 { font-size: 22px; line-height: 28px; font-weight: 700; letter-spacing: -0.26px; color: hsl(var(--foreground)); }
  h4 { font-size: 20px; line-height: 25px; font-weight: 600; letter-spacing: -0.45px; color: hsl(var(--foreground)); }
  h5, h6 { font-size: 17px; line-height: 22px; font-weight: 600; letter-spacing: -0.43px; color: hsl(var(--foreground)); }
```

And add to the `@layer utilities` block near the top of the file:

```css
  /* Apple "Headline" — list/card item titles: body size, semibold. */
  .font-headline {
    font-size: 17px; line-height: 22px; font-weight: 600; letter-spacing: -0.43px;
  }
```

- [ ] **Step 3: Retire display/UI font references**

- ~line 724 (`font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important;`) → `font-family: var(--font-ui) !important;`
- ~line 980 (`font-family: 'Inter', 'Roboto', system-ui, sans-serif;`) → `font-family: var(--font-ui);`
- Delete the Bebas/Graduate heading blocks at ~lines 779, 794, 808, 999, 1010 entirely. Find them with `grep -n "Bebas\|Graduate\|Oswald" src/index.css` — delete each matched CSS rule (selector through closing brace). These rules only set `font-family`/`letter-spacing`/`text-transform` on headings; landing-page-builder font pickers live in `src/components/public-site/` and are untouched.
- `@font-face` for Bravura stays.

- [ ] **Step 4: Map Tailwind sizes in `tailwind.config.ts`** — inside `theme.extend`, add:

```ts
      fontSize: {
        // Apple HIG Dynamic Type (Large) — px on purpose: rem would ride
        // the 17px body and break the 4px spacing grid.
        '2xs': ['11px', { lineHeight: '13px' }],                              // Caption 2 — tab labels only
        xs:   ['13px', { lineHeight: '18px', letterSpacing: '-0.08px' }],     // Footnote
        sm:   ['15px', { lineHeight: '20px', letterSpacing: '-0.23px' }],     // Subhead
        base: ['17px', { lineHeight: '22px', letterSpacing: '-0.43px' }],     // Body
        lg:   ['20px', { lineHeight: '25px', letterSpacing: '-0.45px' }],     // Title 3
        xl:   ['22px', { lineHeight: '28px', letterSpacing: '-0.26px' }],     // Title 2
        '2xl': ['28px', { lineHeight: '34px', letterSpacing: '0.38px' }],     // Title 1
        '3xl': ['34px', { lineHeight: '41px', letterSpacing: '0.4px' }],      // Large Title
        // 4xl+ left at Tailwind defaults; hero surfaces get audited in Phase 2.
      },
```

- [ ] **Step 5: Verify**

Run: `bash scripts/check-design-tokens.sh`
Expected: "viewport-scaling h1", "Bebas UI styling", "system font stack", "17px body" lines now pass (color/geometry checks still FAIL — that's Tasks 3–4).
Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built` with no CSS errors.

- [ ] **Step 6: Commit**

```bash
git add src/index.css tailwind.config.ts
git commit -m "feat(design): system font stack + Apple HIG type scale"
```

---

### Task 3: Color tokens — iOS 26 light + dark

**Files:**
- Modify: `src/index.css` — the `:root` block at ~line 194 and the `.dark` block at ~line 649

**Interfaces:**
- Produces: same token names, iOS 26 values; NEW full-color token `--tint` / `--tint-contrast` consumed by Tasks 5–6 as `var(--tint)`.

- [ ] **Step 1: Rewrite the neutrals + tint in `:root`** (replace the corresponding lines inside the existing block; leave `--brand-*`, messenger, and status-warning tokens where noted):

```css
    /* ── iOS 26 neutrals (HIG values; HSL triples for shadcn plumbing) ── */
    --background: 240 24% 96%;        /* #F2F2F7 systemGray6 — canvas */
    --foreground: 0 0% 0%;            /* label */
    --card: 0 0% 100%;                /* #FFFFFF */
    --card-foreground: 0 0% 0%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 0%;
    --muted: 240 24% 96%;             /* systemGray6 — secondary fill */
    --muted-foreground: 240 2% 55%;   /* #8A8A8E = secondaryLabel flattened on white */
    --accent: 240 24% 96%;
    --accent-foreground: 0 0% 0%;
    --border: 240 2% 78%;             /* #C7C7C9 = separator (3C3C43 @29%) flattened */
    --input: 0 0% 100%;
    --ring: var(--primary);

    /* Tiered text (flattened Apple label opacities on white) */
    --text-primary: 0 0% 0%;
    --text-secondary: 240 2% 55%;     /* #8A8A8E — secondaryLabel */
    --text-metadata: 240 2% 55%;

    /* iOS system grays 1–6 (light) */
    --gray-1: 240 2% 57%;  /* #8E8E93 */
    --gray-2: 240 2% 69%;  /* #AEAEB2 */
    --gray-3: 240 5% 79%;  /* #C7C7CC */
    --gray-4: 240 6% 83%;  /* #D1D1D6 → 240 6% 83% */
    --gray-5: 240 11% 91%; /* #E5E5EA */
    --gray-6: 240 24% 96%; /* #F2F2F7 */

    /* ── Tint: the ONE accent (Apple AccentColor model). Full-color token;
       composes with tenant plumbing: tenant sets --site-accent, default
       falls through to --primary (GleeWorld purple, iOS 26 family). ── */
    --primary: 293 74% 53%;           /* #CB30E0 iOS purple (light) */
    --primary-foreground: 0 0% 100%;
    --tint: var(--site-accent, hsl(var(--primary)));
    --tint-contrast: hsl(var(--primary-foreground));
    --secondary: 240 24% 96%;         /* iOS "gray button" fill, NOT cyan */
    --secondary-foreground: 0 0% 0%;
    --link: var(--primary);           /* chrome links ride the tint now */
    --link-hover: var(--primary);

    /* ── iOS system semantics ── */
    --destructive: 359 100% 61%;      /* #FF383C */
    --destructive-foreground: 0 0% 100%;
    --success: 135 59% 49%;           /* #34C759 */
    --success-foreground: 0 0% 100%;
    --warning: 48 100% 50%;           /* #FFCC00 */
    --warning-foreground: 0 0% 0%;
    --info: 212 100% 50%;             /* #0088FF */
    --info-foreground: 0 0% 100%;
```

Delete the oatmeal/canvas comment block, `--hover-accent`, and the three `--gradient-*` tokens. Keep: `--brand-blue-*`, `--brand-gold`, `--brand-navy*` (marketing surfaces), messenger tokens, `--status-warning-*`, event tokens (next step), `--app-header-offset`.

- [ ] **Step 2: Remap the 12 event-chip pairs** (same `:root` block) to iOS pastel-bg/dark-text, keeping the exact token names:

```css
    /* Event chips — iOS Calendar-style pastels (fixed semantics) */
    --event-performance: 212 100% 93%;    --event-performance-fg: 212 100% 30%;   /* blue */
    --event-rehearsal: 135 59% 92%;       --event-rehearsal-fg: 135 70% 22%;      /* green */
    --event-sectional: 293 74% 94%;       --event-sectional-fg: 293 74% 30%;      /* purple */
    --event-service: 243 70% 94%;         --event-service-fg: 243 60% 35%;        /* indigo */
    --event-meeting: 30 100% 92%;         --event-meeting-fg: 25 100% 30%;        /* orange */
    --event-member-meeting: 135 59% 92%;  --event-member-meeting-fg: 135 70% 22%;
    --event-exec-meeting: 293 74% 94%;    --event-exec-meeting-fg: 293 74% 30%;
    --event-voice-lesson: 348 100% 94%;   --event-voice-lesson-fg: 348 87% 33%;   /* pink */
    --event-tutorial: 191 100% 92%;       --event-tutorial-fg: 195 100% 27%;      /* cyan */
    --event-social: 168 100% 90%;         --event-social-fg: 172 100% 22%;        /* mint */
    --event-workshop: 187 100% 91%;       --event-workshop-fg: 187 100% 24%;      /* teal */
    --event-audition: 48 100% 89%;        --event-audition-fg: 39 100% 25%;       /* yellow */
    --event-general: 240 4% 94%;          --event-general-fg: 240 2% 30%;         /* gray */
```

- [ ] **Step 3: Rewrite `.dark` (~line 649) as real iOS dark** (it is currently a no-op light copy):

```css
  .dark {
    /* iOS 26 dark palette — Stage rooms (Studio, Tonight mode). */
    --background: 0 0% 0%;
    --foreground: 0 0% 100%;
    --card: 240 2% 11%;               /* #1C1C1E */
    --card-foreground: 0 0% 100%;
    --popover: 240 2% 11%;
    --popover-foreground: 0 0% 100%;
    --muted: 240 2% 16%;              /* #2C2C2E */
    --muted-foreground: 240 5% 64%;   /* #9E9EA7 ≈ secondaryLabel dark flattened */
    --accent: 240 2% 16%;
    --accent-foreground: 0 0% 100%;
    --border: 240 1% 27%;             /* #444446 ≈ dark separator flattened */
    --input: 240 2% 11%;
    --primary: 294 88% 58%;           /* #DB34F2 iOS purple (dark variant) */
    --primary-foreground: 0 0% 100%;
    --secondary: 240 2% 16%;
    --secondary-foreground: 0 0% 100%;
    --ring: var(--primary);
    --text-primary: 0 0% 100%;
    --text-secondary: 240 5% 64%;
    --text-metadata: 240 5% 64%;
    --destructive: 359 100% 63%;      /* #FF4245 */
    --destructive-foreground: 0 0% 100%;
    --success: 135 63% 50%;           /* #30D158 */
    --warning: 50 100% 50%;           /* #FFD600 */
    --info: 206 100% 50%;             /* #0091FF */
    --gray-4: 240 3% 23%;             /* #3A3A3C — button secondary hover */
    --gray-5: 240 2% 16%;             /* #2C2C2E */
    --gray-6: 240 2% 11%;             /* #1C1C1E */
  }
```

- [ ] **Step 4: Verify**

Run: `bash scripts/check-design-tokens.sh`
Expected: "oatmeal canvas" and "iOS systemGray6 canvas" and "tint token" now pass.
Run: `npx vite build 2>&1 | tail -3` → `✓ built`.
Then `npx vite preview --port 4173 &`, open `http://localhost:4173` and confirm: gray canvas, white cards, purple accents, no cyan `--secondary` buttons anywhere obvious.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat(design): iOS 26 color tokens — light House, dark Stage, tint model"
```

---

### Task 4: Geometry — radius, depth, press feedback

**Files:**
- Modify: `src/index.css` (grain overlay ~line 112, press effect ~line 126, shadow tokens in `:root`)
- Modify: `tailwind.config.ts` (borderRadius block, lines 107–120; add boxShadow)

**Interfaces:**
- Produces: `--radius: 0.75rem`; Tailwind `rounded-xl/2xl/3xl` restored to 12/16/24px; `shadow-card` utility.

- [ ] **Step 1:** In `src/index.css` `:root`, change `--radius: 0rem;` → `--radius: 0.75rem;` and replace the eight `--shadow-*` tokens with:

```css
    /* iOS depth: white-card-on-gray-canvas IS the elevation. One whisper. */
    --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06);
```

Keep `--transition-smooth`; delete `--transition-bounce`.

- [ ] **Step 2:** Delete the film-grain block (`body::before { … feTurbulence … }`, ~lines 107–121 including its comment).

- [ ] **Step 3:** Replace the press effect (~line 131):

```css
  /* iOS press feedback: plain controls dim, surfaces compress. */
  button:active:not(:disabled), [role="button"]:active:not(:disabled) {
    opacity: 0.6;
  }
```

- [ ] **Step 4:** In `tailwind.config.ts`, delete the three flatten lines (`xl: '0px'`, `'2xl': '0px'`, `'3xl': '0px'`) and their comment — Tailwind defaults (12/16/24px) return. Add below `borderRadius`:

```ts
      boxShadow: {
        card: 'var(--shadow-card)',
      },
```

Note: `shadow-button`, `shadow-glass`, `shadow-elevated` utility classes referenced in components resolve to nothing once the tokens are gone only if they were Tailwind-arbitrary; they are plain Tailwind lookups — since they were never registered in `tailwind.config.ts`, they were already no-ops. No action needed.

- [ ] **Step 5: Verify + commit**

Run: `bash scripts/check-design-tokens.sh` → grain, press-effect, flattened-radius checks pass (button/card `rounded-none` still FAIL — Tasks 5–6).
Run: `npx vite build 2>&1 | tail -3` → `✓ built`.

```bash
git add src/index.css tailwind.config.ts
git commit -m "feat(design): iOS geometry — 12px radius, single card shadow, opacity press"
```

---

### Task 5: Button — iOS variants

**Files:**
- Modify: `src/components/ui/button.tsx`

**Interfaces:**
- Consumes: `var(--tint)`, `--tint-contrast` (Task 3), Tailwind `text-base`=17px (Task 2).
- Produces: same exported names (`Button`, `buttonVariants`, `ButtonProps`) and same variant/size KEYS (no call-site churn). Visual mapping: `default`=iOS filled capsule, `secondary`=iOS gray, `ghost`/`link`=iOS plain, `outline`=bordered capsule.

- [ ] **Step 1: Replace the cva definition** (lines 7–60) with:

```ts
const buttonVariants = cva(
  // iOS base: capsule, 17px, weight carries emphasis, opacity press.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation select-none active:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--tint)] text-[var(--tint-contrast)] hover:opacity-90",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border border-border bg-card text-foreground hover:bg-muted",
        secondary:
          "bg-[hsl(var(--gray-5))] text-[var(--tint)] hover:bg-[hsl(var(--gray-4))]",
        ghost:
          "font-normal text-[var(--tint)] hover:bg-muted",
        link:
          "font-normal text-[var(--tint)] underline-offset-4 hover:underline",
        glass:
          "backdrop-blur-xl bg-card/75 border border-border/40 text-foreground",
        "glass-solid":
          "backdrop-blur-xl bg-card/95 border border-border text-foreground",
        branded:
          "bg-[var(--tint)] text-[var(--tint-contrast)] hover:opacity-90",
        navy:
          "bg-[hsl(var(--brand-navy))] text-[hsl(var(--brand-navy-foreground))] hover:bg-[hsl(var(--brand-navy-hover))]",
        success:
          "bg-success text-success-foreground hover:opacity-90",
        warning:
          "bg-warning text-warning-foreground hover:opacity-90",
      },
      // 44pt HIG floor on touch; lg: desktop may compact to 40.
      size: {
        default: "h-11 px-5 min-h-[44px] lg:h-10 lg:min-h-[40px]",
        sm: "h-9 px-4 text-sm min-h-[44px] lg:min-h-[36px]",
        lg: "h-12 px-6 min-h-[48px]",
        xl: "h-[52px] px-8 min-h-[52px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] lg:h-10 lg:w-10 lg:min-h-[40px] lg:min-w-[40px]",
        "icon-sm": "h-9 w-9 min-h-[44px] min-w-[44px] lg:min-h-[36px] lg:min-w-[36px]",
        "icon-lg": "h-12 w-12 min-h-[48px] min-w-[48px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

Everything else in the file (imports, `Button` component, exports) is unchanged.

- [ ] **Step 2: Verify + commit**

Run: `bash scripts/check-design-tokens.sh` → "square buttons" passes.
Run: `npx vite build 2>&1 | tail -3` → `✓ built`. Spot-check in preview: primary CTAs are tint capsules; secondary buttons gray with tint text.

```bash
git add src/components/ui/button.tsx
git commit -m "feat(design): iOS button variants — filled capsule, gray, plain"
```

---

### Task 6: Card + floating glass tab bar

**Files:**
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/navigation/MobileBottomNav.tsx`

**Interfaces:**
- Consumes: `shadow-card` (Task 4), `--tint` (Task 3), `text-2xs` (Task 2).
- Produces: unchanged exports for both files (`Card` variants keep their keys; `MobileBottomNav` keeps its props).

- [ ] **Step 1: Card base** — in `card.tsx`, replace the `variants` map and base classes:

```ts
  // iOS cards: white on gray canvas, 12px continuous-feel corners,
  // whisper shadow. No border on the default surface — contrast + radius
  // carry the elevation (HIG grouped-inset pattern).
  const variants = {
    default: "bg-card shadow-card",
    glass: "bg-card/75 backdrop-blur-xl border border-border/40",
    elevated: "bg-card shadow-card",
    outline: "bg-transparent border border-border",
    glossy: "bg-card shadow-card",
    muted: "bg-muted",
  }
```

and in the wrapper div change `"rounded-none text-card-foreground …"` → `"rounded-xl text-card-foreground transition-colors duration-150 relative overflow-hidden"`.

- [ ] **Step 2: CardHeader/CardTitle/CardContent paddings + title** — 16pt grid + headline title:

- `CardHeader`: `"flex flex-col space-y-1 p-4"` (drop the `sm:` split; 16pt everywhere)
- `CardTitle`: `"font-headline text-card-foreground"` (17px semibold from Task 2's utility)
- `CardDescription`: `"text-sm text-muted-foreground"` (15px subhead)
- `CardContent`: `"p-4 pt-0"`
- `CardFooter`: `"flex items-center p-4 pt-0 gap-2"`

- [ ] **Step 3: Tab bar** — in `MobileBottomNav.tsx`, replace the `<nav>` element (lines 64–80) and the item classes (lines 93–96):

```tsx
  return createPortal(
    <nav
      className={cn(
        // iOS floating pill: inset from edges, glass, capsule.
        "fixed left-4 right-4 z-30 rounded-full",
        "backdrop-blur-xl bg-card/75 supports-[not(backdrop-filter:blur(0))]:bg-card",
        "shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-border/40",
        "pointer-events-auto",
        className
      )}
      style={{
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        transform: 'translateZ(0)', // keep the WKWebView compositing fix
      }}
    >
      <div className="flex items-stretch w-full" style={{ minHeight: 56 }}>
```

Item button className:

```tsx
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[48px] first:rounded-l-full last:rounded-r-full',
                active ? 'text-[var(--tint)] font-semibold' : 'text-muted-foreground',
              )}
```

and the label span: `className="text-2xs leading-none"` (11px — Apple tab-label size; the one place 11px is allowed).

Remove `border-t border-border shadow-2xl bg-background` and the inner `bg-background` — the glass classes replace them. The `paddingBottom: 'max(12px, env(safe-area-inset-bottom))'` style on `<nav>` is removed (the bar now floats above the safe area via `bottom`).

- [ ] **Step 4: Verify + commit**

Run: `bash scripts/check-design-tokens.sh` → ALL checks pass, exit 0.
Run: `npx vite build 2>&1 | tail -3` → `✓ built`.
Preview at 390px width (Chrome device toolbar): floating pill tab bar inset from edges/bottom, content scrolls behind it, active tab in tint.

```bash
git add src/components/ui/card.tsx src/components/navigation/MobileBottomNav.tsx
git commit -m "feat(design): iOS cards + floating glass tab bar"
```

---

### Task 7: Full verification + push + PR

**Files:** none new.

- [ ] **Step 1: Guard + build**

```bash
bash scripts/check-design-tokens.sh && npx vite build
```
Expected: exit 0, `✓ built`.

- [ ] **Step 2: Visual smoke on preview** — `npx vite preview --port 4173`, then check at 390px and 1280px:
1. `/` (landing) — hero still branded (gradients allowed there), no Bebas in chrome
2. `/dashboard` — gray canvas, white 12px cards, 34px page title, floating tab bar (390px only)
3. Calendar — event chips in iOS pastels, legible
4. Any Studio route with `.dark` scope — black canvas, `#1C1C1E` cards, bright-variant tint
5. Forms — inputs white, ≥16px text, no iOS-Safari zoom on focus (test on real iPhone if available)

- [ ] **Step 3: Contrast spot-check** — verify the default purple tint on white with webaim.org/resources/contrastchecker (`#CB30E0` on `#FFFFFF` ≈ 4.6:1 — passes AA for the 17px-semibold/large text it's used on). Log any tenant whose `--site-accent` fails 4.5:1 for Phase 3 remediation (gold tints expected to fail → darkened text variant per spec).

- [ ] **Step 4: Push + PR**

```bash
git push -u origin apple-design-phase0
gh pr create --title "Apple iOS design system — Phase 0 token big bang" --body "$(cat <<'EOF'
Implements Phase 0 of docs/superpowers/specs/2026-07-06-apple-ios-design-system-design.md:
- System font stack (SF Pro on Apple devices) + Apple HIG type scale (34pt large titles replace 88px display headlines)
- iOS 26 color tokens: #F2F2F7 canvas, white cards, tint model (--tint = tenant --site-accent → --primary), real iOS dark palette for Stage rooms
- 12px radius restored, film grain + brutalist press removed, single card shadow
- iOS button variants (filled capsule / gray / plain), iOS cards, floating glass tab bar
- scripts/check-design-tokens.sh regression guard

Google Fonts link intentionally retained (landing-page builder fonts). Phases 1–3 (audit sweep, surface passes, tenant contrast remediation) follow in separate plans.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed. Do NOT merge or deploy — deploy only after review, and never rsync with `--delete`.
