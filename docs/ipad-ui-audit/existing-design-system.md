# GleeWorld — Existing Design System

_Baseline documentation before iPad corrections. Preserve this identity._

## Tokens

### Color

* HSL triplets exposed on `:root` in `src/index.css`. Tenants override `--primary`, `--primary-foreground`, `--ring`, `--accent`, `--accent-foreground` via `UniversalLayout` style prop (see `UniversalLayout.tsx:149-156`).
* Semantic tokens: `--background`, `--foreground`, `--muted`, `--muted-foreground`, `--card`, `--card-foreground`, `--border`, `--input`, `--destructive`, `--success`, `--warning`.
* Button variants add: `--tint`, `--tint-contrast` (`button.tsx:14`), `hsl(var(--gray-4))` / `hsl(var(--gray-5))` (`button.tsx:20`), `hsl(var(--brand-navy))` (`button.tsx:31`).
* Site theming from Supabase: `get_tenant_public_site` RPC returns `theme.primaryColor` / `theme.accentColor`, converted by `hexToHslTriplet()` and injected as CSS variables.

### Typography

Body ships iOS SF-style stack, 17px base at rest. Component-level type is Tailwind (`text-sm` = 14px, `text-base` = 16px, `text-lg` = 18px, `text-xl` = 20px). Custom sizes at `text-[11px]`/`text-[13px]`/`text-[22px]` in the shell brand block and nav.

### Spacing

Tailwind default 4px grid. Container widths capped at `max-w-7xl` in `PageContainer`. Sidebar widths: `w-56` (224px) at `md`, `w-64` (256px) at `lg`.

### Breakpoints

Standard Tailwind:

| Breakpoint | Min width | Meaning in GleeWorld |
|---|---:|---|
| `sm` | 640px | Show desktop search input, hide phone bottom nav |
| `md` | 768px | **iPad threshold**: show sidebar, topbar becomes 80px tall |
| `lg` | 1024px | Sidebar widens to 256px |
| `xl` | 1280px | No layout-shape changes |
| `2xl` | 1536px | No layout-shape changes |

No custom `tablet` / `ipad` breakpoint. The single `md:` transition drives the phone→tablet layout hop.

### Z-Index

Scattered `z-30`, `z-40`, `z-50`, `z-[100]`, `z-[99998]`, `z-[200001]`. No centralized token file. Notable:

* Toast viewport: `z-[100]` (`toast.tsx:17`)
* Dialog overlay + content: `z-50`
* Sheet overlay + content: `z-50`
* DashboardShell TopBar: `z-30`
* PointOfSale bottom bar: `z-[99998]` (defensive)
* AdminOfficeHoursDashboard: `z-[200001]` (excessive)

### Radii, shadows, animation

* Radii: mostly `rounded-md` (6px), `rounded-lg` (8px), `rounded-full` for buttons. Sidebar section cards `rounded-lg`.
* Shadows: `shadow-sm`, `shadow-lg`, `shadow-2xl` (POS bar).
* Animation: Radix `data-[state=*]` + `animate-in` / `animate-out`. 200-300ms defaults. No Framer Motion.

### Dark mode

Class-based (`.dark` on `<html>`). No `prefers-color-scheme` media-query fallback (system dark mode does not auto-apply). Managed by `ThemeProvider`.

## Layout Shells

### `UniversalLayout` (`src/components/layout/UniversalLayout.tsx`, 181 lines)

* Idempotent (context guard against nested wrapping).
* Public/marketing routes → `PublicHeader`.
* Tenant subdomains → auto-swap to `DashboardShell` when `showHeader` is on.
* Injects tenant theme as CSS variables on outer `<div>`.
* `<main>` clears the header via `pt-[calc(var(--gw-header-h,4rem)+var(--gw-radio-bar-height,0px))]`.
* Bottom padding reserves the phone bottom-nav: `pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-[env(safe-area-inset-bottom,0px)]`.
* Left/right safe-area applied inline via `env(safe-area-inset-left|right)`.

### `DashboardShell` (`src/components/dashboard/DashboardShell.tsx`, 1,069 lines)

* Idempotent context guard.
* Outer flex container: **`h-screen w-full bg-background overflow-hidden`** (`:1034`). Uses `100vh` — this is the correct choice on Capacitor WKWebView with `overlaysWebView: true`, but on **iPad Safari** the dynamic browser chrome makes this over-flow slightly. `100dvh` would be more robust on the web build without breaking native.
* Sidebar: `hidden md:flex flex-col w-56 lg:w-64 shrink-0 bg-card self-stretch min-h-screen` (`:368`).
* Sidebar suppressed on `/studio/sessions/:id` and `/dashboard/viewer/:scoreId`.
* Nav collapse persisted in `localStorage.gw_sidebar_collapsed`.
* TopBar: sticky, `z-30`, `min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] md:min-h-[calc(5rem+env(safe-area-inset-top,0px))]` (`:725`). Safe-area aware.
* Mobile menu trigger: `md:hidden w-11 h-11 rounded-full` (44px touch target good) (`:737`).
* Search form: `hidden sm:block w-full max-w-md` (`:814`). Phone-only search opens a sheet via the icon trigger (`sm:hidden`).
* Main content: `flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden` (`:1049`).
* Assistant FAB and Sheet mount globally inside the shell.

### `UniversalHeader` (`src/components/layout/UniversalHeader.tsx`, 587 lines)

Marketing-domain topbar used on public routes only. `env(safe-area-inset-top)` respected.

### `AcademyShell`

Nested inside `UniversalLayout`; provides secondary academy-scoped nav. Same 44px+ touch target discipline as DashboardShell.

