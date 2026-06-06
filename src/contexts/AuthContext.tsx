import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
            const expectedTenant = (window as any).__TENANT_CONFIG__?.tenant;
            if (session && expectedTenant) {
              try {
                const p = session.access_token.split('.')[1];
                const padded = p + '='.repeat((-p.length) % 4);
                const claims = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
                if (claims.tenant_slug && claims.tenant_slug !== expectedTenant) {
                  console.warn(`[auth] tenant mismatch: jwt=${claims.tenant_slug} bootstrap=${expectedTenant}. Signing out.`);
                  await supabase.auth.signOut();
                  cleanupAuthState();
                  setSession(null);
                  setUser(null);
                  alert(`This account belongs to a different organization (${claims.tenant_slug}). Please sign in on the correct site.`);
                  const correctHost = claims.tenant_slug === 'main' ? 'gleeworld.org' : `${claims.tenant_slug}.gleeworld.org`;
                  window.location.href = `https://${correctHost}/auth`;
                  return;
                }
              } catch (e) {
                console.warn('[auth] could not decode JWT for tenant check', e);
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
      
      // Clear any stored auth tokens
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
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
