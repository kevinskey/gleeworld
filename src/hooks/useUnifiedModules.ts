import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  standardizeModuleName, 
  getModuleDisplayName,
  type StandardModuleName 
} from '@/utils/moduleHelpers';
import { useUserModuleGrants } from './useUserModuleGrants';
import { ModuleGrant } from '@/lib/authz';
import { UNIFIED_MODULES } from '@/config/unified-modules';

export interface UnifiedModule {
  id: string;
  name: StandardModuleName | string;
  title: string;
  description: string;
  category: string;
  permissions: {
    canAccess: boolean;
    canManage: boolean;
    source: 'role' | 'individual' | 'executive' | 'admin' | 'none';
  };
  // Legacy properties for compatibility
  hasPermission?: (type: string) => boolean;
  canAccess?: boolean;
  canManage?: boolean;
  component?: any;
  icon?: any;
}

export interface ModuleFilterOptions {
  userRole?: string;
  userId?: string;
  execPosition?: string;
  isAdmin?: boolean;
  category?: string;
  showInactive?: boolean;
}

interface UseUnifiedModulesReturn {
  modules: UnifiedModule[];
  categories: string[];
  loading: boolean;
  error: string | null;
  getModuleById: (id: string) => UnifiedModule | undefined;
  getModulesByCategory: (category: string) => UnifiedModule[];
  getAccessibleModules: () => UnifiedModule[];
  getManageableModules: () => UnifiedModule[];
  refetch: () => Promise<void>;
}

export const useUnifiedModules = (filterOptions?: ModuleFilterOptions): UseUnifiedModulesReturn => {
  const [allModules, setAllModules] = useState<UnifiedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🔍 useUnifiedModules: filterOptions =', filterOptions);
  
  // Use the new module grants system
  const { grants: moduleGrants, loading: grantsLoading } = useUserModuleGrants(filterOptions?.userId);
  
  console.log('🔍 useUnifiedModules: filterOptions =', filterOptions);
  console.log('🔍 useUnifiedModules: moduleGrants =', { moduleGrants, grantsLoading, count: moduleGrants?.length });
  console.log('🔍 useUnifiedModules: allModules =', { allModules, count: allModules?.length });

  const fetchBaseModules = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch base modules from database
      const { data: moduleData, error: moduleError } = await supabase
        .from('gw_modules')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (moduleError) throw moduleError;

      // Convert to UnifiedModule format with standardized names and legacy compatibility
      const baseModules: UnifiedModule[] = (moduleData || []).map(module => {
        const baseModule: UnifiedModule = {
          id: module.key || module.name, // Use key if available
          name: standardizeModuleName(module.name),
          title: getModuleDisplayName(module.name),
          description: module.description || '',
          category: module.category || 'general',
          permissions: {
            canAccess: false,
            canManage: false,
            source: 'none'
          },
          // Legacy compatibility properties - will be updated with grants
          canAccess: false,
          canManage: false,
          hasPermission: () => false
        };
        return baseModule;
      });

      setAllModules(baseModules);
    } catch (err) {
      console.error('Error fetching base modules:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseModules();
  }, []);

  // Merge module data with user grants and frontend config
  const modules = allModules.map(module => {
    const grant = moduleGrants.find(g => g.module_key === module.id || g.module_key === module.name);
    
    // Find the corresponding frontend module definition
    const frontendModule = UNIFIED_MODULES.find(fm => 
      fm.id === module.id || 
      fm.name === module.name || 
      fm.dbFunctionName === module.id ||
      fm.dbFunctionName === module.name
    );
    
    console.log(`🔍 Processing module ${module.name}:`, {
      module: module.name,
      moduleId: module.id,
      grant,
      frontendModule: frontendModule?.name,
      isAdmin: filterOptions?.isAdmin
    });
    
    // Admin override
    const isAdminOverride = filterOptions?.isAdmin;
    
    const canAccess = isAdminOverride || grant?.can_view || false;
    const canManage = isAdminOverride || grant?.can_manage || false;
    
    return {
      ...module,
      // Merge in frontend module properties if found
      ...(frontendModule && {
        icon: frontendModule.icon,
        component: frontendModule.component,
        fullPageComponent: frontendModule.fullPageComponent,
        iconColor: frontendModule.iconColor
      }),
      permissions: {
        canAccess,
        canManage,
        source: isAdminOverride ? 'admin' as const : grant ? 'role' as const : 'none' as const
      },
      // Update legacy properties for compatibility
      canAccess,
      canManage,
      hasPermission: (type: string) => {
        if (type === 'view' || type === 'access') return canAccess;
        if (type === 'manage') return canManage;
        return false;
      }
    };
  });

  // Apply filters
  const filteredModules = modules.filter(module => {
    if (filterOptions?.category && module.category !== filterOptions.category) {
      return false;
    }
    if (filterOptions?.showInactive === false && !module.permissions.canAccess) {
      return false;
    }
    return true;
  });

  const getModuleById = (id: string) => {
    return modules.find(m => m.id === id || m.name === id);
  };

  const getModulesByCategory = (category: string) => {
    return modules.filter(m => m.category === category);
  };

  const getAccessibleModules = () => {
    return modules.filter(m => m.permissions.canAccess);
  };

  const getManageableModules = () => {
    return modules.filter(m => m.permissions.canManage);
  };

  const categories = [...new Set(modules.map(m => m.category))];

  return {
    modules: filteredModules,
    categories,
    loading: loading || grantsLoading,
    error,
    getModuleById,
    getModulesByCategory,
    getAccessibleModules,
    getManageableModules,
    refetch: fetchBaseModules
  };
};

export const useUnifiedModulesSimple = () => {
  const [modules, setModules] = useState<UnifiedModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_modules')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        const moduleList: UnifiedModule[] = (data || []).map(module => ({
          id: module.name,
          name: standardizeModuleName(module.name),
          title: getModuleDisplayName(module.name),
          description: module.description || '',
          category: module.category || 'general',
          permissions: {
            canAccess: false,
            canManage: false,
            source: 'none'
          }
        }));

        setModules(moduleList);
      } catch (err) {
        console.error('Error fetching modules:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  return { modules, loading };
};