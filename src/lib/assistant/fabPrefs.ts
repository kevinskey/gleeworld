// Per-section collapse preference for the floating assistant mic.
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
  return read()[section] === true;
}

export function setFabCollapsed(section: string, collapsed: boolean): void {
  try {
    const map = read();
    if (collapsed) map[section] = true; else delete map[section];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* private mode */ }
}
