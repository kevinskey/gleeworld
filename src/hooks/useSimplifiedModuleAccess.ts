import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { EXECUTIVE_MODULE_IDS, STANDARD_MEMBER_MODULE_IDS } from '@/config/executive-modules';

export interface ModuleAccess {
  moduleId: string;
  hasAccess: boolean;
  source: 'super_admin' | 'member_default' | 'executive_board' | 'explicit_permission';
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

        console.log('🔍 useSimplifiedModuleAccess: DEBUGGING EXECUTIVE ACCESS');
        console.log('🔍 Target User ID:', targetUserId);
        console.log('🔍 User Profile Data:', profile);
        console.log('🔍 Is Exec Board?', profile?.is_exec_board);
        console.log('🔍 Role:', profile?.role);
        console.log('🔍 Is Super Admin?', profile?.is_super_admin);

        // Build access list based on simple role-based logic
        const accessList: ModuleAccess[] = UNIFIED_MODULES
          .filter(module => module.isActive)
          .map(module => {
            console.log(`🔍 Processing module: ${module.id}`);
            
            // Super admin gets everything
            if (profile?.is_super_admin) {
              console.log(`✅ ${module.id}: Super admin access granted`);
              return {
                moduleId: module.id,
                hasAccess: true,
                source: 'super_admin' as const
              };
            }

            // Executive board members get executive modules
            if ((profile?.is_exec_board || profile?.role === 'executive') && EXECUTIVE_MODULE_IDS.includes(module.id)) {
              console.log(`✅ ${module.id}: Executive board access granted`);
              console.log(`🔍 Is exec board?`, profile?.is_exec_board);
              console.log(`🔍 Role is executive?`, profile?.role === 'executive');
              console.log(`🔍 Module in executive list?`, EXECUTIVE_MODULE_IDS.includes(module.id));
              return {
                moduleId: module.id,
                hasAccess: true,
                source: 'executive_board' as const
              };
            }

            // Members get standard modules
            if (profile?.role === 'member' && STANDARD_MEMBER_MODULE_IDS.includes(module.id)) {
              console.log(`✅ ${module.id}: Member access granted`);
              return {
                moduleId: module.id,
                hasAccess: true,
                source: 'member_default' as const
              };
            }

            // No access by default
            console.log(`❌ ${module.id}: No access granted`);
            return {
              moduleId: module.id,
              hasAccess: false,
              source: 'explicit_permission' as const
            };
          });

        console.log('🔍 EXECUTIVE_MODULE_IDS:', EXECUTIVE_MODULE_IDS);
        console.log('🔍 STANDARD_MEMBER_MODULE_IDS:', STANDARD_MEMBER_MODULE_IDS);
        console.log('🔍 Final access list count:', accessList.filter(a => a.hasAccess).length);
        console.log('🔍 Final accessible modules:', accessList.filter(a => a.hasAccess).map(a => a.moduleId));
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