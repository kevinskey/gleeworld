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
          .select('role, is_super_admin')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (profileError) throw profileError;

        // Get explicitly assigned modules
        const { data: explicitPermissions, error: permError } = await supabase
          .from('gw_user_module_permissions')
          .select('module_id')
          .eq('user_id', targetUserId)
          .eq('is_active', true);

        if (permError) throw permError;

        const explicitModuleIds = explicitPermissions?.map(p => p.module_id) || [];

        console.log('🔍 useSimplifiedModuleAccess debug:', {
          targetUserId,
          profile,
          explicitModuleIds,
          standardModules: STANDARD_MEMBER_MODULES
        });

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

            // Members (including exec board members) get standard modules
            if (profile?.role === 'member' && STANDARD_MEMBER_MODULES.includes(module.id)) {
              return {
                moduleId: module.id,
                hasAccess: true,
                source: 'member_default' as const
              };
            }

            // Explicitly assigned modules (for exec board and special permissions)
            if (explicitModuleIds.includes(module.id)) {
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