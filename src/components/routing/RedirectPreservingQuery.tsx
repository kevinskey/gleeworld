// A plain `<Navigate to="/x">` cannot carry the incoming URL's query string
// or hash — react-router drops both, so a bookmark like
// `/store/products?tab=orders` or `/store/products#payments` lands on
// `/dashboard/shop` with the query gone (review round 1, Important 2, on
// the /product-management + /store/products -> /dashboard/shop redirects
// added for the Phase 5 nav consolidation — see App.tsx's usage and
// src/lib/navigation/myTools.ts's MERGED_KEYS).
//
// Reads the CURRENT location's search/hash via useLocation() and appends
// them to `to` before navigating, so a deep link into a retired route still
// opens the right tab/section on its replacement.
//
// Lives in its own module (not inline in App.tsx, where it started) so it
// can be imported by a test without pulling in App.tsx's import-time side
// effects (setupMobileAudioUnlock() calls window.matchMedia at module
// scope, which jsdom doesn't provide without a polyfill this suite doesn't
// carry — importing App.tsx directly failed on exactly that in the first
// version of this fix).
import { Navigate, useLocation } from 'react-router-dom';

export function RedirectPreservingQuery({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}
