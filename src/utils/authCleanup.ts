
import { supabase } from '@/integrations/supabase/client';

export const cleanupAuthState = () => {
  console.log('authCleanup: Cleaning up auth state...');
  
  try {
    // Clean localStorage - Remove all Supabase auth keys (project-agnostic)
    const localStorageKeysToRemove: string[] = [];
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorageKeysToRemove.push(key);
      }
    });
    
    localStorageKeysToRemove.forEach(key => {
      console.log('authCleanup: Removing localStorage key:', key);
      localStorage.removeItem(key);
    });
    
    // Clean sessionStorage - Remove all Supabase auth keys
    if (typeof sessionStorage !== 'undefined') {
      const sessionStorageKeysToRemove: string[] = [];
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorageKeysToRemove.push(key);
        }
      });
      
      sessionStorageKeysToRemove.forEach(key => {
        console.log('authCleanup: Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      });
    }
    
    console.log('authCleanup: Auth state cleanup completed');
  } catch (error) {
    console.warn('authCleanup: Error during auth cleanup:', error);
  }
};

export const resetAuthState = async () => {
  console.log('authCleanup: Resetting complete auth state...');
  
  try {
    // Use regular import instead of dynamic import
    
    // Sign out globally first
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('authCleanup: Global sign out completed');
    } catch (error) {
      console.warn('authCleanup: Global sign out failed:', error);
    }
    
    // Clean up all auth state
    cleanupAuthState();
    
    console.log('authCleanup: Complete auth reset finished');
    
    // Force page reload to ensure clean state
    window.location.href = '/auth';
  } catch (error) {
    console.error('authCleanup: Auth reset failed:', error);
    // Fallback: still try to redirect
    window.location.href = '/auth';
  }
};
