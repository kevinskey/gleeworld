import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { getTenantSlug } from '@/integrations/supabase/client';

/**
 * "Public Site" in the sidebar: the tenant's published site rendered
 * full-bleed inside the app shell, so a director sees what the world
 * sees without leaving the dashboard. Framed via the anonymous
 * /sites/:slug route (same origin — CSP frame-src 'self' covers it)
 * rather than mounting PublicSiteView directly, so the site's own
 * document.title / meta / full-bleed layout can't fight the shell.
 * No open-in-new-tab affordance by request (Kevin 2026-08-17) — the
 * site lives entirely within the app here.
 */
export default function PublicSitePreviewPage() {
  return (
    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
      <DashboardShell>
        <iframe
          title="Public site"
          src={`/sites/${getTenantSlug()}`}
          className="w-full h-[calc(100vh-4rem)] bg-background"
          style={{ border: 'none' }}
        />
      </DashboardShell>
    </UniversalLayout>
  );
}
