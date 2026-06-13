// /fan — renders the tenant's published fan page (block-built) for any
// signed-in user. If the admin hasn't published a fan page yet, fall back to
// the legacy FanDashboard so existing tenants don't see a blank screen.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicSiteView, type PublicSitePayload } from '@/components/public-site/PublicSiteView';
import FanDashboard from './FanDashboard';

export default function FanPage() {
  const { data, isLoading } = useQuery<PublicSitePayload | null>({
    queryKey: ['fan-page'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_fan_page');
      if (error) throw error;
      return (data as PublicSitePayload) ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // No published fan page yet — show the legacy dashboard so the route still
  // works while the admin builds out their block-based layout.
  if (!data) {
    return <FanDashboard />;
  }

  return <PublicSiteView data={data} slug="fan" memberSignIn={false} />;
}
