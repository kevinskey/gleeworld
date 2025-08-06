import { LucideIcon } from 'lucide-react';

// Action types
export type ActionType = 'modal' | 'navigation' | 'function';

// Base action definition
export interface UnifiedAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  category: string;
  type: ActionType;
  isNew?: boolean;
  isActive: boolean;
  // Action behavior
  onClick?: () => void;
  route?: string; // For navigation actions
  modalComponent?: React.ComponentType<any>; // For modal actions
  // Database mapping for permissions
  dbFunctionName?: string;
  // Role restrictions (in addition to database permissions)
  requiredRoles?: string[];
  // Executive position restrictions
  requiredExecPositions?: string[];
}

// Action category definition
export interface UnifiedActionCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  actions: UnifiedAction[];
}

// Action with permission information
export interface ActionWithPermissions extends UnifiedAction {
  canAccess: boolean;
  canManage: boolean;
  hasPermission: boolean;
}

// Action props interface for components
export interface ActionProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    is_admin?: boolean;
    is_super_admin?: boolean;
    created_at?: string;
  };
  onClose?: () => void;
  onSuccess?: () => void;
}

// Permission types for actions
export interface ActionPermission {
  actionId: string;
  canAccess: boolean;
  canManage: boolean;
  source: 'role' | 'executive_position' | 'admin' | 'username';
}

// Filter options for actions
export interface ActionFilterOptions {
  category?: string;
  type?: ActionType;
  userRole?: string;
  execPosition?: string;
  isAdmin?: boolean;
  permissions?: ActionPermission[];
  showInactive?: boolean;
}