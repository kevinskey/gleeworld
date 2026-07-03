---
name: gleeworld-design
description: GleeWorld's design system, theming rules, and UI conventions. Use this skill whenever building, editing, or reviewing ANY user-facing UI in the GleeWorld codebase — pages, components, modals, emails, dashboards, the Concert Planner, Box Office, Glee Academy, landing page builder blocks, or admin screens. Also use when the task mentions colors, fonts, themes, tenant branding, CSS, or "make it look better," even if the word "design" never appears.
---

# GleeWorld Design System

GleeWorld is a multi-tenant SaaS platform for performing group management (React 18 + Vite + Tailwind + shadcn/ui, ~50 tenants). The single most important design constraint: every tenant can customize colors and fonts, so UI must be built against theme tokens, never against literal values.

## Rule 1: Tokens, never hardcoded values

All colors come from HSL-triplet CSS custom properties consumed as `hsl(var(--x))` and exposed as Tailwind semantic classes (`bg-primary`, `text-muted-foreground`, `border-border`, …). Never write a hex code, a raw Tailwind palette color (`bg-sky-600`, `bg-slate-800`, `text-blue-500`), or a font-family directly into component styles.

### What tenants actually customize (the "Theme Studio" surface)

Tenants set — via the public-site builder theme (`themeSchema` in `src/components/public-site/types.ts`) and branding settings (`gw_branding_settings`):

- `primaryColor` (hex, default `#0f172a`)
- `accentColor` (hex, default `#9333ea`)
- `fontFamily` (a key into the curated `FONT_OPTIONS` list in `types.ts` — 17 stacks from system sans to Great Vibes; resolve with `fontStack()`)
- `letterSpacing` (em, −0.05 to 0.3, public site only)
- logo (`logo_url` / branding settings)

At runtime `src/components/theme/TenantThemeRoot.tsx` (mounted once at App level) writes onto `<html>`:

```
--site-primary   /* raw tenant hex — used by public-site blocks via var(--site-primary, fallback) */
--site-accent    /* raw tenant hex — same */
--primary, --accent, --ring          /* shadcn tokens re-routed to the tenant accent (HSL triplets) */
--primary-foreground, --accent-foreground  /* auto-derived by YIQ so contrast is guaranteed */
```

and tags `<body>` with `.gw-tenant-themed`.

### The semantic token set (defined in `src/index.css` `:root`, mapped in `tailwind.config.ts`)

```
--background / --foreground        /* warm oatmeal canvas #FAF7F1 / near-black text */
--card / --card-foreground         /* paper-white cards — the unified LIGHT surface system */
--popover / --popover-foreground
--muted / --muted-foreground
--primary / --primary-foreground   /* tenant-routed brand color — buttons, active states */
--secondary / --secondary-foreground
--accent / --accent-foreground     /* tenant-routed */
--destructive / --destructive-foreground
--border, --input, --ring
--link / --link-hover              /* tenant-NEUTRAL indigo chrome links, "View all" affordances */
--text-primary / --text-secondary / --text-metadata   /* tiered text */
--brand-navy / --brand-navy-hover / --brand-navy-foreground  /* landing/header CTA */
--event-performance/-rehearsal/-sectional/-meeting/-voice-lesson (+ -fg pairs)
--sidebar-* family, --brand-50…900 scale
```

If a design needs a color that has no token, derive it from an existing token (opacity modifier like `bg-primary/90`, or `color-mix()`) or propose a new token in `src/index.css` — do not invent a one-off value.

Test for every component: would this still look correct if a tenant picked navy/gold with a serif display face? If the answer depends on the specific colors, the component is wrong.

## Rule 2: Fixed system values (NOT tenant-customizable)

Spacing, radii, shadows, and breakpoints are consistent across all tenants.

```
/* Spacing: Tailwind's default 4px scale — p-1=4px, p-2=8px, p-3=12px,
   p-4=16px, p-6=24px, p-8=32px, p-12=48px. There is no custom spacing
   token set; never use arbitrary values like p-[13px]. */

/* Radii: SQUARE CORNERS by design ("tactile-brutalism"). */
--radius: 0rem;            /* rounded-sm/md/lg all cascade to 0 */
/* rounded-xl / 2xl / 3xl are flattened to 0px in tailwind.config.ts.
   rounded-full is the ONLY exception — pills, avatars, dot badges. */

/* Shadows: use the tokens from src/index.css */
--shadow-card:    0 4px 20px rgba(0,0,0,0.08);
--shadow-hover:   0 8px 30px rgba(0,0,0,0.12);
--shadow-focus:   0 0 0 3px rgba(59,130,246,0.1);
--shadow-depth-1 / -2 / -3, --shadow-inset, --shadow-glow

/* Breakpoints: Tailwind defaults — sm 640, md 768, lg 1024, xl 1280,
   2xl 1536; container is centered with 2rem padding, max 1400px.
   md (768–1023) is iPad = a TOUCH device: keep full 44pt touch targets
   through md; compact/dense desktop sizing starts at lg:. */
```

