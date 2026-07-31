// Warns admins that they are editing the GleeWorld platform site (`main`
// tenant, gleeworld.org) rather than an ensemble tenant. Branding pages
// scope their saves to the subdomain you're on, so it's easy for a
// platform owner to re-brand gleeworld.org itself by accident.
import { AlertTriangle } from 'lucide-react';
import { getTenantSlug } from '@/integrations/supabase/client';

export function PlatformTenantWarning() {
  // getTenantSlug() falls back to 'main' when no tenant bootstrap exists —
  // matching the write path: those requests carry x-tenant-slug: main, so
  // saves genuinely land on the platform tenant and the warning is due.
  if (getTenantSlug() !== 'main') return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">You're editing the GleeWorld platform site.</p>
        <p>
          Changes here rebrand <span className="font-medium">gleeworld.org</span> itself, which every
          visitor sees. To brand your own ensemble, open this page on your ensemble's subdomain
          (for example <span className="font-medium">yourensemble.gleeworld.org</span>).
        </p>
      </div>
    </div>
  );
}

export default PlatformTenantWarning;
