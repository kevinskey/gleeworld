
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
        
        // Get existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
        } else {
          console.log('AuthContext: Initial session retrieved:', session?.user?.id || 'no user');
          if (mountedRef.current) {
            setSession(session);
            setUser(session?.user ?? null);
          }
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
            
            // Update state immediately for all events
            setSession(session);
            setUser(session?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              console.log('AuthContext: User signed out, clearing state');
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              console.log('AuthContext: User signed in/token refreshed');
            }
          }
        );

        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('AuthContext: Failed to initialize auth:', error);
      } finally {
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
      
      // Clear auth state IMMEDIATELY and set loading
      setUser(null);
      setSession(null);
      setLoading(true);
      
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
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('AuthContext: Error signing out:', error);
      }
      
      // Small delay to ensure state propagation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setLoading(false);
      
      // Force redirect to home page instead of auth page
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
