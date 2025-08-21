
import { useState, useEffect } from 'react';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { useUserModuleGrants } from '@/hooks/useUserModuleGrants';
import { ModuleWithPermissions, ModuleFilterOptions } from '@/types/unified-modules';

interface UseUnifiedModulesOptions extends ModuleFilterOptions {
  userId?: string;
}

export const useUnifiedModules = (options: UseUnifiedModulesOptions = {}) => {
  const [modules, setModules] = useState<ModuleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { grants, loading: grantsLoading, error: grantsError, refetch } = useUserModuleGrants(options.userId);

  useEffect(() => {
    try {
      setLoading(grantsLoading);
      setError(grantsError);

      if (grantsLoading) return;

      console.log('useUnifiedModules - Processing modules with grants:', grants.length);

      // Get all unified modules and enhance with permission information
      const enhancedModules = UNIFIED_MODULES.map(module => {
        // Find matching grant for this module
        const grant = grants.find(g => 
          g.module_key === module.id || 
          g.module_name === module.title ||
          g.module_name === module.name
        );

        // Check role-based access
        const hasRoleAccess = !module.requiredRoles || 
          module.requiredRoles.length === 0 || 
          (options.userRole && module.requiredRoles.includes(options.userRole));

        // Check executive position access
        const hasExecAccess = !module.requiredExecPositions || 
          module.requiredExecPositions.length === 0 || 
          (options.execPosition && module.requiredExecPositions.includes(options.execPosition));

        // Admin override
        const isAdminOverride = options.isAdmin === true;

        // Determine final permissions
        const canAccess = grant?.can_view || hasRoleAccess || hasExecAccess || isAdminOverride;
        const canManage = grant?.can_manage || isAdminOverride;
        const hasPermission = canAccess;

        return {
          ...module,
          canAccess,
          canManage,
          hasPermission
        } as ModuleWithPermissions;
      });

      // Apply filters
      let filteredModules = enhancedModules;

      if (options.category) {
        filteredModules = filteredModules.filter(m => m.category === options.category);
      }

      if (options.showInactive !== true) {
        filteredModules = filteredModules.filter(m => m.isActive);
      }

      console.log('useUnifiedModules - Final filtered modules:', filteredModules.length);
      setModules(filteredModules);
    } catch (err) {
      console.error('Error processing unified modules:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [grants, grantsLoading, grantsError, options]);

  const getAccessibleModules = () => {
    return modules.filter(m => m.hasPermission);
  };

  const getManageableModules = () => {
    return modules.filter(m => m.canManage);
  };

  const getModulesByCategory = (category: string) => {
    return modules.filter(m => m.category === category);
  };

  const hasModuleAccess = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    return module?.hasPermission || false;
  };

  const hasModuleManage = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    return module?.canManage || false;
  };

  return {
    modules,
    loading,
    error,
    getAccessibleModules,
    getManageableModules,
    getModulesByCategory,
    hasModuleAccess,
    hasModuleManage,
    refetch
  };
};
