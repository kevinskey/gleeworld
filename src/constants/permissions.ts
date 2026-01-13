/**
 * GleeWorld Role & Permission System
 * 
 * ROLE HIERARCHY (highest to lowest):
 * 1. Super Admin (Director) - Full system control, only one person
 * 2. Admin - Appointed staff (accompanist, assistants, advisors) - Full management except system settings
 * 3. Executive Board - Elected student officers with role-specific permissions
 * 4. Instructor - Course instructors, can manage their courses
 * 5. Student/Member - Active Glee Club members
 * 6. Alumna - Graduates with alumnae portal access
 * 7. Auditioner - Applicants in audition process
 * 8. Fan - Supporters with limited access
 * 9. Visitor - Unauthenticated, public content only
 */

export const USER_ROLES = {
  VISITOR: 'visitor',
  FAN: 'fan',
  AUDITIONER: 'auditioner',
  STUDENT: 'student',
  ALUMNA: 'alumna',
  MEMBER: 'member', // Alias for student
  INSTRUCTOR: 'instructor',
  EXECUTIVE: 'executive',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * ROLE DESCRIPTIONS - For UI display and documentation
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, { title: string; description: string; level: number }> = {
  [USER_ROLES.SUPER_ADMIN]: {
    title: 'Director (Super Admin)',
    description: 'Full system control. Can delete users, manage system settings, approve final budgets, override any action.',
    level: 100,
  },
  [USER_ROLES.ADMIN]: {
    title: 'Admin',
    description: 'Appointed staff (accompanist, assistants, advisors). Can manage users, content, contracts, emails, events, and budgets.',
    level: 80,
  },
  [USER_ROLES.EXECUTIVE]: {
    title: 'Executive Board',
    description: 'Elected student officers. Role-specific permissions based on position (Treasurer, Chief of Staff, etc.).',
    level: 60,
  },
  [USER_ROLES.INSTRUCTOR]: {
    title: 'Instructor',
    description: 'Course instructors. Can manage their courses and view enrolled student dossiers.',
    level: 50,
  },
  [USER_ROLES.STUDENT]: {
    title: 'Student/Member',
    description: 'Active Glee Club members. Access to music studio, contracts, payments, and member resources.',
    level: 40,
  },
  [USER_ROLES.MEMBER]: {
    title: 'Member',
    description: 'Alias for Student. Active Glee Club members.',
    level: 40,
  },
  [USER_ROLES.ALUMNA]: {
    title: 'Alumna',
    description: 'Graduates. Access to alumnae portal, mentoring, reunion RSVPs.',
    level: 30,
  },
  [USER_ROLES.AUDITIONER]: {
    title: 'Auditioner',
    description: 'Applicants in audition process. Can sign contracts and access audition portal.',
    level: 20,
  },
  [USER_ROLES.FAN]: {
    title: 'Fan',
    description: 'Supporters. Access to events, shop, and newsletter.',
    level: 10,
  },
  [USER_ROLES.VISITOR]: {
    title: 'Visitor',
    description: 'Unauthenticated user. Public content only.',
    level: 0,
  },
};

export const PERMISSIONS = [
  // Personal permissions (all authenticated users)
  'view_own_contracts',
  'view_own_payments',
  'view_own_w9_forms',
  'sign_contracts',
  'submit_w9_forms',
  
  // Member permissions
  'access_music_studio',
  'access_member_resources',
  'access_handbook',
  
  // Instructor permissions
  'manage_own_courses',
  'view_enrolled_students',
  
  // Executive Board permissions
  'access_exec_dashboard',
  'send_emails',
  'access_contracts',
  'access_budget_creation',
  'approve_budgets_treasurer',
  
  // Admin permissions (can see/manage admin-created content only)
  'view_admin_contracts', // View contracts created by admins (not super admin)
  'create_contracts',
  'manage_users',
  'view_all_payments',
  'view_system_settings',
  'admin_sign_contracts',
  'access_hero_management',
  'access_dashboard_settings',
  'access_youtube_management',
  'manage_username_permissions',
  'access_tour_planner',
  'manage_events',
  'manage_content',
  
  // Super Admin only permissions
  'all_permissions',
  'view_all_contracts', // Super admin can see ALL contracts including their own
  'delete_users',
  'manage_system_settings',
  'view_activity_logs',
  'approve_budgets_super_admin',
  'manage_roles',
  'manage_super_admin_contracts', // Only super admin can manage their own contracts
] as const;

export type Permission = typeof PERMISSIONS[number];

/**
 * ROLE-BASED PERMISSIONS
 * Each role inherits permissions from lower roles (except for role-specific ones)
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [USER_ROLES.VISITOR]: [],
  
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
  
  [USER_ROLES.STUDENT]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'submit_w9_forms',
    'access_music_studio',
    'access_member_resources',
    'access_handbook',
  ],
  
  [USER_ROLES.MEMBER]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'submit_w9_forms',
    'access_music_studio',
    'access_member_resources',
    'access_handbook',
  ],
  
  [USER_ROLES.INSTRUCTOR]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'submit_w9_forms',
    'manage_own_courses',
    'view_enrolled_students',
    'access_handbook',
  ],
  
  [USER_ROLES.EXECUTIVE]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'submit_w9_forms',
    'access_music_studio',
    'access_member_resources',
    'access_handbook',
    'access_exec_dashboard',
    'send_emails',
    'access_contracts',
  ],
  
  [USER_ROLES.ADMIN]: [
    'view_own_contracts',
    'view_own_payments',
    'view_own_w9_forms',
    'sign_contracts',
    'submit_w9_forms',
    'access_music_studio',
    'access_member_resources',
    'access_handbook',
    'access_exec_dashboard',
    'send_emails',
    'access_contracts',
    'access_budget_creation',
    'view_admin_contracts', // Admin can only see admin-created contracts, NOT super admin contracts
    'create_contracts',
    'manage_users',
    'view_all_payments',
    'view_system_settings',
    'admin_sign_contracts',
    'access_hero_management',
    'access_dashboard_settings',
    'access_youtube_management',
    'manage_username_permissions',
    'access_tour_planner',
    'manage_events',
    'manage_content',
  ],
  
  [USER_ROLES.SUPER_ADMIN]: [
    'all_permissions',
  ],
} as const;

// Dashboard module definitions
export const DASHBOARD_MODULES = {
  hero_management: {
    name: 'Hero Management',
    description: 'Manage homepage hero sections and carousel',
    permission: 'access_hero_management' as Permission,
    minRole: USER_ROLES.ADMIN,
  },
  dashboard_settings: {
    name: 'Dashboard Settings',
    description: 'Configure dashboard appearance and settings',
    permission: 'access_dashboard_settings' as Permission,
    minRole: USER_ROLES.ADMIN,
  },
  youtube_management: {
    name: 'YouTube Management',
    description: 'Sync and manage YouTube content',
    permission: 'access_youtube_management' as Permission,
    minRole: USER_ROLES.ADMIN,
  },
  budget_creation: {
    name: 'Budget Creation',
    description: 'Create and manage project budgets',
    permission: 'access_budget_creation' as Permission,
    minRole: USER_ROLES.EXECUTIVE,
  },
  contracts: {
    name: 'Contracts',
    description: 'Create and manage contracts',
    permission: 'access_contracts' as Permission,
    minRole: USER_ROLES.EXECUTIVE,
  },
  send_emails: {
    name: 'Email Campaigns',
    description: 'Send emails to members',
    permission: 'send_emails' as Permission,
    minRole: USER_ROLES.EXECUTIVE,
  },
  manage_permissions: {
    name: 'Manage Permissions',
    description: 'Manage username-based module permissions',
    permission: 'manage_username_permissions' as Permission,
    minRole: USER_ROLES.ADMIN,
  },
  permissions_panel: {
    name: 'Permissions Panel',
    description: 'Advanced dashboard module permissions control',
    permission: 'manage_username_permissions' as Permission,
    minRole: USER_ROLES.ADMIN,
  },
  tour_planner: {
    name: 'Tour Planner',
    description: 'Plan and manage tours, cities, and tasks',
    permission: 'access_tour_planner' as Permission,
    minRole: USER_ROLES.ADMIN,
  },
  handbook: {
    name: 'Handbook',
    description: 'Official Glee Club handbook and executive board positions',
    permission: 'access_handbook' as Permission,
    minRole: USER_ROLES.FAN,
  },
  music_studio: {
    name: 'Music Studio',
    description: 'Recording booth, audio archive, and sheet music',
    permission: 'access_music_studio' as Permission,
    minRole: USER_ROLES.STUDENT,
  },
} as const;

export type DashboardModule = keyof typeof DASHBOARD_MODULES;

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (userRole: string, permission: string): boolean => {
  // Normalize director to super-admin
  const normalized = userRole === 'director' ? USER_ROLES.SUPER_ADMIN : userRole;

  if (!Object.values(USER_ROLES).includes(normalized as UserRole)) {
    return false;
  }

  // Super admin has all permissions
  if (normalized === USER_ROLES.SUPER_ADMIN) {
    return true;
  }
  
  const rolePermissions = ROLE_PERMISSIONS[normalized as UserRole];
  return rolePermissions.includes(permission as Permission);
};

/**
 * Get role level for hierarchy comparison
 */
export const getRoleLevel = (role: string): number => {
  const normalized = role === 'director' ? USER_ROLES.SUPER_ADMIN : role;
  return ROLE_DESCRIPTIONS[normalized as UserRole]?.level ?? 0;
};

/**
 * Check if roleA is higher than or equal to roleB
 */
export const isRoleAtLeast = (userRole: string, minimumRole: UserRole): boolean => {
  return getRoleLevel(userRole) >= getRoleLevel(minimumRole);
};

/**
 * Enhanced permission check that includes username-based permissions
 */
export const hasModulePermission = (
  userRole: string, 
  userEmail: string, 
  permission: string,
  usernamePermissions: string[] = []
): boolean => {
  if (hasPermission(userRole, permission)) {
    return true;
  }
  return usernamePermissions.includes(permission);
};

/**
 * Check if user has access to a specific module
 */
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

/**
 * EXECUTIVE BOARD ROLE-SPECIFIC PERMISSIONS
 * Additional permissions granted based on exec board position
 */
export const EXEC_BOARD_PERMISSIONS: Record<string, readonly Permission[]> = {
  'president': [
    'access_hero_management',
    'access_dashboard_settings',
    'access_youtube_management',
    'access_budget_creation',
    'manage_username_permissions',
    'access_tour_planner',
    'manage_events',
  ],
  'vice-president': [
    'access_budget_creation',
    'access_youtube_management',
    'access_tour_planner',
    'manage_events',
  ],
  'chief_of_staff': [
    'manage_users',
    'access_tour_planner',
    'manage_events',
  ],
  'treasurer': [
    'access_budget_creation',
    'approve_budgets_treasurer',
    'view_all_payments',
  ],
  'secretary': [
    'send_emails',
    'access_contracts',
  ],
  'music-director': [
    'access_youtube_management',
    'access_music_studio',
  ],
  'assistant-music-director': [
    'access_youtube_management',
    'access_music_studio',
  ],
  'social-chair': [
    'access_budget_creation',
    'manage_events',
  ],
  'publicity-chair': [
    'access_hero_management',
    'access_youtube_management',
  ],
  'events-coordinator': [
    'access_budget_creation',
    'access_tour_planner',
    'manage_events',
  ],
  'historian': [
    'access_youtube_management',
  ],
  'librarian': [
    'access_music_studio',
  ],
  'technical-director': [
    'access_dashboard_settings',
    'access_youtube_management',
  ],
  'fundraising-chair': [
    'access_budget_creation',
  ],
  'alumni-relations': [],
  'membership-chair': [],
  'tour-manager': [
    'access_tour_planner',
    'access_budget_creation',
  ],
  'wardrobe_manager': [],
} as const;

/**
 * Get permissions for an executive board role
 */
export const getExecutiveBoardPermissions = (execBoardRole: string): Permission[] => {
  // Base permissions for all exec board members
  const basePermissions: Permission[] = [
    'send_emails',
    'access_contracts',
    'access_exec_dashboard',
  ];
  
  const roleSpecific = EXEC_BOARD_PERMISSIONS[execBoardRole] || [];
  return [...basePermissions, ...roleSpecific] as Permission[];
};

/**
 * Enhanced permission check with executive board role consideration
 */
export const hasEnhancedModulePermission = (
  userRole: string,
  userEmail: string,
  permission: string,
  execBoardRole?: string,
  usernamePermissions: string[] = []
): boolean => {
  if (hasPermission(userRole, permission)) {
    return true;
  }
  
  if (execBoardRole) {
    const execBoardPermissions = getExecutiveBoardPermissions(execBoardRole);
    if (execBoardPermissions.includes(permission as Permission)) {
      return true;
    }
  }
  
  return usernamePermissions.includes(permission);
};

/**
 * Enhanced module access check with executive board role consideration
 */
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

/**
 * Check if user has executive board permissions (for backwards compatibility)
 */
export const hasExecutiveBoardPermissions = (
  userRole: string,
  execBoardRole?: string,
  usernamePermissions: string[] = []
): boolean => {
  if (hasPermission(userRole, 'send_emails')) {
    return true;
  }
  
  if (execBoardRole && execBoardRole.trim() !== '') {
    return true;
  }
  
  return usernamePermissions.includes('send_emails');
};

/**
 * Simple admin check (for backwards compatibility)
 */
export const isAdmin = (userRole?: string): boolean => {
  if (!userRole) return false;
  return isRoleAtLeast(userRole, USER_ROLES.ADMIN);
};
