import { ReactNode, useEffect, useState } from 'react';
import { isNativeApp, syncNativeTenant, decodeTenantSlug } from '@/lib/nativeTenant';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const KEY = 'gw_native_tenant';

// The GleeWorld iOS app is for real tenant members — the demo lives at
// demo.gleeworld.org in the browser. If a previous build stashed
// tenant='demo' in localStorage (from the retired "Try the demo choir"
// button), the app used to boot straight into the demo experience even
// for users who wanted to sign in. Clearing it here reverts them to the
// sign-in gate on the next open.
const RETIRED_DEMO_SLUGS = new Set(['demo', 'demo-choir', 'demo-district', 'demo-school', 'demo-songwriter']);

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

// On native (Capacitor) there is no per-subdomain tenant-bootstrap.js. Rather
// than greet users with a list of every organization (which reads like "pick a
// stranger's choir"), we lead with a normal sign-in: auth is global, so a user
// can sign in without first choosing a tenant. On success, AuthContext fires
// syncNativeTenant(), which reads the JWT's tenant_slug, caches that tenant's
// brand (logo + short name) and reloads straight into their branded experience.
// Users who don't know their sign-in (or want to browse/sign up) can fall back
// to picking their organization, which opens that tenant's branded login.
export const NativeTenantGate = ({ children }: { children: ReactNode }) => {
  // Sticky-demo cleanup: users who previously tapped the retired "Try the
  // demo choir" button on native had tenant='demo' persisted, so every
  // subsequent app open dropped them into the demo experience instead of
  // the sign-in screen. Clear it once here, then re-evaluate needsPick.
  const cachedTenant = typeof window !== 'undefined'
    ? (window as unknown as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant
    : undefined;
  const shouldClearDemo = isNativeApp() && cachedTenant && RETIRED_DEMO_SLUGS.has(cachedTenant);
  if (shouldClearDemo && typeof window !== 'undefined') {
    try { localStorage.removeItem(KEY); } catch { /* private mode */ }
    delete (window as unknown as { __TENANT_CONFIG__?: unknown }).__TENANT_CONFIG__;
  }

  const needsPick =
    isNativeApp() && !(window as unknown as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant;

  const [mode, setMode] = useState<'login' | 'orgs'>('login');

  // Sign-in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Org-picker fallback state
  const [tenants, setTenants] = useState<TenantOption[] | null>(null);
  const [error, setError] = useState(false);

  // Load the org list once — used by the "Choose your organization" fallback
  // list. Loading it upfront (not only when the fallback opens) keeps it
  // responsive on first tap.
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
        // Retired demo slugs stay OFF the native picker — demo access lives
        // at demo.gleeworld.org in the browser now.
        const orgs = data.filter(t => !RETIRED_DEMO_SLUGS.has(t.slug));
        setTenants(orgs);
      });
  }, [needsPick]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingIn) return;
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setSignInError('Enter your email and password.');
      return;
    }
    setSigningIn(true);
    setSignInError(null);
    try {
      // Auth is global (not tenant-scoped) — signing in works with no tenant
      // selected. The JWT hook injects tenant_slug from gw_tenant_members.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) {
        setSignInError(error.message || 'Sign in failed. Check your email and password.');
        setSigningIn(false);
        return;
      }
      const slug = data.session ? decodeTenantSlug(data.session) : null;
      if (slug && slug !== 'main') {
        // Normal member: cache their choir's brand from the JWT and enter.
        // syncNativeTenant reloads once it has the tenant; the explicit reload
        // is a fallback.
        await syncNativeTenant(data.session);
        window.location.reload();
        return;
      }

      // JWT tenant is 'main' or null — look up the tenants this email
      // belongs to via my_tenants (SECURITY DEFINER, scoped to auth.uid()).
      // Auto-open the FIRST non-main membership the RPC returns; the RPC
      // already sorts alphabetically by tenant name (see migration
      // 20260717040000_my_tenants_rpc.sql), so each user lands in the
      // same tenant every time. 'main' is intentionally NOT considered
      // an auto-open target — platform admins should land in their real
      // tenant, and reach main via the "Switch organization" list in
      // the avatar dropdown if they need to. `gw_native_tenant` persists
      // across sign-outs (AuthContext.signOut leaves it in place), so
      // this branch only runs on the very first login per install.
      try {
        const { data: myTenantsRaw, error: rpcErr } = await supabase.rpc('my_tenants' as never);
        if (!rpcErr) {
          const myTenants = (myTenantsRaw ?? []) as Array<{ slug: string; name: string | null }>;
          const nonMain = myTenants.filter((t) => t.slug && t.slug !== 'main');
          if (nonMain.length >= 1) {
            const pick = nonMain[0];
            localStorage.setItem(KEY, JSON.stringify({ tenant: pick.slug, org: pick.name ?? undefined }));
            window.location.reload();
            return;
          }
        }
      } catch (rpcErr) {
        // Non-fatal: fall through to the picker below so the user still
        // has a way in when the RPC hiccups.
        console.warn('[native-login] my_tenants lookup failed', rpcErr);
      }

      // Genuinely zero non-main memberships — a rare edge (typically a
      // user only registered against 'main'). The picker stays as a
      // recovery path so they can still enter a demo/public choir rather
      // than getting stuck on the sign-in screen.
      setSigningIn(false);
      setMode('orgs');
    } catch (err) {
      console.error('[native-login] sign-in failed', err);
      setSignInError('Something went wrong. Check your connection and try again.');
      setSigningIn(false);
    }
  };

  if (!needsPick) return <>{children}</>;

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white/95 border border-white/20 text-slate-900 ' +
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/60';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        // GleeWorld brand gradient — cyan→purple radial bloom on a deep
        // navy base. Matches the logo colorway so the screen reads as
        // branded rather than blank.
        background:
          'radial-gradient(ellipse at 30% 20%, hsl(187 80% 35% / 0.55) 0%, transparent 50%), ' +
          'radial-gradient(ellipse at 75% 80%, hsl(271 75% 45% / 0.55) 0%, transparent 55%), ' +
          'linear-gradient(135deg, hsl(220 60% 12%) 0%, hsl(265 50% 18%) 50%, hsl(290 45% 20%) 100%)',
        paddingTop: 'calc(var(--gw-safe-top) + 1.5rem)',
      }}
    >
      {/* Subtle vignette to keep edges legible */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <img src="/lovable-uploads/gleeworld-logo.png" alt="GleeWorld" className="h-16 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-white drop-shadow-md">
            {mode === 'login' ? 'Welcome to GleeWorld' : 'Choose your organization'}
          </h1>
          <p className="text-white/80 mt-2">
            {mode === 'login' ? 'Sign in to continue.' : 'Open your choir to sign in.'}
          </p>
        </div>

        {mode === 'login' ? (
          <div className="space-y-5">
            <form onSubmit={signIn} className="space-y-3">
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                disabled={signingIn}
              />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                disabled={signingIn}
              />
              {signInError && (
                <p className="text-sm text-amber-300 text-center">{signInError}</p>
              )}
              <button
                type="submit"
                disabled={signingIn}
                className="w-full px-5 py-3.5 rounded-xl bg-white text-slate-900 font-semibold disabled:opacity-60 shadow-lg"
              >
                {signingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => { setMode('orgs'); setSignInError(null); }}
                className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
              >
                Don't know your sign-in? Choose your organization
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-white/80 mb-4">Couldn't load organizations. Check your connection.</p>
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

            <div className="pt-3 text-center">
              <button
                onClick={() => setMode('login')}
                className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
