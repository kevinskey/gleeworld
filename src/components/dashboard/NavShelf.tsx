// NavShelf — the flat member-chosen navigation shelf.
//
//   Home                  always first, never consumes a slot
//   <up to 8 tools>       the member's My Tools set, in their order
//   ─────────
//   All Tools             disclosure holding every other destination
//
// No sections on the shelf, no accordions, no drag reorder: arranging is a
// Phase 2 task performed on /dashboard/my-space, not a gesture performed on
// the live nav. The `sections` disclosure is a Phase 1 bridge — Phase 3
// replaces it with the searchable All Tools sheet.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.2
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, LayoutGrid, Settings } from 'lucide-react';
import { MY_TOOLS_CAP } from '@/lib/navigation/myTools';
import type { CatalogEntry } from '@/lib/navigation/navCatalog';

// Not a NAV_CATALOG entry — Setup is a row the shelf always offers on its
// own, not a gated destination a member picks. Row only reads
// icon/to/end/tourId/label off its `entry` prop, so a hand-built
// CatalogEntry-shaped constant is enough; section/tone are unused here but
// required by the type.
const SETUP_ENTRY: CatalogEntry = {
  key: 'my-space-setup',
  to: '/dashboard/my-space',
  label: 'Setup',
  icon: Settings,
  section: 'today',
  tone: 'bg-muted text-muted-foreground',
  tourId: 'nav-my-space-setup',
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
  sections: Array<{ key: string; label: string; items: CatalogEntry[] }>;
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

export function NavShelf({ home, tools, sections, variant, onNavigate }: NavShelfProps) {
  const [allOpen, setAllOpen] = useState(false);

  // Defensive cap. useMyTools already sanitizes, but the shelf's whole
  // promise is that it cannot grow into a list — enforce it at the render
  // boundary too, so a stale cache or a future caller can't break it.
  const shelf = tools.filter((t) => t.key !== home?.key).slice(0, MY_TOOLS_CAP);
  const shelfKeys = new Set([...(home ? [home.key] : []), ...shelf.map((t) => t.key)]);

  // Everything not already on the shelf, still grouped, for the disclosure.
  const rest = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !shelfKeys.has(i.key)) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="space-y-1">
      <div data-testid="nav-shelf-tools" className="space-y-0.5">
        {home && <Row entry={home} variant={variant} onNavigate={onNavigate} />}
        {shelf.map((t) => (
          <Row key={t.key} entry={t} variant={variant} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="h-px bg-border mx-2 my-2" />

      {rest.length > 0 && (
        <button
          type="button"
          data-tour="nav-all-tools-toggle"
          onClick={() => setAllOpen((o) => !o)}
          aria-expanded={allOpen}
          className={`${ROW_BASE} ${variant === 'desktop' ? ROW_DESKTOP : ROW_MOBILE} ${ROW_INACTIVE} justify-between`}
        >
          <span className="flex items-center gap-2.5">
            <LayoutGrid className={`${variant === 'desktop' ? 'w-[18px] h-[18px]' : 'w-5 h-5'} shrink-0 text-slate-500`} aria-hidden />
            All Tools
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${allOpen ? '' : '-rotate-90'}`}
            aria-hidden
          />
        </button>
      )}

      {/* Setup — always present, unlike All Tools above (which only
          renders when there's something left to disclose). Reaches the
          personal /dashboard/my-space editor. */}
      <Row entry={SETUP_ENTRY} variant={variant} onNavigate={onNavigate} />

      {rest.length > 0 && allOpen && (
        <div className="space-y-1.5 pt-1">
          {rest.map((section) => (
            <div key={section.key} className="rounded-lg bg-muted/40 ring-1 ring-border/60 p-1.5 space-y-0.5">
              <div className="px-2 pb-1 pt-0.5 text-[11px] font-black uppercase tracking-[0.08em] text-foreground">
                {section.label}
              </div>
              {section.items.map((item) => (
                <Row key={item.key} entry={item} variant={variant} onNavigate={onNavigate} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
