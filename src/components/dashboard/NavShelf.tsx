// NavShelf — the flat member-chosen navigation shelf.
//
//   Home                  always first, never consumes a slot
//   <the member's tools>  their My Tools set, in their order, however long
//   ─────────
//   All Tools             opens the searchable AllToolsSheet
//   Setup                 opens /dashboard/my-world
//
// The shelf renders exactly what the member chose — it does NOT truncate.
// 8 is the size they START at, not a ceiling; see MY_TOOLS_SANITY_MAX in
// myTools.ts for why the hard cap went away. Both of this component's
// callers (DashboardShell's Sidebar and MobileNav) put it inside a
// `flex-1 overflow-y-auto` <nav>, so a long shelf scrolls within the
// sidebar/drawer rather than growing the page.
//
// No sections on the shelf, no accordions, no drag reorder: arranging is a
// Phase 2 task performed on /dashboard/my-world, not a gesture performed on
// the live nav. Phase 1 shipped an in-shelf disclosure of every remaining
// destination as a bridge; Phase 3 retires it — All Tools now opens the
// searchable AllToolsSheet (owned by DashboardShell) instead of expanding
// in place, so this component no longer takes a `sections` prop or renders
// any disclosure of its own.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.2, §5.3
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Settings } from 'lucide-react';
import type { CatalogEntry } from '@/lib/navigation/navCatalog';

// Not a NAV_CATALOG entry — Setup is a row the shelf always offers on its
// own, not a gated destination a member picks. Row only reads
// icon/to/end/tourId/label off its `entry` prop, so a hand-built
// CatalogEntry-shaped constant is enough; section/tone are unused here but
// required by the type.
// `key` is safe to rename: it is not a NAV_CATALOG key and cannot reach a
// stored MyTools.tools list. SETUP_ENTRY is module-private (never exported),
// is only ever passed to <Row> for rendering, and every write path takes its
// keys from the gated catalog instead — MyWorldEditor's ⊕ reads `available`
// (resolveNav output), AllToolsSheet's ⊕ reads `available` too, and
// useMyTools.pinTool appends only what it is handed. Nothing here flows into
// onToolsChange/pinTool/saveTools.
const SETUP_ENTRY: CatalogEntry = {
  key: 'my-world-setup',
  to: '/dashboard/my-world',
  label: 'Setup',
  icon: Settings,
  section: 'today',
  tone: 'bg-muted text-muted-foreground',
  tourId: 'nav-my-world-setup',
};

export interface NavShelfProps {
  /**
   * Optional: 'home' has no gate today, but a tenant's hiddenRoutes could
   * still remove it (Workspace Settings → Navigation). Absent means the
   * shelf renders with no Home row rather than the caller blanking the
   * whole nav — a shelf missing one row beats a white screen.
   */
  home?: CatalogEntry;
  tools: CatalogEntry[];
  /** Opens the searchable AllToolsSheet (owned by DashboardShell). */
  onOpenAllTools: () => void;
  variant: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

const ROW_BASE =
  'flex items-center gap-2.5 rounded-md leading-tight transition-colors w-full text-left';
const ROW_DESKTOP = 'px-2 py-2 text-[15px] min-h-[44px]';
const ROW_MOBILE = 'px-2.5 py-2.5 !text-[17px] min-h-[44px]';
const ROW_INACTIVE = 'text-foreground/85 hover:bg-muted hover:text-foreground';
const ROW_ACTIVE = 'bg-primary/10 text-primary font-semibold';

function Row({ entry, variant, onNavigate }: {
  entry: CatalogEntry; variant: 'desktop' | 'mobile'; onNavigate?: () => void;
}) {
  const size = variant === 'desktop' ? ROW_DESKTOP : ROW_MOBILE;
  const icon = variant === 'desktop' ? 'w-[18px] h-[18px]' : 'w-5 h-5';
  return (
    <NavLink
      to={entry.to}
      end={entry.end}
      data-tour={entry.tourId}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${ROW_BASE} ${size} ${isActive ? ROW_ACTIVE : ROW_INACTIVE}`
      }
    >
      <entry.icon className={`${icon} shrink-0 text-slate-500`} aria-hidden />
      <span className="truncate">{entry.label}</span>
    </NavLink>
  );
}

export function NavShelf({ home, tools, onOpenAllTools, variant, onNavigate }: NavShelfProps) {
  // No .slice() here. This used to truncate at 8 (the retired MY_TOOLS_CAP,
  // now split into MY_TOOLS_SEED_SIZE + MY_TOOLS_SANITY_MAX) "so the shelf
  // cannot grow into a list" — but that promise is retired: a member may now
  // keep as many tools as they like, and silently hiding the ones past the
  // eighth would make their own choice invisible with no error to explain it.
  // The only filter left drops Home, which renders separately below.
  const shelf = tools.filter((t) => t.key !== home?.key);

  return (
    <div className="space-y-1">
      <div data-testid="nav-shelf-tools" className="space-y-0.5">
        {home && <Row entry={home} variant={variant} onNavigate={onNavigate} />}
        {shelf.map((t) => (
          <Row key={t.key} entry={t} variant={variant} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="h-px bg-border mx-2 my-2" />

      {/* Always present — opens the searchable AllToolsSheet rather than
          expanding in place. Unlike the retired disclosure, this never
          depends on whether anything is "left over": the sheet holds the
          full catalog regardless of what's already on the shelf. */}
      <button
        type="button"
        data-tour="nav-all-tools-toggle"
        onClick={onOpenAllTools}
        aria-haspopup="dialog"
        className={`${ROW_BASE} ${variant === 'desktop' ? ROW_DESKTOP : ROW_MOBILE} ${ROW_INACTIVE}`}
      >
        <LayoutGrid className={`${variant === 'desktop' ? 'w-[18px] h-[18px]' : 'w-5 h-5'} shrink-0 text-slate-500`} aria-hidden />
        All Tools
      </button>

      {/* Setup — always present, placed after the All Tools row. Reaches
          the personal /dashboard/my-world editor. */}
      <Row entry={SETUP_ENTRY} variant={variant} onNavigate={onNavigate} />
    </div>
  );
}
