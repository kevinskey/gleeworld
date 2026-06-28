// Legacy /settings/modules page — superseded by the unified
// /dashboard/workspace?tab=modules surface (with sandbox toggles for
// the demo tenant and Stripe checkout for paying tenants).
//
// Kept as a permanent redirect so old bookmarks, sidebar menu entries,
// and Stripe success URLs that point at /settings/modules continue to
// work but route the user to the one true activation page.

import { Navigate, useSearchParams } from 'react-router-dom';

export default function ModulesSettings() {
  const [params] = useSearchParams();
  // Preserve `?activated=...` / `?cancelled=...` query params from the
  // Stripe redirect so the destination page can still surface a toast.
  const qs = params.toString();
  const target = `/dashboard/workspace?tab=modules${qs ? '&' + qs : ''}`;
  return <Navigate to={target} replace />;
}
