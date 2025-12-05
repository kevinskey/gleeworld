import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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
  } catch (error) {
    // Silent cleanup failure
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (initializedRef.current) return;
    initializedRef.current = true;

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
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mountedRef.current) return;
            
            if (event === 'TOKEN_REFRESHED' && !session) {
              cleanupAuthState();
              setSession(null);
              setUser(null);
              return;
            }
            
            setSession(session);
            setUser(session?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              cleanupAuthState();
            }
          }
        );

        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('AuthContext init error:', error);
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
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
      
      // Immediate redirect without reload to prevent white screen
      window.location.replace('/');
    } catch (error) {
      console.error('AuthContext: Sign out failed:', error);
      setUser(null);
      setSession(null);
      setLoading(false);
      window.location.replace('/');
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
    signOut,
    resetAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
