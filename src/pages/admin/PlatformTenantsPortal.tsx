// Platform Home — the mother site's landing page. Visible only to
// super-admins on the main tenant (the platform owner); this is where
// pickDestination() sends kpj64110@gmail.com straight after login (see
// useRoleBasedRedirect.ts). Lists every tenant ("world") with one-click
// access to its public site, dashboard, and page builder, so Kevin can
// fix problems for any tenant without having to remember each subdomain.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { formatPlatformStats } from '@/lib/platformStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CreateTenantDialog } from '@/components/admin/CreateTenantDialog';
import { TenantDomainDialog } from '@/components/admin/TenantDomainDialog';
import {
  ExternalLink,
  Settings,
  LayoutPanelTop,
  Search,
  Lock,
  RefreshCw,
  Loader2,
  Globe,
  Link2,
  Mail,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  subdomain: string | null;
  custom_domain: string | null;
  plan: string;
  status: string;
  created_at: string;
}

function tenantHost(t: TenantRow): string {
  // The platform tenant's subdomain column holds the bare apex domain
  // ("gleeworld.org"), which naively concatenates to the dead
  // "gleeworld.org.gleeworld.org" — special-case it.
  if (t.slug === 'main') return 'gleeworld.org';
  if (t.custom_domain) return t.custom_domain;
  // Some rows' `subdomain` column holds the FULL host already (e.g.
  // "demo-choir.gleeworld.org") rather than a bare slug — appending
  // ".gleeworld.org" again produced a dead double-domain link
  // ("demo-choir.gleeworld.org.gleeworld.org"). Only append the suffix
  // when subdomain looks like a bare slug (no dot in it).
  const host = t.subdomain || t.slug;
  return host.includes('.') ? host : `${host}.gleeworld.org`;
}

function tenantUrl(t: TenantRow): string {
  return `https://${tenantHost(t)}`;
}

