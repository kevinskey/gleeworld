import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UNIFIED_MODULES, getActiveModules } from '@/config/unified-modules';
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
    console.log('🚨 useSimplifiedModuleAccess: HOOK CALLED!');
    console.log('🚨 useSimplifiedModuleAccess: userId param:', userId);
    console.log('🚨 useSimplifiedModuleAccess: user from auth:', user);
    
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
          .select('role, is_super_admin, is_exec_board, is_admin, email')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (profileError) throw profileError;

        // Get email-based permissions
        let emailPermissions: string[] = [];
        if (profile?.email) {
          const { data: emailPerms } = await supabase.rpc('get_user_username_permissions', {
            user_email_param: profile.email
          });
          emailPermissions = emailPerms?.map((p: any) => p.module_name) || [];
          console.log('🔍 Email permissions for', profile.email, ':', emailPermissions);
        }

        console.log('🔍 useSimplifiedModuleAccess: DEBUGGING EXECUTIVE ACCESS');
        console.log('🔍 Target User ID:', targetUserId);
        console.log('🔍 User Profile Data:', profile);
        console.log('🔍 Is Exec Board?', profile?.is_exec_board);
        console.log('🔍 Role:', profile?.role);
        console.log('🔍 Is Super Admin?', profile?.is_super_admin);
        console.log('🔍 Is Admin?', profile?.is_admin);

        // Get explicit permissions from database via RPC
        console.log('🔍 useSimplifiedModuleAccess: calling get_user_modules RPC for user:', targetUserId);
        const { data: userModules, error: moduleError } = await supabase
          .rpc('get_user_modules', { p_user: targetUserId });

        console.log('🔍 useSimplifiedModuleAccess: RPC response:', { userModules, moduleError });

        if (moduleError) {
          console.error('🚨 useSimplifiedModuleAccess: RPC error:', moduleError);
          throw moduleError;
        }

        // Create a mapping from database module names to frontend module IDs
        const moduleMapping: Record<string, string> = {
          // Communications
          'email-management': 'email-management',
          'internal-communications': 'community-hub', 
          'notifications': 'notifications',
          'pr-coordinator': 'pr-coordinator',
          'pr-manager': 'pr-hub',
          'scheduling-module': 'scheduling-module',
          'service-management': 'service-management',
          'calendar-management': 'calendar-management',
          'buckets-of-love': 'buckets-of-love',
          'glee-writing': 'glee-writing',
          'fan-engagement': 'fan-engagement',
          
          // Member Management
          'user-management': 'user-management',
          'attendance-management': 'attendance-management',
          'tour-management': 'tour-management',
          'booking-forms': 'booking-forms',
          'alumnae-portal': 'alumnae-portal',
          'auditions': 'auditions',
          'permissions': 'permissions',
          'wellness': 'wellness',
          'wardrobe': 'wardrobe',
          
          // Musical Leadership
          'music-library': 'music-library',
          'media-library': 'music-library',
          'student-conductor': 'student-conductor',
          'section-leader': 'section-leader',
          'sight-singing-management': 'sight-singing-management',
          'sight-reading-preview': 'sight-reading-preview',
          'sight-reading-generator': 'sight-reading-generator',
          'member-sight-reading-studio': 'member-sight-reading-studio',
          'librarian': 'librarian',
          'radio-management': 'radio-management',
          'karaoke': 'karaoke',
          
          // Finances
          'contracts': 'contracts',
          'budgets': 'budgets',
          'receipts-records': 'receipts-records',
          'approval-system': 'approval-system',
          'glee-ledger': 'glee-ledger',
          'dues-collection': 'dues-collection',
          'monthly-statements': 'monthly-statements',
          'check-requests': 'check-requests',
          'merch-store': 'merch-store',
          'ai-financial': 'ai-financial',
          
          // Tools & Utilities
          'ai-tools': 'ai-tools',
          'hero-manager': 'hero-manager',
          'press-kits': 'press-kits',
          'first-year-console': 'first-year-console',
          'settings': 'settings',
          
          // Executive Board - Map database modules to frontend modules
          'executive-board': 'executive',
          'executive-board-management': 'executive',
          'executive-functions': 'executive'
        };

        // Get module permissions from RPC
        const grantedModuleIds = new Set();
        if (userModules && Array.isArray(userModules)) {
          userModules.forEach((module: any) => {
            console.log('🔍 Processing module:', module);
            if (module.can_view) {
              const frontendModuleId = moduleMapping[module.module_key] || module.module_key;
              console.log(`🔍 Mapping ${module.module_key} -> ${frontendModuleId}`);
              grantedModuleIds.add(frontendModuleId);
            }
          });
        }

        console.log('🔍 useSimplifiedModuleAccess: granted module IDs =', Array.from(grantedModuleIds));
        console.log('🔍 useSimplifiedModuleAccess: profile is_exec_board =', profile?.is_exec_board);
        console.log('🔍 useSimplifiedModuleAccess: profile role =', profile?.role);
        console.log('🔍 useSimplifiedModuleAccess: profile is_super_admin =', profile?.is_super_admin);
        console.log('🔍 useSimplifiedModuleAccess: profile is_admin =', profile?.is_admin);
        console.log('🔍 useSimplifiedModuleAccess: available active modules =', getActiveModules().map(m => m.id));
        
        // Build access list based on permissions using only active modules
        const activeModules = getActiveModules();
        const accessList: ModuleAccess[] = activeModules.map(module => {
          // Super admin gets everything (check multiple fields for safety)
          if (profile?.is_super_admin || profile?.role === 'super-admin' || profile?.role === 'admin') {
            console.log('🔥 Super admin access granted for module:', module.id);
            return {
              moduleId: module.id,
              hasAccess: true,
              source: 'super_admin' as const
            };
          }

          // Check email-based permissions first (highest priority)
          const modulePermissionNames = [module.id, module.id.replace('-', '_')];
          // Special case: librarian permission grants access to music-library
          if (module.id === 'music-library' && emailPermissions.includes('librarian')) {
            modulePermissionNames.push('librarian');
          }
          
          if (modulePermissionNames.some(name => emailPermissions.includes(name))) {
            console.log('📧 Email permission found for module:', module.id, 'via permission:', modulePermissionNames.find(name => emailPermissions.includes(name)));
            return {
              moduleId: module.id,
              hasAccess: true,
              source: 'explicit_permission' as const
            };
          }

          // Check if user has explicit permission for this module
          if (grantedModuleIds.has(module.id)) {
            console.log('✅ Explicit permission found for module:', module.id);
            return {
              moduleId: module.id,
              hasAccess: true,
              source: 'explicit_permission' as const
            };
          }

          // Standard members get default member modules (regardless of exec board status)
          if (profile?.role === 'member' && STANDARD_MEMBER_MODULE_IDS.includes(module.id)) {
            console.log('👤 Member default access for module:', module.id);
            return {
              moduleId: module.id,
              hasAccess: true,
              source: 'member_default' as const
            };
          }

          // No access by default (users only get explicitly granted modules via email or database)
          console.log('❌ No access for module:', module.id);
            return {
              moduleId: module.id,
              hasAccess: false,
              source: 'explicit_permission' as const
            };
          });

        console.log('🔍 Final access list count:', accessList.filter(a => a.hasAccess).length);
        console.log('🔍 Final accessible modules:', accessList.filter(a => a.hasAccess).map(a => `${a.moduleId} (${a.source})`));
        
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
    
    const result = getActiveModules().filter(module => 
      accessibleModuleIds.includes(module.id)
    );
    
    console.log('🎯 useSimplifiedModuleAccess: final accessible modules =', result.map(m => m.id));
    return result;
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