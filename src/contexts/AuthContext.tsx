
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/utils/authCleanup";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
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

    // Prevent multiple initializations
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    // Initialize auth state check
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state...');
        
        // Get the current session without triggering auth state changes
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
        }
        
        if (mountedRef.current) {
          console.log('Initial session retrieved:', session?.user?.id || 'no user');
          setSession(session);
          setUser(session?.user ?? null);
          // Only set loading to false after we've checked for an existing session
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

    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Set up auth state listener - only once
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id || 'no user');
        
        if (!mountedRef.current) return;
        
        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in');
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'INITIAL_SESSION') {
          // Don't override session state on INITIAL_SESSION if we already have one
          console.log('Initial session event - checking if we need to update');
          if (!user && session) {
            console.log('Setting session from initial session event');
            setSession(session);
            setUser(session?.user ?? null);
          }
        }
        
        // Only set loading to false after we've processed the initial session
        if (event !== 'INITIAL_SESSION' || !loading) {
          setLoading(false);
        }
      }
    );

    subscriptionRef.current = subscription;

    // Initialize auth state after setting up the listener
    initializeAuth();

    return () => {
      mountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // Set loading state
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Clean up auth state
      cleanupAuthState();
      
      // Clear local state
      setUser(null);
      setSession(null);
      setLoading(false);
      
      console.log('Sign out completed');
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out failed:', error);
      // Force cleanup and redirect even on error
      cleanupAuthState();
      setUser(null);
      setSession(null);
      setLoading(false);
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
