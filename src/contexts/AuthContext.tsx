
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState, resetAuthState } from "@/utils/authCleanup";

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
        console.log('Initializing auth state...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear corrupted state and redirect to auth
          await resetAuthState();
          return;
        }
        
        if (mountedRef.current) {
          console.log('Session retrieved:', session?.user?.id || 'no user');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id || 'no user');
        
        if (!mountedRef.current) return;
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN') {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Handle token refresh without changing loading state
          setSession(session);
          setUser(session?.user ?? null);
        }
      }
    );

    subscriptionRef.current = subscription;
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
      console.log('Starting sign out...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      cleanupAuthState();
      setUser(null);
      setSession(null);
      setLoading(false);
      
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out failed:', error);
      cleanupAuthState();
      setUser(null);
      setSession(null);
      setLoading(false);
      window.location.href = '/auth';
    }
  };

  const resetAuth = async () => {
    console.log('Resetting auth from context...');
    setLoading(true);
    setUser(null);
    setSession(null);
    await resetAuthState();
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
