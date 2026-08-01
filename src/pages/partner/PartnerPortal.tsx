import { useEffect } from 'react';
import { useSearchParams, NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink, RefreshCw } from 'lucide-react';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMyPartner, useStartConnectOnboarding, useRefreshConnectStatus } from '@/lib/partner/api';

export default function PartnerPortal() {
  const { data: partner, isLoading } = useMyPartner();
  const [params] = useSearchParams();
  const start = useStartConnectOnboarding();
  const refresh = useRefreshConnectStatus();
  const location = useLocation();

  // On return from Stripe onboarding, refresh status.
  useEffect(() => {
    if (params.get('stripe') === 'done') {
      refresh.mutate(undefined, {
        onSuccess: (r) => {
          if (r.status === 'active') toast.success('You\'re live — your storefront is ready.');
          else toast.info('Still finalizing with Stripe. Try again in a moment.');
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('stripe')]);

  if (isLoading) return <DashboardPageShell title="Partner portal"><p>Loading…</p></DashboardPageShell>;
  if (!partner) return (
    <DashboardPageShell title="Partner portal">
      <p className="text-sm text-muted-foreground">You're not a partner yet. Ask Kevin for an invite.</p>
    </DashboardPageShell>
  );

  const isActive = partner.status === 'active';
  const needsOnboarding = partner.status === 'onboarding' && (!partner.stripe_charges_enabled || !partner.stripe_payouts_enabled);

  const kickOff = () => start.mutate(undefined, {
    onSuccess: (r) => { window.location.href = r.onboarding_url; },
    onError: (e) => toast.error(`Stripe: ${e.message}`),
  });

  const openDashboard = () => refresh.mutate(undefined, {
    onSuccess: (r) => {
      if (r.express_dashboard_url) window.open(r.express_dashboard_url, '_blank');
      else toast.info('Dashboard is available once your account is live.');
    },
  });

  return (
    <DashboardPageShell title={partner.display_name} subtitle="Composer store partner portal">
      <Link to="/dashboard" className="text-xs text-primary hover:underline inline-block mb-4">← Go to my member dashboard</Link>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Payout status</CardTitle>
          <Badge variant={isActive ? 'default' : 'outline'} className="text-xs">{partner.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {needsOnboarding && (
            <>
              <p className="text-sm">Finish Stripe onboarding to start selling. Stripe collects the info you need to receive payouts; we never see it.</p>
              <Button disabled={start.isPending} onClick={kickOff}>Continue on Stripe</Button>
            </>
          )}
          {isActive && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={openDashboard} disabled={refresh.isPending}>
                <ExternalLink className="w-4 h-4 mr-1" /> Open Stripe dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 border-b mb-4">
        <NavLink to="/partner/profile"
          className={({ isActive: a }) => `text-sm pb-2 ${a || location.pathname === '/partner' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}>
          Profile
        </NavLink>
        <NavLink to="/partner/scores"
          className={({ isActive: a }) => `text-sm pb-2 ${a ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}>
          Scores
        </NavLink>
      </div>

      <Outlet />
    </DashboardPageShell>
  );
}
