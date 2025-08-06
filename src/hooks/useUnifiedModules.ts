import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  UnifiedModule, 
  ModuleWithPermissions, 
  ModulePermission,
  ModuleFilterOptions 
} from '@/types/unified-modules';
import { 
  UNIFIED_MODULES, 
  UNIFIED_MODULE_CATEGORIES,
  getUnifiedModuleById,
  getUnifiedModuleByName,
  getUnifiedCategoryById 
} from '@/config/unified-modules';

interface UseUnifiedModulesReturn {
  modules: ModuleWithPermissions[];
  categories: typeof UNIFIED_MODULE_CATEGORIES;
  loading: boolean;
  error: string | null;
  getModuleById: (id: string) => ModuleWithPermissions | null;
  getModulesByCategory: (categoryId: string) => ModuleWithPermissions[];
  getAccessibleModules: () => ModuleWithPermissions[];
  getManageableModules: () => ModuleWithPermissions[];
  refetch: () => Promise<void>;
}

export const useUnifiedModules = (filterOptions?: ModuleFilterOptions): UseUnifiedModulesReturn => {
  const [modules, setModules] = useState<ModuleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchModulePermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all base modules
      let filteredModules = [...UNIFIED_MODULES];

      // Apply basic filters
      if (filterOptions?.category) {
        filteredModules = filteredModules.filter(m => m.category === filterOptions.category);
      }
      
      if (!filterOptions?.showInactive) {
        filteredModules = filteredModules.filter(m => m.isActive);
      }

      // If no user context, return modules without permissions
      if (!filterOptions?.userRole && !filterOptions?.execPosition && !filterOptions?.isAdmin) {
        const modulesWithPerms = filteredModules.map(module => ({
          ...module,
          canAccess: false,
          canManage: false,
          hasPermission: false
        }));
        setModules(modulesWithPerms);
        return;
      }

      // Fetch permissions from database for executive positions
      let dbPermissions: ModulePermission[] = [];
      
      if (filterOptions?.execPosition) {
        try {
          const { data: positionFunctions, error: positionError } = await supabase
            .from('gw_executive_position_functions')
            .select(`
              can_access,
              can_manage,
              function:gw_app_functions!inner(name, module)
            `)
            .eq('position', filterOptions.execPosition as any);

          if (positionError) throw positionError;

          // Map database permissions to our format
          dbPermissions = positionFunctions?.map(pf => ({
            moduleId: pf.function?.module || pf.function?.name || '',
            canAccess: pf.can_access || false,
            canManage: pf.can_manage || false,
            source: 'executive_position' as const
          })) || [];
        } catch (err) {
          console.error('Error fetching position permissions:', err);
        }
      }

      // Apply permissions to modules
      const modulesWithPermissions = filteredModules.map(module => {
        let canAccess = false;
        let canManage = false;

        // Admin override
        if (filterOptions?.isAdmin) {
          canAccess = true;
          canManage = true;
        } else {
          // Check database permissions by module name or dbFunctionName
          const dbPerm = dbPermissions.find(p => 
            p.moduleId === module.name || 
            p.moduleId === module.dbFunctionName ||
            p.moduleId === module.id
          );
          
          if (dbPerm) {
            canAccess = dbPerm.canAccess;
            canManage = dbPerm.canManage;
          }

          // Check role-based restrictions
          if (module.requiredRoles && filterOptions?.userRole) {
            const hasRequiredRole = module.requiredRoles.includes(filterOptions.userRole);
            if (!hasRequiredRole) {
              canAccess = false;
              canManage = false;
            }
          }

          // Check executive position restrictions
          if (module.requiredExecPositions && filterOptions?.execPosition) {
            const hasRequiredExecPosition = module.requiredExecPositions.includes(filterOptions.execPosition);
            if (!hasRequiredExecPosition) {
              canAccess = false;
              canManage = false;
            }
          }
        }

        return {
          ...module,
          canAccess,
          canManage,
          hasPermission: canAccess || canManage
        };
      });

      setModules(modulesWithPermissions);
    } catch (err: any) {
      console.error('Error fetching module permissions:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load modules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModulePermissions();
  }, [
    filterOptions?.category,
    filterOptions?.userRole,
    filterOptions?.execPosition,
    filterOptions?.isAdmin,
    filterOptions?.showInactive
  ]);

  const getModuleById = (id: string): ModuleWithPermissions | null => {
    return modules.find(m => m.id === id) || null;
  };

  const getModulesByCategory = (categoryId: string): ModuleWithPermissions[] => {
    return modules.filter(m => m.category === categoryId);
  };

  const getAccessibleModules = (): ModuleWithPermissions[] => {
    return modules.filter(m => m.canAccess);
  };

  const getManageableModules = (): ModuleWithPermissions[] => {
    return modules.filter(m => m.canManage);
  };

  return {
    modules,
    categories: UNIFIED_MODULE_CATEGORIES,
    loading,
    error,
    getModuleById,
    getModulesByCategory,
    getAccessibleModules,
    getManageableModules,
    refetch: fetchModulePermissions
  };
};

// Hook for simple module access without permissions
export const useUnifiedModulesSimple = () => {
  return {
    modules: UNIFIED_MODULES,
    categories: UNIFIED_MODULE_CATEGORIES,
    getModuleById: getUnifiedModuleById,
    getModuleByName: getUnifiedModuleByName,
    getCategoryById: getUnifiedCategoryById
  };
};