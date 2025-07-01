
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
  ],
  [USER_ROLES.SUPER_ADMIN]: [
    'all_permissions',
    'delete_users',
    'manage_system_settings',
    'view_activity_logs',
  ],
} as const;

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

export const isAdmin = (userRole?: string): boolean => {
  return userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN;
};
