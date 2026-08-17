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
// The shelf now has member-named GROUPS. This is not the accordion sidebar
// the recut deleted: that one held all 52 destinations under 10 pre-made
// section headers, and this one holds only what this member pinned, under
// headers they wrote themselves. Ten pre-made sections is an inventory; a
// few member-made groups is a filing system. Keep that distinction — do not
// seed groups from NAV_SECTION_LABELS, and do not offer unpinned tools here.
// All Tools and Cmd-K are how a member reaches everything else.
//
// Arranging still happens on /dashboard/my-world, not by gesture on the live
// nav. The one exception is collapse, which is a reading action, not an
// arranging one, and persists so a member's chosen reading state survives.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.2, §5.3
import { NavLink } from 'react-router-dom';
import { ChevronRight, LayoutGrid, Settings } from 'lucide-react';
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

export interface NavShelfGroup {
  id: string;
  name: string;
  entries: CatalogEntry[];
  collapsed: boolean;
}

export interface NavShelfProps {
  /**
   * Optional: 'home' has no gate today, but a tenant's hiddenRoutes could
   * still remove it (Workspace Settings → Navigation). Absent means the
   * shelf renders with no Home row rather than the caller blanking the
   * whole nav — a shelf missing one row beats a white screen.
   */
  home?: CatalogEntry;
  tools: CatalogEntry[];
  /** Rows pinned at the bottom, above All Tools — Site Setup + Settings
   *  by default (Kevin, 2026-08-12). Already gated by the caller. */
  pinned?: CatalogEntry[];
  /**
   * Member-named groups, already gated and filtered to non-empty by the
   * caller (DashboardShell) — see that file for why the empty-group filter
   * lives there and not here.
   */
  groups: NavShelfGroup[];
  /** Persists a collapse/expand toggle — collapse is a reading action. */
  onToggleGroup: (id: string, collapsed: boolean) => void;
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

export function NavShelf({ home, tools, groups, onToggleGroup, onOpenAllTools, variant, onNavigate, pinned = [] }: NavShelfProps) {
  // No .slice() here. This used to truncate at 8 (the retired MY_TOOLS_CAP,
  // now split into MY_TOOLS_SEED_SIZE + MY_TOOLS_SANITY_MAX) "so the shelf
  // cannot grow into a list" — but that promise is retired: a member may now
  // keep as many tools as they like, and silently hiding the ones past the
  // eighth would make their own choice invisible with no error to explain it.
  // The only filter left drops Home, which renders separately below.
  // Pinned keys render in the bottom band; keep them off the shelf so a
  // member who also picked Settings does not see it twice.
  const pinnedKeys = new Set(pinned.map((p) => p.key));
  const shelf = tools.filter((t) => t.key !== home?.key && !pinnedKeys.has(t.key));

  return (
    <div className="space-y-1">
      <div data-testid="nav-shelf-tools" className="space-y-0.5">
        {home && <Row entry={home} variant={variant} onNavigate={onNavigate} />}
        {shelf.map((t) => (
          <Row key={t.key} entry={t} variant={variant} onNavigate={onNavigate} />
        ))}

        {/* Groups render after every loose tool, so a member with no groups
            sees exactly the shelf they saw yesterday and a member with
            groups always sees their loose picks first. */}
        {groups.map((group) => (
          <div key={group.id} data-testid={`nav-group-${group.id}`} className="space-y-0.5">
            <button
              type="button"
              onClick={() => onToggleGroup(group.id, !group.collapsed)}
              aria-expanded={!group.collapsed}
              className={`${ROW_BASE} ${variant === 'desktop' ? ROW_DESKTOP : ROW_MOBILE} ${ROW_INACTIVE} text-muted-foreground`}
            >
              {/* Label leads, caret trails on the right, no count badge
                  (Kevin, 2026-08-17) — the number read as a quota and the
                  left caret pushed every group name out of line with the
                  tool rows above. */}
              <span className="truncate flex-1 text-left">{group.name}</span>
              <ChevronRight
                className={`w-4 h-4 shrink-0 transition-transform motion-reduce:transition-none ${group.collapsed ? '' : 'rotate-90'}`}
                aria-hidden
              />
            </button>
            {!group.collapsed && (
              <div className="space-y-0.5 pl-3">
                {group.entries.map((entry) => (
                  <Row key={entry.key} entry={entry} variant={variant} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="h-px bg-border mx-2 my-2" />

      {/* Pinned bottom band — Site Setup + Settings stay here, above the
          All Tools row, as the default (Kevin, 2026-08-12). Gated upstream:
          a member without admin simply gets fewer rows. */}
      {pinned.map((e) => (
        <Row key={e.key} entry={e} variant={variant} onNavigate={onNavigate} />
      ))}

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
