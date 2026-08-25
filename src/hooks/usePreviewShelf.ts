// The shelf a "Views" preview should render.
//
// previewShelfTools() answers this from the hardcoded role constants, which
// was already better than showing the admin their own tools — but a tenant
// that has customised My World → "Defaults for members" gets a preview that
// contradicts the very page where they set it (Kevin, 2026-08-20: "the right
// is what i chose the left nav is wrong").
//
// So: the tenant's configured defaults for the previewed role, falling back
// to the constants only when that role has none saved. Same precedence a real
// new member gets, which is the whole point — the preview should show what
// somebody joining today would actually receive.
import { useMemo } from 'react';
import { useTenantRoleDefaults } from '@/hooks/useTenantNavPrefs';
import { previewShelfTools } from '@/lib/navigation/myTools';
import type { NavRole } from '@/lib/navigation/navCatalog';

export function usePreviewShelf(previewRole: NavRole | null | undefined): string[] | null {
  // Reuses the tenant-nav-prefs query every page already runs, so turning
  // a preview on costs no extra round trip.
  const configured = useTenantRoleDefaults(previewRole ?? null);
  return useMemo(
    () => (previewRole ? (configured ?? previewShelfTools(previewRole)) : null),
    [previewRole, configured],
  );
}
