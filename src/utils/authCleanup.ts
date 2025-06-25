
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
