
export const USER_ROLES = {
  VISITOR: 'visitor',
  FAN: 'fan',
  AUDITIONER: 'auditioner',
  ALUMNA: 'alumna',
  MEMBER: 'member',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const PERMISSIONS = [
  'view_own_contracts',
  'view_own_payments',
  'view_own_w9_forms',
  'sign_contracts',
  'submit_w9_forms',
  'view_all_contracts',
  'create_contracts',
  'manage_users',
  'view_all_payments',
  'view_system_settings',
  'admin_sign_contracts',
  'all_permissions',
  'delete_users',
  'manage_system_settings',
  'view_activity_logs',
  // Module-specific permissions
  'access_hero_management',
  'access_dashboard_settings',
  'access_youtube_management',
  'access_budget_creation',
  'access_contracts',
  'access_tour_planner',
  'access_handbook',
  'send_emails',
  'manage_username_permissions',
  'approve_budgets_treasurer',
  'approve_budgets_super_admin',
] as const;

export type Permission = typeof PERMISSIONS[number];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [USER_ROLES.VISITOR]: [
    // No permissions for visitors - they can only view public content
  ],
  [USER_ROLES.FAN]: [
    'view_own_contracts',
    'view_own_payments', 
    'view_own_w9_forms',
    'access_handbook',
  ],
  [USER_ROLES.AUDITIONER]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'access_handbook',
  ],
  [USER_ROLES.ALUMNA]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'submit_w9_forms',
    'access_handbook',
  ],
  [USER_ROLES.MEMBER]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'submit_w9_forms',
    'access_handbook',
  ],
  [USER_ROLES.ADMIN]: [
    'view_all_contracts',
    'create_contracts',
    'manage_users',
    'view_all_payments',
    'view_system_settings',
    'admin_sign_contracts',
    'access_hero_management',
    'access_dashboard_settings',
    'access_youtube_management',
    'send_emails',
    'manage_username_permissions',
    'access_tour_planner',
    'access_handbook',
  ],
  [USER_ROLES.SUPER_ADMIN]: [
    'all_permissions',
    'delete_users',
    'manage_system_settings',
    'view_activity_logs',
    'approve_budgets_super_admin',
    'access_handbook',
  ],
} as const;

// Dashboard module definitions
export const DASHBOARD_MODULES = {
  hero_management: {
    name: 'Hero Management',
    description: 'Manage homepage hero sections and carousel',
    permission: 'access_hero_management' as Permission,
  },
  dashboard_settings: {
    name: 'Dashboard Settings',
    description: 'Configure dashboard appearance and settings',
    permission: 'access_dashboard_settings' as Permission,
  },
  youtube_management: {
    name: 'YouTube Management',
    description: 'Sync and manage YouTube content',
    permission: 'access_youtube_management' as Permission,
  },
  budget_creation: {
    name: 'Budget Creation',
    description: 'Create and manage project budgets',
    permission: 'access_budget_creation' as Permission,
  },
  contracts: {
    name: 'Contracts',
    description: 'Create and manage contracts',
    permission: 'access_contracts' as Permission,
  },
  send_emails: {
    name: 'Email Campaigns',
    description: 'Send emails to members',
    permission: 'send_emails' as Permission,
  },
  manage_permissions: {
    name: 'Manage Permissions',
    description: 'Manage username-based module permissions',
    permission: 'manage_username_permissions' as Permission,
  },
  permissions_panel: {
    name: 'Permissions Panel',
    description: 'Advanced dashboard module permissions control',
    permission: 'manage_username_permissions' as Permission,
  },
  tour_planner: {
    name: 'Tour Planner',
    description: 'Plan and manage tours, cities, and tasks',
    permission: 'access_tour_planner' as Permission,
  },
  handbook: {
    name: 'Handbook',
    description: 'Official Glee Club handbook and executive board positions',
    permission: 'access_handbook' as Permission,
  },
} as const;

export type DashboardModule = keyof typeof DASHBOARD_MODULES;

export const hasPermission = (userRole: string, permission: string): boolean => {
  // Type guard to check if userRole is valid
  if (!Object.values(USER_ROLES).includes(userRole as UserRole)) {
    return false;
  }

  // Super admin has all permissions
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return true;
  }
  
  const rolePermissions = ROLE_PERMISSIONS[userRole as UserRole];
  return rolePermissions.includes(permission as Permission);
};

