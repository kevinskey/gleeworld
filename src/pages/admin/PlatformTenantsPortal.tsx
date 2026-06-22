// Platform owner's tenant portal. Visible only to super-admins on the main
// tenant (the platform owner). Lists every tenant with one-click access to
// their public site, admin Control Center, and page builder. Used by Kevin
// to fix problems for individual tenants without having to remember each
// subdomain.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CreateTenantDialog } from '@/components/admin/CreateTenantDialog';
import {
  ExternalLink,
  Settings,
  LayoutPanelTop,
  Search,
  Lock,
  RefreshCw,
  Loader2,
  Globe,
} from 'lucide-react';

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

function tenantUrl(t: TenantRow): string {
  if (t.custom_domain) return `https://${t.custom_domain}`;
  return `https://${t.subdomain || t.slug}.gleeworld.org`;
}

export default function PlatformTenantsPortal() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const isSuperAdmin = !!userProfile?.is_super_admin;
  const tenantSlug = typeof window !== 'undefined' ? (window as any).__TENANT_CONFIG__?.tenant : null;
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

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <Lock className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <CardTitle>Platform admins only</CardTitle>
            <CardDescription>
              This portal is reserved for super-admins on the main tenant. You&apos;re signed in
              as a tenant admin — your control center is what you&apos;re looking for.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/control-center">Go to your Control Center</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans normal-case tracking-tight text-2xl font-bold">All tenants</h1>
          <p className="text-sm text-muted-foreground">
            Platform owner portal — jump into any tenant&apos;s site or admin to fix problems.
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
                      <CardTitle className="text-base font-semibold leading-tight truncate">
                        {t.name}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs truncate">
                        {t.custom_domain || `${t.subdomain || t.slug}.gleeworld.org`}
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
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                      title="Open the public site in a new tab"
                    >
                      <Globe className="w-3.5 h-3.5 mr-1" /> Site
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`${url}/control-center`, '_blank', 'noopener,noreferrer')}
                      title="Open the tenant Control Center"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1" /> Admin
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`${url}/admin/public-page`, '_blank', 'noopener,noreferrer')}
                      title="Open the page builder"
                    >
                      <LayoutPanelTop className="w-3.5 h-3.5 mr-1" /> Pages
                    </Button>
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
    </div>
  );
}
