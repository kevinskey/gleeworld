import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  UnifiedAction, 
  ActionWithPermissions, 
  ActionPermission,
  ActionFilterOptions 
} from '@/types/unified-actions';
import { 
  UNIFIED_ACTIONS, 
  UNIFIED_ACTION_CATEGORIES,
  getUnifiedActionById,
  getUnifiedActionByTitle,
  getUnifiedActionCategoryById 
} from '@/config/unified-actions';

interface UseUnifiedActionsReturn {
  actions: ActionWithPermissions[];
  categories: typeof UNIFIED_ACTION_CATEGORIES;
  loading: boolean;
  error: string | null;
  getActionById: (id: string) => ActionWithPermissions | null;
  getActionsByCategory: (categoryId: string) => ActionWithPermissions[];
  getAccessibleActions: () => ActionWithPermissions[];
  getManageableActions: () => ActionWithPermissions[];
  executeAction: (actionId: string, ...args: any[]) => void;
  refetch: () => Promise<void>;
}

export const useUnifiedActions = (filterOptions?: ActionFilterOptions): UseUnifiedActionsReturn => {
  const [actions, setActions] = useState<ActionWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchActionPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all base actions
      let filteredActions = [...UNIFIED_ACTIONS];

      // Apply basic filters
      if (filterOptions?.category) {
        filteredActions = filteredActions.filter(a => a.category === filterOptions.category);
      }
      
      if (filterOptions?.type) {
        filteredActions = filteredActions.filter(a => a.type === filterOptions.type);
      }
      
      if (!filterOptions?.showInactive) {
        filteredActions = filteredActions.filter(a => a.isActive);
      }

      // If no user context, return actions without permissions
      if (!filterOptions?.userRole && !filterOptions?.execPosition && !filterOptions?.isAdmin) {
        const actionsWithPerms = filteredActions.map(action => ({
          ...action,
          canAccess: false,
          canManage: false,
          hasPermission: false
        }));
        setActions(actionsWithPerms);
        return;
      }

      // Fetch permissions from database for executive positions
      let dbPermissions: ActionPermission[] = [];
      
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
            actionId: pf.function?.module || pf.function?.name || '',
            canAccess: pf.can_access || false,
            canManage: pf.can_manage || false,
            source: 'executive_position' as const
          })) || [];
        } catch (err) {
          console.error('Error fetching position permissions:', err);
        }
      }

      // Apply permissions to actions
      const actionsWithPermissions = filteredActions.map(action => {
        let canAccess = false;
        let canManage = false;

        // Admin override
        if (filterOptions?.isAdmin) {
          canAccess = true;
          canManage = true;
        } else {
          // Check database permissions by action title or dbFunctionName
          const dbPerm = dbPermissions.find(p => 
            p.actionId === action.title || 
            p.actionId === action.dbFunctionName ||
            p.actionId === action.id
          );
          
          if (dbPerm) {
            canAccess = dbPerm.canAccess;
            canManage = dbPerm.canManage;
          }

          // Check role-based restrictions
          if (action.requiredRoles && filterOptions?.userRole) {
            const hasRequiredRole = action.requiredRoles.includes(filterOptions.userRole);
            if (!hasRequiredRole) {
              canAccess = false;
              canManage = false;
            }
          }

          // Check executive position restrictions
          if (action.requiredExecPositions && filterOptions?.execPosition) {
            const hasRequiredExecPosition = action.requiredExecPositions.includes(filterOptions.execPosition);
            if (!hasRequiredExecPosition) {
              canAccess = false;
              canManage = false;
            }
          }
        }

        return {
          ...action,
          canAccess,
          canManage,
          hasPermission: canAccess || canManage
        };
      });

      setActions(actionsWithPermissions);
    } catch (err: any) {
      console.error('Error fetching action permissions:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load actions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActionPermissions();
  }, [
    filterOptions?.category,
    filterOptions?.type,
    filterOptions?.userRole,
    filterOptions?.execPosition,
    filterOptions?.isAdmin,
    filterOptions?.showInactive
  ]);

  const getActionById = (id: string): ActionWithPermissions | null => {
    return actions.find(a => a.id === id) || null;
  };

  const getActionsByCategory = (categoryId: string): ActionWithPermissions[] => {
    return actions.filter(a => a.category === categoryId);
  };

  const getAccessibleActions = (): ActionWithPermissions[] => {
    return actions.filter(a => a.canAccess);
  };

  const getManageableActions = (): ActionWithPermissions[] => {
    return actions.filter(a => a.canManage);
  };

  const executeAction = (actionId: string, ...args: any[]) => {
    const action = getActionById(actionId);
    if (!action) {
      toast({
        title: "Error",
        description: "Action not found",
        variant: "destructive",
      });
      return;
    }

    if (!action.hasPermission) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to execute this action",
        variant: "destructive",
      });
      return;
    }

    // Execute the action based on its type
    if (action.onClick) {
      action.onClick();
    } else if (action.route) {
      // Navigation will be handled by the component
      console.log(`Navigate to: ${action.route}`);
    } else {
      console.log(`Execute action: ${action.title}`);
    }
  };

  return {
    actions,
    categories: UNIFIED_ACTION_CATEGORIES,
    loading,
    error,
    getActionById,
    getActionsByCategory,
    getAccessibleActions,
    getManageableActions,
    executeAction,
    refetch: fetchActionPermissions
  };
};

// Hook for simple action access without permissions
export const useUnifiedActionsSimple = () => {
  return {
    actions: UNIFIED_ACTIONS,
    categories: UNIFIED_ACTION_CATEGORIES,
    getActionById: getUnifiedActionById,
    getActionByTitle: getUnifiedActionByTitle,
    getCategoryById: getUnifiedActionCategoryById
  };
};