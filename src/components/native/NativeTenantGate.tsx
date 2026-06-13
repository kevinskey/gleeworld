import { ReactNode, useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/nativeTenant';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const KEY = 'gw_native_tenant';

const DEMO_SLUG = 'demo';
// Public tap-to-explore account (also given to App Review) — not a secret.
const DEMO_EMAIL = 'demo@gleeworld.org';
const DEMO_PASSWORD = 'GleeDemo2026!';

interface TenantOption {
  slug: string;
  name: string;
}

function selectTenant(t: TenantOption) {
  // 'main' is the GleeWorld marketing site, not a tenant clone — an org name
  // would flip GleeWorldLanding/HomeRoute into tenant-clone mode.
  const org = t.slug === 'main' ? undefined : t.name;
  localStorage.setItem(KEY, JSON.stringify({ tenant: t.slug, org }));
  window.location.reload();
}

// On native (Capacitor) there is no per-subdomain tenant-bootstrap.js, so on
// first launch the user picks their organization; the choice is cached and
// restored by native-boot.js on every boot. After login syncNativeTenant()
// corrects the cache if the JWT says the user belongs to a different tenant.
export const NativeTenantGate = ({ children }: { children: ReactNode }) => {
  const needsPick =
    isNativeApp() && !(window as unknown as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant;

  const [tenants, setTenants] = useState<TenantOption[] | null>(null);
  const [demo, setDemo] = useState<TenantOption | null>(null);
  const [error, setError] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    if (!needsPick) return;
    supabase
      .from('gw_tenants')
      .select('slug,name')
      .eq('status', 'active')
      .order('name')
      .then(({ data, error }: { data: TenantOption[] | null; error: unknown }) => {
        if (error || !data || data.length === 0) {
          setError(true);
          return;
        }
        const demoTenant = data.find(t => t.slug === DEMO_SLUG) ?? null;
        const orgs = data.filter(t => t.slug !== DEMO_SLUG);
        if (orgs.length === 1 && !demoTenant) {
          selectTenant(orgs[0]);
          return;
        }
        setDemo(demoTenant);
        setTenants(orgs);
      });
  }, [needsPick]);

  const tryDemo = async () => {
    if (!demo || demoLoading) return;
    setDemoLoading(true);
    // Sign in first so the session is persisted before the tenant-select reload.
    await supabase.auth
      .signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .catch(() => {});
    selectTenant(demo);
  };

  if (!needsPick) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[hsl(40,10%,96%)] flex items-center justify-center p-6" style={{ paddingTop: 'calc(var(--gw-safe-top) + 1.5rem)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/lovable-uploads/gleeworld-logo.png" alt="GleeWorld" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Welcome to GleeWorld</h1>
          <p className="text-slate-600 mt-2">Choose your organization to get started.</p>
        </div>

        {error ? (
          <div className="text-center">
            <p className="text-slate-600 mb-4">Couldn't load organizations. Check your connection.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-full bg-slate-900 text-white font-medium"
            >
              Try again
            </button>
          </div>
        ) : !tenants ? (
          <div className="flex justify-center">
            <LoadingSpinner size="lg" text="Loading organizations..." />
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map(t => (
              <button
                key={t.slug}
                onClick={() => selectTenant(t)}
                className="w-full px-5 py-4 rounded-xl bg-white border border-slate-200 shadow-sm text-left text-slate-900 font-medium hover:border-slate-400 transition-colors"
              >
                {t.name}
              </button>
            ))}

            {demo && (
              <div className="pt-4 text-center">
                <p className="text-sm text-slate-500 mb-2">Just exploring?</p>
                <button
                  onClick={tryDemo}
                  disabled={demoLoading}
                  className="w-full px-5 py-4 rounded-xl bg-slate-900 text-white font-medium disabled:opacity-60"
                >
                  {demoLoading ? 'Opening the demo…' : 'Try the demo choir'}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  Explore GleeWorld with sample data — no account needed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
