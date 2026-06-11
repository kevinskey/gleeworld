import { ReactNode, useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/nativeTenant';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const KEY = 'gw_native_tenant';

interface TenantOption {
  slug: string;
  name: string;
}

function selectTenant(t: TenantOption) {
  localStorage.setItem(KEY, JSON.stringify({ tenant: t.slug, org: t.name }));
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
  const [error, setError] = useState(false);

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
        if (data.length === 1) {
          selectTenant(data[0]);
          return;
        }
        setTenants(data);
      });
  }, [needsPick]);

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
          </div>
        )}
      </div>
    </div>
  );
};
