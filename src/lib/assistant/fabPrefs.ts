// Per-section collapse preference for the floating assistant mic.
//
// The FAB now starts TUCKED (Kevin: "assistant always blocks right bottom
// corner"). A floating control parked over the corner where pages put their
// Save button is in the way far more often than it is wanted, so it waits as
// an edge tab and comes out when asked.
//
// Because the default flipped, "not stored" now means COLLAPSED, and pulling
// the pill out has to be recorded explicitly as false rather than by deleting
// the key — otherwise it would tuck itself away again on the next visit.
// "Section" = the page family a user thinks of as one place: the second
// path segment under /dashboard (calendar, viewer, …; bare /dashboard is
// 'home'), the first segment elsewhere (studio, tour-manager). Collapsing
// the FAB in the Studio must not hide it on the Calendar.
const KEY = 'gw_assistant_fab_collapsed';

export function sectionKeyFromPath(pathname: string): string {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return 'home';
  if (segs[0] === 'dashboard') return segs[1] ?? 'home';
  return segs[0];
}

function read(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

export function isFabCollapsed(section: string): boolean {
  // Absent = collapsed. Only an explicit `false` keeps it out.
  return read()[section] !== false;
}

export function setFabCollapsed(section: string, collapsed: boolean): void {
  try {
    const map = read();
    map[section] = collapsed;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* private mode */ }
}
