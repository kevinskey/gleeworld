import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UNIFIED_MODULES } from '@/config/unified-modules';

// Standard modules that ALL members get automatically
const STANDARD_MEMBER_MODULES = [
  'community-hub',
  'music-library', 
  'calendar',
  'attendance',
  'check-in-check-out'
];

export interface ModuleAccess {
  moduleId: string;
  hasAccess: boolean;
  source: 'super_admin' | 'member_default' | 'explicit_permission';
}

export const useSimplifiedModuleAccess = (userId?: string) => {
  const { user } = useAuth();
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModuleAccess = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Determine which user to check
        const targetUserId = userId || user?.id;
        if (!targetUserId) {
          setModuleAccess([]);
          setLoading(false);
          return;
        }

        // Get user profile  
        const { data: profile, error: profileError } = await supabase
          .from('gw_profiles')
          .select('role, is_super_admin, is_exec_board')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (profileError) throw profileError;

        // Use the get_user_modules RPC for comprehensive permission checking
        const { data: userModules, error: moduleError } = await supabase
          .rpc('get_user_modules', { p_user: targetUserId });

        if (moduleError) throw moduleError;

        console.log('🔍 useSimplifiedModuleAccess: user modules from RPC =', userModules);

        // Create a mapping from database module names to frontend module IDs
        const moduleMapping: Record<string, string> = {
          'email-management': 'email-management',
          'internal-communications': 'community-hub', 
          'music-library': 'music-library',
          'scheduling-module': 'calendar-management',
          'attendance-management': 'attendance-management',
          'wardrobe-module': 'wardrobe',
          'finances': 'budgets',
          'radio-management': 'radio-management',
          'handbook': 'handbook',
          'directory': 'user-management',
          'media-library': 'music-library',
          'executive-board': 'executive',
          'settings': 'settings',
          'auditions-management': 'auditions',
          'librarian': 'librarian',
          'tour-management': 'tour-management',
          'booking-forms': 'booking-forms',
          'alumnae-portal': 'alumnae-portal',
          'notifications': 'notifications',
          'pr-coordinator': 'pr-coordinator',
          'service-management': 'service-management',
          'buckets-of-love': 'buckets-of-love',
          'wellness': 'wellness',
          'student-conductor': 'student-conductor',
          'section-leader': 'section-leader',
          'sight-singing-management': 'sight-singing-management',
          'contracts': 'contracts',
          'glee-ledger': 'glee-ledger',
          'calendar-management': 'calendar-management',
          'receipts-records': 'receipts-records',
          'monthly-statements': 'monthly-statements',
          'check-requests': 'check-requests',
          'ai-tools': 'ai-tools',
          'press-kits': 'press-kits',
          'hero-manager': 'hero-manager',
          'fan-engagement': 'fan-engagement',
          'glee-writing': 'glee-writing',
          'first-year-console': 'first-year-console',
          'karaoke': 'karaoke'
        };

        // Get module permissions from RPC
        const grantedModuleIds = new Set();
        if (userModules && Array.isArray(userModules)) {
          userModules.forEach((module: any) => {
            if (module.can_view) {
              const frontendModuleId = moduleMapping[module.module_key] || module.module_key;
              grantedModuleIds.add(frontendModuleId);
            }
          });
        }

        console.log('🔍 useSimplifiedModuleAccess: granted module IDs =', Array.from(grantedModuleIds));

        // Build access list
        const accessList: ModuleAccess[] = UNIFIED_MODULES
          .filter(module => module.isActive)
          .map(module => {
            // Super admin gets everything
            if (profile?.is_super_admin) {
              return {
                moduleId: module.id,
                hasAccess: true,
                source: 'super_admin' as const
              };
            }

            // Members get standard modules
            if (profile?.role === 'member' && STANDARD_MEMBER_MODULES.includes(module.id)) {
              return {
                moduleId: module.id,
                hasAccess: true,
                source: 'member_default' as const
              };
            }

            // Executive board and explicit permissions
            if (grantedModuleIds.has(module.id)) {
              return {
                moduleId: module.id,
                hasAccess: true,
                source: 'explicit_permission' as const
              };
            }

            // No access by default
            return {
              moduleId: module.id,
              hasAccess: false,
              source: 'explicit_permission' as const
            };
          });

        setModuleAccess(accessList);
      } catch (err) {
        console.error('Error fetching module access:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setModuleAccess([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModuleAccess();
  }, [userId, user?.id]);

  // Helper functions
  const hasAccess = (moduleId: string): boolean => {
    return moduleAccess.find(m => m.moduleId === moduleId)?.hasAccess || false;
  };

  const getAccessibleModules = () => {
    const accessibleModuleIds = moduleAccess
      .filter(m => m.hasAccess)
      .map(m => m.moduleId);
    
    return UNIFIED_MODULES.filter(module => 
      accessibleModuleIds.includes(module.id) && module.isActive
    );
  };

  const getAccessSource = (moduleId: string) => {
    return moduleAccess.find(m => m.moduleId === moduleId)?.source;
  };

  return {
    moduleAccess,
    loading,
    error,
    hasAccess,
    getAccessibleModules,
    getAccessSource
  };
};