import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, syncNativeTenant } from "@/lib/nativeTenant";
import { resolveTenantHost, buildTenantHandoffUrl } from "@/lib/auth/tenantRedirect";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Auth state cleanup utility
const cleanupAuthState = () => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
    // Clear poll reminder so it shows again on next login
    sessionStorage.removeItem('poll_reminder_shown_this_session');
  } catch (error) {
    // Silent cleanup failure
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    const hash = window.location.hash;
    return hash.includes('type=recovery') || hash.includes('type=password_recovery');
  });
  const subscriptionRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (initializedRef.current) return;
    initializedRef.current = true;

    // Safety timeout to prevent infinite loading state
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('AuthContext: Safety timeout triggered - forcing loading to complete');
        setLoading(false);
      }
    }, 5000);

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext session error:', error.message);
          if (error.message?.includes('JWT') || error.message?.includes('exp') || error.message?.includes('InvalidJWT')) {
            cleanupAuthState();
            await supabase.auth.signOut({ scope: 'global' });
            if (mountedRef.current) {
              setSession(null);
              setUser(null);
              setLoading(false);
            }
            return;
          }
        }
        
        const session = data?.session || null;
        
        if (mountedRef.current) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          clearTimeout(safetyTimeout);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mountedRef.current) return;
            
            if (event === 'PASSWORD_RECOVERY') {
              setIsPasswordRecovery(true);
            }
            
            if (event === 'TOKEN_REFRESHED' && !session) {
              cleanupAuthState();
              setSession(null);
              setUser(null);
              return;
            }

            // Subdomain guard: if the JWT's tenant_slug doesn't match the
            // current subdomain's bootstrap tenant, the user signed into
            // the wrong tenant. Sign them out immediately to prevent
            // cross-tenant data display.
            // Native app: no subdomain bootstrap — cache the JWT's tenant and
            // reload so the client/branding pick it up (no-op if unchanged).
            if (session && isNativeApp()) {
              syncNativeTenant(session);
            } else {
              const expectedTenant = (window as any).__TENANT_CONFIG__?.tenant;
              if (session && expectedTenant) {
                try {
                  const p = session.access_token.split('.')[1];
                  // JS `%` keeps the sign of the dividend — `(-len) % 4` gives a
                  // *negative* count for any non-multiple of 4. Use the
                  // canonical base64-padding formula instead.
                  const padded = p + '='.repeat((4 - (p.length % 4)) % 4);
                  const claims = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
                  // Platform owner (super-admin on the main tenant) is allowed
                  // to authenticate on any tenant subdomain — they need to be
                  // able to sign in to fix problems for individual tenants
                  // without bouncing back to gleeworld.org. Everyone else is
                  // signed out when their JWT's tenant doesn't match the
                  // subdomain they landed on.
                  //
                  // Demo-viewer accounts get the same bypass: the demo-login
                  // edge function mints a session for one of 3 fixed accounts
                  // whose JWT tenant_slug is fixed to their home tenant
                  // ('demo'), but they're also gw_tenant_members of the other
                  // showcase demo tenants (demo-choir/district/school/
                  // songwriter) so /try works on all five subdomains. Safe to
                  // bypass here for the same reason it's safe for the
                  // platform owner: current_tenant_id() resolves the ACTUAL
                  // subdomain's tenant from real membership (not the stale JWT
                  // claim), and demo_viewer sessions are blanket-restricted to
                  // read-only by RESTRICTIVE RLS regardless of which tenant
                  // they're scoped to — there's no write/escalation surface
                  // for a stale tenant_slug claim to exploit.
                  const isPlatformOwner =
                    claims.tenant_slug === 'main' &&
                    (claims.is_super_admin === true || claims.role === 'super-admin' || claims.role === 'super_admin');
                  const isDemoViewer = claims.demo_viewer === true;
                  if (claims.tenant_slug && claims.tenant_slug !== expectedTenant && !isPlatformOwner && !isDemoViewer) {
                    console.warn(`[auth] tenant mismatch: jwt=${claims.tenant_slug} bootstrap=${expectedTenant}. Redirecting to their tenant.`);
                    // Capture the tokens BEFORE tearing the session down —
                    // they're what lets the user land signed in instead of
                    // facing a second login form on their own site.
                    const accessToken = session.access_token;
                    const refreshToken = session.refresh_token;
                    // Resolve the host while the session is still live.
                    const host = await resolveTenantHost(claims.tenant_slug);
                    const target = buildTenantHandoffUrl(host, { accessToken, refreshToken });
                    // Deliberately NOT calling supabase.auth.signOut() here.
                    //
                    // Every scope hits the server: _signOut always calls
                    // admin.signOut(accessToken, scope), and scope:'local'
                    // only means "revoke this session" rather than "all of
                    // the user's sessions" — it does NOT mean "don't tell
                    // the server". Because GoTrue validates /user against
                    // the sessions table, revoking the session kills the
                    // access token too, so the tokens we hand off are dead
                    // on arrival and the tenant site shows
                    // "Auth session missing!". Verified by reproducing it.
                    //
                    // The session must stay alive: it's the same user
                    // continuing to their own tenant with it. Clearing this
                    // origin's storage is enough to prevent any cross-tenant
                    // data display, and we navigate away immediately.
                    cleanupAuthState();
                    setSession(null);
                    setUser(null);
                    // replace() so Back doesn't return to the wrong tenant's
                    // login page with a half-torn-down session.
                    window.location.replace(target);
                    return;
                  }
                  if ((isPlatformOwner || isDemoViewer) && claims.tenant_slug !== expectedTenant) {
                    console.info(`[auth] ${isPlatformOwner ? 'platform owner' : 'demo viewer'} on ${expectedTenant} (JWT tenant=${claims.tenant_slug}) — staying signed in`);
                  }
                } catch (e) {
                  console.warn('[auth] could not decode JWT for tenant check', e);
                }
              }
            }

            setSession(session);
            setUser(session?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              cleanupAuthState();
              setIsPasswordRecovery(false);
            }
          }
        );

        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('AuthContext init error:', error);
        if (mountedRef.current) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('AuthContext: Starting sign out...');
      
      // Clear auth state IMMEDIATELY
      setUser(null);
      setSession(null);
      setLoading(false); // Ensure loading is false to prevent white screen

      // Explicit sign-out must not replay the page we signed out from on
      // next login. ProtectedRoute stores redirectAfterAuth AFTER user goes
      // null, so clear any stale value now and flag it to skip storing.
      sessionStorage.removeItem('redirectAfterAuth');
      sessionStorage.setItem('explicit-signout', '1');
      
      // Clear any stored auth tokens
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        // NOTE: `gw_native_tenant` is deliberately NOT cleared here.
        // The picker is now a one-time step per install — subsequent
        // sign-ins re-run the my_tenants lookup and overwrite the cache
        // if the new email maps to a different tenant, so the branding
        // never gets "stuck" on the wrong account. Wiping on every
        // logout forced platform admins (whose memberships put them in
        // an ambiguous spot) to re-pick every session even after they'd
        // chosen a home.
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      // Sign out from Supabase (do this after clearing state to avoid loading screens)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (error) {
        console.error('AuthContext: Error signing out:', error);
      }
      
      // Don't do full page reload - let the component handle navigation
      console.log('AuthContext: Sign out complete, state cleared');
    } catch (error) {
      console.error('AuthContext: Sign out failed:', error);
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  const resetAuth = async () => {
    console.log('AuthContext: Resetting auth...');
    setLoading(true);
    setUser(null);
    setSession(null);
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.warn('AuthContext: Reset auth signout failed:', error);
    }
    
    setLoading(false);
  };

  const value = {
    user,
    session,
    loading,
    isPasswordRecovery,
    signOut,
    resetAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
