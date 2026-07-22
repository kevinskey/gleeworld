// /fan — renders the tenant's published fan page (block-built) for any
// signed-in user. If the admin hasn't published a fan page yet, fall back to
// the legacy FanDashboard so existing tenants don't see a blank screen.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicSiteView, type PublicSitePayload } from '@/components/public-site/PublicSiteView';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
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
      <UniversalLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading…</div>
        </div>
      </UniversalLayout>
    );
  }

  if (!data) {
    return <FanDashboard />;
  }

  return (
    <UniversalLayout containerized={false}>
      <PublicSiteView data={data} slug="fan" memberSignIn={false} />
    </UniversalLayout>
  );
}