// Enhanced permission check that includes username-based permissions
export const hasModulePermission = (
  userRole: string, 
  userEmail: string, 
  permission: string,
  usernamePermissions: string[] = []
): boolean => {
  // Check role-based permissions first
  if (hasPermission(userRole, permission)) {
    return true;
  }
  
  // Check username-based permissions
  return usernamePermissions.includes(permission);
};

// Check if user has access to a specific module
export const hasModuleAccess = (
  userRole: string,
  userEmail: string,
  moduleKey: DashboardModule,
  usernamePermissions: string[] = []
): boolean => {
  const module = DASHBOARD_MODULES[moduleKey];
  if (!module) return false;
  
  return hasModulePermission(userRole, userEmail, module.permission, usernamePermissions);
};

// Enhanced permission check that includes executive board role permissions
export const hasExecutiveBoardPermissions = (
  userRole: string,
  execBoardRole?: string,
  usernamePermissions: string[] = []
): boolean => {
  // Admin role always has permissions
  if (hasPermission(userRole, 'send_emails')) {
    return true;
  }
  
  // Executive board members have permissions
  if (execBoardRole && execBoardRole.trim() !== '') {
    return true;
  }
  
  // Check username-based permissions
  return usernamePermissions.includes('send_emails');
};

// Enhanced permission check with executive board role consideration
export const hasEnhancedModulePermission = (
  userRole: string,
  userEmail: string,
  permission: string,
  execBoardRole?: string,
  usernamePermissions: string[] = []
): boolean => {
  // Check role-based permissions first
  if (hasPermission(userRole, permission)) {
    return true;
  }
  
  // Check executive board role permissions
  if (execBoardRole) {
    // Import here to avoid circular dependency
    const execBoardPermissions = getExecutiveBoardPermissions(execBoardRole);
    if (execBoardPermissions.includes(permission)) {
      return true;
    }
  }
  
  // Check username-based permissions
  return usernamePermissions.includes(permission);
};

// Enhanced module access check with executive board role consideration
export const hasEnhancedModuleAccess = (
  userRole: string,
  userEmail: string,
  moduleKey: DashboardModule,
  execBoardRole?: string,
  usernamePermissions: string[] = []
): boolean => {
  const module = DASHBOARD_MODULES[moduleKey];
  if (!module) return false;
  
  return hasEnhancedModulePermission(userRole, userEmail, module.permission, execBoardRole, usernamePermissions);
};

// Helper function to get executive board permissions (implemented separately to avoid circular imports)
const getExecutiveBoardPermissions = (execBoardRole: string): string[] => {
  // This will be populated from executiveBoardRoles.ts
  const rolePermissionMap: Record<string, string[]> = {
    'president': ['access_hero_management', 'access_dashboard_settings', 'access_youtube_management', 'access_budget_creation', 'access_contracts', 'send_emails', 'manage_username_permissions', 'access_tour_planner'],
    'vice-president': ['access_budget_creation', 'access_contracts', 'send_emails', 'access_youtube_management', 'access_tour_planner'],
    'treasurer': ['access_budget_creation', 'access_contracts', 'send_emails'],
    'secretary': ['send_emails', 'access_contracts'],
    'music-director': ['access_youtube_management', 'send_emails'],
    'assistant-music-director': ['access_youtube_management'],
    'social-chair': ['send_emails', 'access_budget_creation'],
    'publicity-chair': ['access_hero_management', 'send_emails', 'access_youtube_management'],
    'events-coordinator': ['access_budget_creation', 'access_contracts', 'send_emails', 'access_tour_planner'],
    'historian': ['access_youtube_management'],
    'librarian': [],
    'technical-director': ['access_dashboard_settings', 'access_youtube_management'],
    'fundraising-chair': ['access_budget_creation', 'send_emails'],
    'alumni-relations': ['send_emails'],
    'membership-chair': ['send_emails'],
    'tour-manager': ['access_tour_planner', 'access_contracts', 'access_budget_creation', 'send_emails'],
  };
  
  return rolePermissionMap[execBoardRole] || [];
};

export const isAdmin = (userRole?: string): boolean => {
  return userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN;
};
