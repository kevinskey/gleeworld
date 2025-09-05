
import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  console.log('AuthContext: Cleaning up auth state...');
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log('AuthContext: Removing localStorage key:', key);
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log('AuthContext: Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('AuthContext: Error during auth cleanup:', error);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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
        console.log('AuthContext: Initializing auth state...');
        
        // Get existing session quickly without retries to reduce loading time
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          // If we get a JWT error, clean up auth state and continue
          if (error.message?.includes('JWT') || error.message?.includes('exp')) {
            console.log('AuthContext: JWT expired, cleaning up auth state');
            cleanupAuthState();
          }
        }
        
        const session = data?.session || null;
        console.log('AuthContext: Initial session retrieved:', {
          hasSession: !!session,
          userId: session?.user?.id || 'no user',
          userEmail: session?.user?.email,
          sessionExpiry: session?.expires_at
        });
        
        if (mountedRef.current) {
          setSession(session);
          setUser(session?.user ?? null);
          console.log('AuthContext: State updated - user:', session?.user?.email || 'none');
          // Set loading to false AFTER setting state
          setLoading(false);
        }

        // Set up auth state listener AFTER initial session check
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('AuthContext: Auth state changed:', event, session?.user?.id || 'no user');
            console.log('AuthContext: Session details:', {
              hasSession: !!session,
              hasUser: !!session?.user,
              userEmail: session?.user?.email,
              userMetadata: session?.user?.user_metadata
            });
            
            if (!mountedRef.current) return;
            
            // Handle JWT errors specifically
            if (event === 'TOKEN_REFRESHED' && !session) {
              console.log('AuthContext: Token refresh failed, cleaning up auth state');
              cleanupAuthState();
              setSession(null);
              setUser(null);
              return;
            }
            
            // Update state immediately for all events
            setSession(session);
            setUser(session?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              console.log('AuthContext: User signed out, clearing state');
              cleanupAuthState();
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              console.log('AuthContext: User signed in/token refreshed');
            }
          }
        );

        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('AuthContext: Failed to initialize auth:', error);
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
