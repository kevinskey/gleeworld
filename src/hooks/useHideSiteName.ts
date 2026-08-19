import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type PublicSite = {
  blocks?: Array<{ block_type: string; config?: { showSiteName?: boolean } }>;
} | null;

/**
 * True when the tenant turned "Show site name" OFF on their public page's
 * Header block. Only an explicit false hides the name — no public site, no
 * header block, or an unset toggle all keep it, so a tenant who never
 * touched the page builder is unaffected.
 */
export function publicSiteHidesSiteName(site: PublicSite | undefined): boolean {
  return site?.blocks?.find((b) => b.block_type === 'header')?.config?.showSiteName === false;
}

/**
 * Mirrors the public page's Header block in the workspace chrome: a tenant
 * who removed the site name from their public page (Header block's "Show
 * site name" toggle) doesn't want it re-appearing in the Command Center
 * sidebar/topbar/drawer either — the logo carries the brand (Kevin,
 * 2026-08-18). Shares the ['tenant-public-site'] cache with
 * UniversalHeader/Footer/TenantThemeRoot.
 */
export function useHideSiteName(): boolean {
  const { data } = useQuery<PublicSite>({
    queryKey: ['tenant-public-site'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_public_site');
      if (error) return null;
      return data as PublicSite;
    },
  });
  return publicSiteHidesSiteName(data);
}
