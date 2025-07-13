
export const USER_ROLES = {
  USER: 'user',
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
  'send_notifications',
  'send_emails',
  'manage_username_permissions',
] as const;

export type Permission = typeof PERMISSIONS[number];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [USER_ROLES.USER]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'submit_w9_forms',
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
    'send_notifications',
    'send_emails',
    'manage_username_permissions',
  ],
  [USER_ROLES.SUPER_ADMIN]: [
    'all_permissions',
    'delete_users',
    'manage_system_settings',
    'view_activity_logs',
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
  send_notifications: {
    name: 'Send Notifications',
    description: 'Send notifications to members',
    permission: 'send_notifications' as Permission,
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

// Check if user is executive board member (has email/notification permissions)
export const hasExecutiveBoardPermissions = (
  userRole: string,
  execBoardRole?: string,
  usernamePermissions: string[] = []
): boolean => {
  // Admin role always has permissions
  if (hasPermission(userRole, 'send_notifications') || hasPermission(userRole, 'send_emails')) {
    return true;
  }
  
  // Executive board members have permissions
  if (execBoardRole && execBoardRole.trim() !== '') {
    return true;
  }
  
  // Check username-based permissions
  return usernamePermissions.includes('send_notifications') || usernamePermissions.includes('send_emails');
};

export const isAdmin = (userRole?: string): boolean => {
  return userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN;
};
