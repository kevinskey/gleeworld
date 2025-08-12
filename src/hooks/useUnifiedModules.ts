import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  standardizeModuleName, 
  getModuleDisplayName,
  type StandardModuleName 
} from '@/utils/moduleHelpers';

export interface UnifiedModule {
  id: string;
  name: StandardModuleName | string;
  title: string;
  description: string;
  category: string;
  permissions: {
    canAccess: boolean;
    canManage: boolean;
    source: 'role' | 'individual' | 'executive' | 'none';
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
  const [modules, setModules] = useState<UnifiedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModulePermissions = async () => {
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
      let modulesWithPerms: UnifiedModule[] = (moduleData || []).map(module => {
        const baseModule: UnifiedModule = {
          id: module.name,
          name: standardizeModuleName(module.name),
          title: getModuleDisplayName(module.name),
          description: module.description || '',
          category: module.category || 'general',
          permissions: {
            canAccess: false,
            canManage: false,
            source: 'none'
          },
          // Legacy compatibility properties
          hasPermission: (type: string) => {
            if (type === 'view' || type === 'access') return baseModule.permissions.canAccess;
            if (type === 'manage') return baseModule.permissions.canManage;
            return false;
          },
          canAccess: false,
          canManage: false
        };
        return baseModule;
      });

      // Apply category filter
      if (filterOptions?.category) {
        modulesWithPerms = modulesWithPerms.filter(m => m.category === filterOptions.category);
      }

      // If no user-specific filters, return base modules
      if (!filterOptions?.userRole && !filterOptions?.execPosition && !filterOptions?.isAdmin) {
        setModules(modulesWithPerms);
        return;
      }

      // Fetch user permissions from role-based system
      if (filterOptions?.userRole) {
        const { data: rolePermissions, error: roleError } = await supabase
          .from('gw_role_module_permissions')
          .select('module_name, permission_type')
          .eq('role', filterOptions.userRole)
          .eq('is_active', true);

        if (roleError) throw roleError;

        // Apply role permissions
        modulesWithPerms = modulesWithPerms.map(module => {
          const rolePerms = rolePermissions?.filter(p => 
            standardizeModuleName(p.module_name) === module.name
          ) || [];
          
          const hasViewPerm = rolePerms.some(p => p.permission_type === 'view');
          const hasManagePerm = rolePerms.some(p => p.permission_type === 'manage');

          return {
            ...module,
            permissions: {
              canAccess: hasViewPerm || hasManagePerm,
              canManage: hasManagePerm,
              source: hasViewPerm || hasManagePerm ? 'role' : 'none'
            },
            // Update legacy properties for compatibility
            canAccess: hasViewPerm || hasManagePerm,
            canManage: hasManagePerm,
            hasPermission: (type: string) => {
              if (type === 'view' || type === 'access') return hasViewPerm || hasManagePerm;
              if (type === 'manage') return hasManagePerm;
              return false;
            }
          };
        });
      }

      // Admin override
      if (filterOptions?.isAdmin) {
        modulesWithPerms = modulesWithPerms.map(module => ({
          ...module,
          permissions: {
            canAccess: true,
            canManage: true,
            source: 'role'
          },
          // Update legacy properties for compatibility
          canAccess: true,
          canManage: true,
          hasPermission: () => true
        }));
      }

      setModules(modulesWithPerms);
    } catch (err) {
      console.error('Error fetching module permissions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModulePermissions();
  }, [filterOptions?.userRole, filterOptions?.execPosition, filterOptions?.isAdmin, filterOptions?.category]);

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
    modules,
    categories,
    loading,
    error,
    getModuleById,
    getModulesByCategory,
    getAccessibleModules,
    getManageableModules,
    refetch: fetchModulePermissions
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