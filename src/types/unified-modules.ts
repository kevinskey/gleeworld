import { LucideIcon } from 'lucide-react';

// Base module definition
export interface UnifiedModule {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  category: string;
  isNew?: boolean;
  isActive: boolean;
  component: React.ComponentType<any>;
  fullPageComponent?: React.ComponentType<any>;
  // Database mapping for permissions
  dbFunctionName?: string;
  // Role restrictions (in addition to database permissions)
  requiredRoles?: string[];
  // Executive position restrictions
  requiredExecPositions?: string[];
}

// Category definition
export interface UnifiedModuleCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  modules: UnifiedModule[];
}

// Module with permission information
export interface ModuleWithPermissions extends UnifiedModule {
  canAccess: boolean;
  canManage: boolean;
  hasPermission: boolean;
}

// Module props interface for components
export interface ModuleProps {
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
  isFullPage?: boolean;
  onNavigate?: (moduleId: string) => void;
}

// Permission types
export interface ModulePermission {
  moduleId: string;
  canAccess: boolean;
  canManage: boolean;
  source: 'role' | 'executive_position' | 'admin' | 'username';
}

// Filter options for modules
export interface ModuleFilterOptions {
  category?: string;
  userRole?: string;
  execPosition?: string;
  isAdmin?: boolean;
  permissions?: ModulePermission[];
  showInactive?: boolean;
}