// Extra public-site pages on tenant hosts: yo-doc.com/retirement etc.
// Registered as the LAST dynamic route before the "*" NotFound — React
// Router ranks every static app route above "/:page", so this only sees
// URLs nothing else claimed. Renders the published site's page if it has
// one; otherwise the normal NotFound.
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicSiteView, type PublicSitePayload } from '@/components/public-site/PublicSiteView';
import NotFound from './NotFound';

const PAGE_SLUG = /^[a-z0-9-]{2,40}$/;

export default function TenantSitePage() {
  const { page = '' } = useParams<{ page: string }>();
  const tenantSlug = (window as unknown as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant;
  const plausible = PAGE_SLUG.test(page) && !!tenantSlug;

  const { data, isLoading } = useQuery<PublicSitePayload | null>({
    queryKey: ['public-site', tenantSlug],
    enabled: plausible,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_public_site');
      if (error) throw error;
      return (data as PublicSitePayload) ?? null;
    },
  });

  if (!plausible) return <NotFound />;
  if (isLoading) {
    return <div className="min-h-screen bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }} />;
  }

  const pageExists = !!data && (data.blocks ?? []).some((b) => (b.page || 'home') === page);
  if (!pageExists) return <NotFound />;

  return (
    <PublicSiteView
      data={data!}
      slug={data!.slug}
      page={page}
      memberSignIn
      pageHref={(p) => (p === 'home' ? '/' : `/${p}`)}
    />
  );
}
