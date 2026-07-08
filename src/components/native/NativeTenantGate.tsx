import { ReactNode, useEffect, useState } from 'react';
import { isNativeApp, syncNativeTenant, decodeTenantSlug } from '@/lib/nativeTenant';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { startDemoSession, DEMO_WELCOME_PENDING_KEY } from '@/lib/demoSession';

const KEY = 'gw_native_tenant';

const DEMO_SLUG = 'demo';

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
  const [demo, setDemo] = useState<TenantOption | null>(null);
  const [error, setError] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(false);

  // Load the org list once — used both for the "Try the demo choir" button and
  // the "Choose your organization" fallback list. Loading it upfront (not only
  // when the fallback opens) keeps the demo button available immediately.
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
        setDemo(demoTenant);
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
      } else {
        // Platform admin (super-admin on 'main'), or an account with no single
        // home choir: don't bounce to the marketing site — let them choose
        // which choir to open. The session persists, so picking an org below
        // reloads straight into that choir already signed in.
        setSigningIn(false);
        setMode('orgs');
      }
    } catch (err) {
      console.error('[native-login] sign-in failed', err);
      setSignInError('Something went wrong. Check your connection and try again.');
      setSigningIn(false);
    }
  };

  const tryDemo = async () => {
    if (!demo || demoLoading) return;
    setDemoLoading(true);
    setDemoError(false);
    try {
      // Server-minted read-only Director session — no credentials in the bundle.
      await startDemoSession('director');
      sessionStorage.setItem(DEMO_WELCOME_PENDING_KEY, '1');
      selectTenant(demo); // persists tenant choice, then reloads
    } catch (e) {
      console.error('[native-demo] demo-login failed', e);
      setDemoLoading(false);
      setDemoError(true);
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

            {demo && (
              <div className="pt-2 text-center border-t border-white/10">
                <p className="text-sm text-white/70 mb-2 mt-4">Just exploring?</p>
                <button
                  onClick={tryDemo}
                  disabled={demoLoading}
                  className="w-full px-5 py-3.5 rounded-xl bg-white/10 text-white font-semibold disabled:opacity-60 border border-white/20"
                >
                  {demoLoading ? 'Opening the demo…' : 'Try the demo choir'}
                </button>
                <p className="text-xs text-white/60 mt-2">
                  Explore GleeWorld with sample data — no account needed.
                </p>
                {demoError && (
                  <p className="text-xs text-amber-300 mt-2">
                    Couldn't open the demo — check your connection and try again.
                  </p>
                )}
              </div>
            )}
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
