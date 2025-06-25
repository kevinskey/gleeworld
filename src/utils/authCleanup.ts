
export const cleanupAuthState = () => {
  console.log('Cleaning up auth state...');
  
  try {
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-oopmlreysjzuxzylyheb')) {
        console.log('Removing localStorage key:', key);
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-oopmlreysjzuxzylyheb')) {
          console.log('Removing sessionStorage key:', key);
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log('Auth state cleanup completed');
  } catch (error) {
    console.warn('Error during auth cleanup:', error);
  }
};
