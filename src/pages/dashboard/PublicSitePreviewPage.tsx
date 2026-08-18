import { ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { getTenantSlug } from '@/integrations/supabase/client';

/**
 * "Public Site" in the sidebar: the tenant's published site rendered
 * inside the app shell, so a director can see what the world sees
 * without leaving the dashboard. Framed via the anonymous /sites/:slug
 * route (same origin — CSP frame-src 'self' covers it) rather than
 * mounting PublicSiteView directly, so the site's own document.title /
 * meta / full-bleed layout can't fight the shell.
 */
export default function PublicSitePreviewPage() {
  const slug = getTenantSlug();
  const siteUrl = `/sites/${slug}`;
  return (
    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
      <DashboardShell>
        <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold truncate">Your public site</span>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                — what visitors see, live
              </span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Open in new tab</span>
              </a>
            </Button>
          </div>
          <iframe
            title="Public site"
            src={siteUrl}
            className="flex-1 w-full min-h-0 bg-background"
            style={{ border: 'none' }}
          />
        </div>
      </DashboardShell>
    </UniversalLayout>
  );
}
