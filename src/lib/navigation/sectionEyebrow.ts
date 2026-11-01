import { NAV_CATALOG, NAV_SECTION_LABELS } from '@/lib/navigation/navCatalog';


// Section eyebrow for DashboardPageShell: which nav section a route belongs to.
/** Section label ("Music", "People", …) for the catalog entry whose route is
 *  the longest prefix of `pathname`; null when nothing matches. Read from
 *  window.location rather than a router hook so the shell also renders in
 *  tests and outside a Router. */
export function sectionEyebrowForPath(pathname: string): string | null {
  let best: { len: number; section: string } | null = null;
  for (const e of NAV_CATALOG) {
    const to = e.to.split('?')[0];
    if (to === '/' || !to) continue;
    if (pathname === to || pathname.startsWith(to + '/')) {
      if (!best || to.length > best.len) best = { len: to.length, section: e.section };
    }
  }
  return best ? (NAV_SECTION_LABELS[best.section as keyof typeof NAV_SECTION_LABELS] ?? null) : null;
}