Type floor: `text-xs` is the minimum size anywhere. Studio/DAW chrome uses the site-wide sizing standard — `text-xs`/`text-sm` with icons at least `w-4 h-4`; never sub-12px text.

## Rule 3: Component conventions

All primitives are shadcn/ui in `src/components/ui/` — use them, never hand-roll.

- **Buttons** (`ui/button.tsx`, cva variants): `default` (solid `bg-primary` + `text-primary-foreground`), `secondary`, `outline`, `ghost`, `link`, `destructive`, plus `glass`, `glass-solid`, `branded`, `navy` (landing CTA via `--brand-navy` vars), `success`, `warning`. Base is `rounded-none`, `text-sm`, focus-visible ring. Destructive actions always confirm via `ui/alert-dialog.tsx`. Labels say what happens: "Save program," not "Submit."
- **Cards** (`ui/card.tsx`): `bg-card` (white) on the cream `--background`, `--shadow-card`. The one-step light-on-cream contrast IS the elevation. Never dark-navy card surfaces — the unified light theme (2026-06-09) exists because dark cards made page-level text tokens unreadable.
- **Forms** (`ui/form.tsx`, react-hook-form + `FormLabel`): labels above inputs, never placeholder-as-label. Inline validation messages below the field (`FormMessage`).
- **Tables** (`ui/table.tsx`): rosters, orders, repertoire. Row actions on the right; empty states tell the user what to do next, not just "No data."
- **Modals** (`ui/dialog.tsx`; `ui/sheet.tsx`/`ui/drawer.tsx` for slide-in panels): focused single tasks (confirm, quick-create). Multi-step flows get their own page.

## Rule 4: Where UI lives in this codebase

- shadcn primitives: `src/components/ui/`
- Shared feature components: `src/components/<domain>/` (`layout/`, `dashboard/`, `theme/`, …)
- Pages: `src/pages/`; feature modules: `src/modules/`
- Landing-page builder blocks: `src/components/public-site/blocks/` (rendered by `PublicSiteView.tsx`; blocks consume `--site-primary`/`--site-accent` with fallbacks)
- Theme token definitions: `src/index.css` (`:root` block ~line 187) + the `hsl(var(--x))` mapping in `tailwind.config.ts`
- Runtime token writers, in load order: `src/contexts/ThemeContext.tsx` (applies the hardcoded GW_TOKENS light theme on mount) → `src/components/theme/TenantThemeRoot.tsx` (tenant overrides)
- Tenant theme schema + curated fonts: `src/components/public-site/types.ts` (`themeSchema`, `FONT_OPTIONS`, `fontStack()`)
- Legacy compatibility layer: `src/styles/tenant-theme.css` (`body.gw-tenant-themed` retargets hardcoded Tailwind colors in legacy modules). Do NOT add new rules here — refactor the module to semantic tokens instead; each refactor lets an override be deleted.

Never restyle inside a single page/module if a shared component exists — fix the shared component.

## Rule 5: Voice and copy

GleeWorld's users are directors, administrators, and performers — often music educators, not tech people. Copy is warm, plain, and specific.

- Sentence case everywhere ("Add a concert," not "Add A Concert")
- Name things by what users recognize: "program," "roster," "season" — never internal jargon like "tenant entity" in user-facing text
- Say **"students"** (not "singers" or "members") in pricing and marketing copy; say **"graduates"** (never "alumnae"/"alumni") everywhere
- Tenant-neutral always: this is a 50-client platform. Never hardcode a tenant name (e.g., "Spelman") in user-visible code, copy, or meta tags
- Errors explain what went wrong and how to fix it; empty states invite the next action

## Rule 6: Quality floor (every screen, no exceptions)

- Responsive down to 375px — directors use this on phones backstage; test at 390px
- Visible keyboard focus states (`focus-visible:ring-2 ring-ring` is baked into the primitives); all interactive elements reachable by tab
- Color contrast meets WCAG AA for every possible tenant theme — `TenantThemeRoot` auto-derives `--primary-foreground`/`--accent-foreground` by YIQ, so never pair a hardcoded text color with a tenant-routed background
- `prefers-reduced-motion` respected on any animation (index.css already does this — keep it true for new animation)
- Printable views (concert programs especially) get a real print stylesheet
- 44pt minimum touch targets on sm/md; density only at lg+

## Anti-patterns — never do these

- Hardcoded hex colors, raw Tailwind palette colors (`bg-sky-600`, `bg-slate-800`, `text-blue-500`), or font names in component styles
- One-off spacing values outside the 4px scale (`margin: 13px`, `p-[13px]`)
- Rounded corners on containers (`rounded-lg` renders square anyway; adding `rounded-xl` signals you're fighting the system) — only `rounded-full` pills
- Dark-navy card surfaces or any styling that only works with the default theme
- Placeholder text as the only field label
- Sub-12px text or sub-`w-4` icons, especially in Studio/DAW chrome
- Adding new rules to `src/styles/tenant-theme.css` instead of fixing the module
- New UI patterns when an existing `src/components/ui/` component already solves it