### `MobileBottomNav` (`src/components/navigation/MobileBottomNav.tsx`)

* Self-gates via `useIsPhone()` — returns `null` above `sm` breakpoint.
* Safe-area padding: `paddingBottom: 'env(safe-area-inset-bottom)'`.

## UI Primitives (`src/components/ui/*`)

### Button (`button.tsx`)

* **44px HIG floor enforced app-wide**: `default`/`sm`/`icon` variants all include `min-h-[44px]` (with `min-w-[44px]` on icon variants). Desktop-only compaction to 40px via `lg:` overrides.
* Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `glass`, `glass-solid`, `branded`, `navy`, `success`, `warning`.
* Uses `touch-manipulation select-none active:opacity-60` — touch-optimized.
* This primitive is **safe**. Problems appear when consumers write raw `<button className="h-6 w-6">` instead of `<Button size="icon-sm">`.

### Dialog (`dialog.tsx`)

* Max width fixed at `max-w-lg` (512px) at all breakpoints (`:20`). **Wastes iPad landscape space; needs `lg:max-w-2xl` optionality.**
* Height cap `max-h-[85vh] overflow-y-auto` — good.
* Positioned `top-[10%]` on mobile, centered `sm:top-[50%]` on tablet+.
* Close button `h-8 w-8` at `right-3 top-3` — below 44px. iPad-borderline.
* Overlay `bg-black/40`.
* Contains a giant CSS reset scoped inside dialogs to enforce white surfaces for legibility. Preserve when editing.

### Sheet (`sheet.tsx`)

* Sides: top/bottom/left/right.
* Left/right sheets: `w-[85vw] max-w-sm` (384px cap). **Too narrow on iPad — will feel like a phone drawer on a 1024px screen.** Needs `sm:max-w-md md:max-w-lg` optionality.
* Top/bottom sheets: `max-h-[85vh]`.
* Close button is safe-area aware for full-height sheets: `top-[calc(env(safe-area-inset-top,0px)+0.75rem)]` (`:81`). Good.
* Close button is `h-10 w-10 sm:h-8 sm:w-8` — **the mobile size is 40px** (borderline; iOS HIG is 44).

### Toast (`toast.tsx`)

* Viewport: `fixed bottom-0 z-[100] flex max-h-screen w-full flex-col p-4 pb-20 sm:right-0 sm:flex-col md:max-w-[420px]` (`:17`).
* **Two problems**: `pb-20` is hardcoded (not safe-area aware — home indicator overlap on iPad landscape). `max-h-screen` should be `max-h-[100dvh]`.
* Close button: `opacity-0 ... focus:opacity-100 ... group-hover:opacity-100` (`:78`). Focus fallback exists (keyboard-accessible) but **touch users never trigger hover — the close button is invisible on iPad and iPhone until focus**. Should be `opacity-70` at rest.

### Table (`table.tsx`)

* Wrapper: `<div className="relative w-full overflow-auto -mx-4 px-4">`. Good — establishes controlled horizontal scroll, negative margin bleeds table edges. Consumers still need to size cells.

### DropdownMenu / Popover / Select

Radix defaults with theme tokens. Radix positions inside viewport by default; no custom overrides seen that would push popovers off-screen.

### Tabs

Radix tabs. iPad-fine.

### Tooltip

Pointer-only by nature. iPad users rely on adjacent labels; verify all tooltip-only labels have visible text alternatives (spot-checked; mostly OK).

## iPad / Mobile Detection Hooks

* `useIsMobile()` (< 768px)
* `useIsPhone()` (< 640px) — used by `MobileBottomNav`
* Ad-hoc `matchMedia`, `window.innerWidth` in ~15 components
* Capacitor: `Capacitor.isNativePlatform()`, `Capacitor.getPlatform() === 'ios'`

No dedicated `useIsTablet()` or `useIsIpad()` hook. The audit does not add one — every layout branch that needs iPad-specific behavior can use `md:` / `lg:` Tailwind utilities.

## Studio Module

`src/pages/studio/` + `src/lib/studio/` + native plugins under `ios/App/App/`.

* Immersive: DashboardShell hides sidebar on `/studio/sessions/:id`.
* Timeline row height: 100px on coarse pointer, 72px on desktop.
* Capacitor plugins for native audio: `StudioEnginePlugin.swift`, `GWMidiPlugin.swift`, `RecordingLiveActivity`.
* **React controls do not own audio state.** Native engine is the authority. **Do not touch.**
* Transport, mixer, meters, waveform, effects all live in React under `src/pages/studio/` and delegate to the native engine via `@capacitor/core` bridges.

## Safe-Area Handling — status

**Correctly handled**:

* `UniversalLayout` main padding
* `DashboardShell` sidebar / topbar
* `MobileBottomNav`
* `PartTracksStudio`
* `MobilePDFViewer`
* Sheet close button (full-height sides)
* `DirectMessaging` (`pb-safe`)

**Missing safe-area** (needs fixes):

* Toast viewport (`pb-20` hardcoded)
* GlobalMusicPlayer fixed bottom bar
* PointOfSale fixed bottom bar
* AuditionPage phone submit bar
* AttendanceMobileCards sticky bar

## Preserved GleeWorld identity

* Rounded, iOS-flavored button primitive (`rounded-full`, `text-base font-semibold`)
* Tenant-tinted primary color threaded through CSS variables
* Cream-tinted admin shell background (`hsl(40, 10%, 96%)` mixed with tenant primary)
* Muted section cards in sidebar for hierarchy anchoring
* SF-flavored typography and 17px iOS body baseline
* Section labels black uppercase tracking

**All corrections in this audit preserve these choices.** Nothing below imports a foreign design system, replaces Radix, or rebrands.