export default function PlatformTenantsPortal() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const isSuperAdmin = !!userProfile?.is_super_admin;
  const tenantSlug =
    typeof window !== 'undefined'
      ? (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant ?? null
      : null;
  const isPlatformAdmin = isSuperAdmin && tenantSlug === 'main';

  const { data, isLoading, refetch, isFetching } = useQuery<{ tenants: TenantRow[] }>({
    queryKey: ['platform-tenants'],
    enabled: isPlatformAdmin,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('not signed in');
      const res = await fetch('/superadmin/api/tenants?include_platform=1', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
  });

  // Platform stats from the superadmin API — same auth pattern as the
  // tenant list. Failure must never block the tenant list, so this is a
  // separate query and errors render as a quiet note.
  const { data: statsData, isError: statsError } = useQuery<Record<string, unknown>>({
    queryKey: ['platform-stats'],
    enabled: isPlatformAdmin,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('not signed in');
      const res = await fetch('/superadmin/api/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
  const stats = formatPlatformStats(statsData);

  // Jump into a tenant's admin surface signed in AS that tenant's admin.
  // A plain link can't work: the gleeworld.org session doesn't exist on
  // the tenant subdomain (per-origin storage), and the platform JWT is
  // bound to the main tenant anyway. The superadmin API mints a
  // single-use magic link for the tenant's own admin user instead.
  // The tab opens synchronously (before the fetch) so Safari's popup
  // blocker sees a user gesture; on failure we close it and toast.
  const openTenantAdmin = async (t: TenantRow, path: string) => {
    if (t.slug === 'main') {
      window.open(`https://gleeworld.org${path}`, '_blank', 'noopener,noreferrer');
      return;
    }
    const tab = window.open('about:blank', '_blank');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in.');
      const res = await fetch(`/superadmin/api/tenants/${t.id}/admin-link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.hint || body.error || `HTTP ${res.status}`);
      if (tab) tab.location.href = body.link;
      else window.open(body.link, '_blank', 'noopener,noreferrer');
      toast({ title: `Opening ${t.name}`, description: `Signed in as ${body.as_email}` });
    } catch (e: unknown) {
      tab?.close();
      toast({
        title: `Couldn't open ${t.name} admin`,
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Resend welcome = the staged-setup handoff step. The API mints a fresh
  // temp password for the tenant's admin (invalidating any staged one),
  // so it always goes through the confirm dialog below.
  const [resendTarget, setResendTarget] = useState<TenantRow | null>(null);
  // Custom-domain editing for a live tenant. Its old home, SiteSetup, became
  // unreachable when /admin/site-setup started redirecting away, leaving a
  // hand-written SQL UPDATE as the only route.
  const [domainTarget, setDomainTarget] = useState<TenantRow | null>(null);
  // Mirrors resendTarget but only updates when the dialog opens, so the
  // AlertDialogDescription keeps rendering the tenant's name during the
  // close animation instead of going blank the instant resendTarget is
  // cleared.
  const [lastResendTarget, setLastResendTarget] = useState<TenantRow | null>(null);
  const openResendDialog = (t: TenantRow) => {
    setResendTarget(t);
    setLastResendTarget(t);
  };
  // In-flight guard: the resend-welcome API mints a brand-new temp
  // password each call, invalidating the previous one, so a double-fired
  // click (slow network + impatient double-click) would silently mint two
  // passwords and email the wrong one. Track which tenant is mid-request
  // and disable/spin its Welcome button for the duration.
  const [resendingId, setResendingId] = useState<string | null>(null);
  const resendWelcome = async (t: TenantRow) => {
    setResendingId(t.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in.');
      const res = await fetch(`/superadmin/api/tenants/${t.id}/resend-welcome`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      toast({ title: 'Welcome email sent', description: `A fresh sign-in email went to the ${t.name} admin.` });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Resend failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setResendingId(null);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="max-w-xl mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <Lock className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <CardTitle>Platform owners only</CardTitle>
            <CardDescription>
              This is the mother site — reserved for super-admins on the main tenant.
              You&apos;re signed in as a tenant admin; your dashboard is what you&apos;re looking for.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/dashboard">Go to your Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  const tenants = (data?.tenants ?? []).filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.custom_domain || '').toLowerCase().includes(q)
    );
  });

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans normal-case tracking-tight text-2xl font-bold">
            {userProfile?.full_name ? `Welcome back, ${userProfile.full_name.split(' ')[0]}` : 'Platform Home'}
          </h1>
          <p className="text-sm text-muted-foreground">
            gleeworld.org is the mother site. Pick a world below to enter it and help out — everything
            else stays exactly where you left it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
              refetch();
            }}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Refresh
          </Button>
          <CreateTenantDialog />
        </div>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold leading-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground capitalize">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {statsError && (
        <p className="text-xs text-muted-foreground">Platform stats unavailable right now.</p>
      )}

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, slug, or custom domain…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading tenants…
        </div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {query ? 'No tenants match that search.' : 'No tenants yet — provision one with the button above.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tenants.map((t) => {
            const url = tenantUrl(t);
            const isPlatform = t.slug === 'main';
            return (
              <Card key={t.id} className={`${isPlatform ? 'border-primary/40 bg-primary/5' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Wrap, don't truncate — tenant names ("Campbell High
                          School Chorus") and slugs routinely overflow the
                          3-col card width and were clipping to "…". break-all
                          on the domain because hostnames have no natural
                          break points. */}
                      <CardTitle className="!text-base font-semibold leading-tight break-words">
                        {t.name}
                      </CardTitle>
                      {/* tenantHost (not raw column concat) so rows whose
                          subdomain already holds the full host don't render
                          "x.gleeworld.org.gleeworld.org". Zero-width space
                          after each dot gives the browser wrap points at
                          label boundaries instead of break-all's mid-word
                          splits ("gleeworl / d.org"). Display-only — the
                          copyable link below uses the real URL. */}
                      <CardDescription className="font-mono text-xs break-words">
                        {tenantHost(t).replace(/\./g, '.\u200b')}
                      </CardDescription>
                    </div>
                    {isPlatform && <Badge variant="default">Platform</Badge>}
                    {!isPlatform && (
                      <Badge variant={t.status === 'active' ? 'secondary' : 'outline'}>
                        {t.status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>Plan: {t.plan}</span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 min-h-0 lg:min-h-0 px-2 text-xs"
                      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                      title="Open the public site in a new tab"
                    >
                      <Globe className="w-3.5 h-3.5 mr-1" /> Site
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 min-h-0 lg:min-h-0 px-2 text-xs"
                      onClick={() => void openTenantAdmin(t, '/dashboard')}
                      title="Enter this tenant's dashboard signed in as its admin"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1" /> Enter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 min-h-0 lg:min-h-0 px-2 text-xs"
                      onClick={() => void openTenantAdmin(t, '/admin/public-page')}
                      title="Open the page builder signed in as the tenant admin"
                    >
                      <LayoutPanelTop className="w-3.5 h-3.5 mr-1" /> Pages
                    </Button>
                    {!isPlatform && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 min-h-0 lg:min-h-0 px-2 text-xs"
                        onClick={() => setDomainTarget(t)}
                        title={t.custom_domain
                          ? `Custom domain: ${t.custom_domain}`
                          : 'Set a custom domain for this tenant'}
                      >
                        <Link2 className="w-3.5 h-3.5 mr-1" />
                        {t.custom_domain ? 'Domain' : 'Add domain'}
                      </Button>
                    )}
                    {!isPlatform && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 min-h-0 lg:min-h-0 px-2 text-xs"
                        onClick={() => openResendDialog(t)}
                        disabled={resendingId === t.id}
                        title="Email this tenant's admin a fresh sign-in (invalidates any staged password)"
                      >
                        {resendingId === t.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Mail className="w-3.5 h-3.5 mr-1" />
                        )}
                        Welcome
                      </Button>
                    )}
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1"
                  >
                    {url} <ExternalLink className="w-3 h-3" />
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TenantDomainDialog
        tenant={domainTarget}
        open={!!domainTarget}
        onOpenChange={(v) => !v && setDomainTarget(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })}
      />

      <AlertDialog open={!!resendTarget} onOpenChange={(v) => !v && setResendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend welcome email?</AlertDialogTitle>
            <AlertDialogDescription>
              This emails a fresh temp password to the {lastResendTarget?.name} admin and invalidates
              any staged password. Use it as the handoff step after building their site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resendTarget && void resendWelcome(resendTarget)}>
              Send welcome email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </DashboardShell>
    </UniversalLayout>
  );
}
