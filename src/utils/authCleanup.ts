
export const cleanupAuthState = () => {
  console.log('Cleaning up auth state...');
  
  try {
    // Only remove specific auth keys, not all localStorage
    const keysToRemove: string[] = [];
    
    // Check for Supabase auth keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') && key.includes('oopmlreysjzuxzylyheb')) {
        keysToRemove.push(key);
      }
    });
    
    // Remove the identified keys
    keysToRemove.forEach(key => {
      console.log('Removing localStorage key:', key);
      localStorage.removeItem(key);
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      const sessionKeysToRemove: string[] = [];
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') && key.includes('oopmlreysjzuxzylyheb')) {
          sessionKeysToRemove.push(key);
        }
      });
      
      sessionKeysToRemove.forEach(key => {
        console.log('Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      });
    }
    
    console.log('Auth state cleanup completed');
  } catch (error) {
    console.warn('Error during auth cleanup:', error);
  }
};

export const resetAuthState = async () => {
  console.log('Resetting complete auth state...');
  
  try {
    // Import supabase client
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Sign out globally first
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Global sign out completed');
    } catch (error) {
      console.warn('Global sign out failed:', error);
    }
    
    // Clean up all auth state
    cleanupAuthState();
    
    // Clear any additional browser state
    if (typeof window !== 'undefined') {
      // Clear any cached auth data
      try {
        const caches = await window.caches.keys();
        for (const cacheName of caches) {
          if (cacheName.includes('supabase') || cacheName.includes('auth')) {
            await window.caches.delete(cacheName);
            console.log('Cleared cache:', cacheName);
          }
        }
      } catch (error) {
        console.warn('Cache cleanup failed:', error);
      }
    }
    
    console.log('Complete auth reset finished');
    
    // Force page reload to ensure clean state
    window.location.href = '/auth';
  } catch (error) {
    console.error('Auth reset failed:', error);
    // Fallback: still try to redirect
    window.location.href = '/auth';
  }
};
