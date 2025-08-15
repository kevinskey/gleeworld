// Central authorization utilities for module-based permissions
export type ModuleGrant = {
  module_key: string;
  module_name: string;
  category: string;
  can_view: boolean;
  can_manage: boolean;
};

export type ModuleKey = 
  | 'budgets'
  | 'music-library'
  | 'auditions'
  | 'attendance'
  | 'events'
  | 'communications'
  | 'pr-coordinator'
  | 'sight-reading'
  | 'executive-board'
  | 'media-library'
  | 'glee-ledger'
  | 'receipts-records'
  | 'wellness'
  | 'ai-tools'
  | 'press-kits'
  | 'radio-management'
  | 'service-management'
  | 'monthly-statements'
  | 'check-requests'
  | 'tour-management'
  | 'merch-store'
  | 'hero-manager'
  | 'student-conductor'
  | 'internal-communications'
  | 'email'
  | 'public-relations'
  | 'glee-writing';

// Module permission checking utilities
export function hasModuleView(grants: ModuleGrant[], moduleKey: string): boolean {
  return !!grants.find(g => g.module_key === moduleKey && g.can_view);
}

export function hasModuleManage(grants: ModuleGrant[], moduleKey: string): boolean {
  return !!grants.find(g => g.module_key === moduleKey && g.can_manage);
}

export function hasModuleAccess(grants: ModuleGrant[], moduleKey: string): boolean {
  return hasModuleView(grants, moduleKey);
}

// Get modules by category
export function getModulesByCategory(grants: ModuleGrant[]): Record<string, ModuleGrant[]> {
  return grants.reduce((acc, grant) => {
    if (!acc[grant.category]) {
      acc[grant.category] = [];
    }
    acc[grant.category].push(grant);
    return acc;
  }, {} as Record<string, ModuleGrant[]>);
}

// Get accessible modules (view permission)
export function getAccessibleModules(grants: ModuleGrant[]): ModuleGrant[] {
  return grants.filter(grant => grant.can_view);
}

// Get manageable modules (manage permission)
export function getManageableModules(grants: ModuleGrant[]): ModuleGrant[] {
  return grants.filter(grant => grant.can_manage);
}

// Legacy permission mapping for backward compatibility
export const LEGACY_PERMISSION_TO_MODULE: Record<string, ModuleKey> = {
  access_budget_creation: 'budgets',
  access_budget_read: 'budgets',
  access_budget_manage: 'budgets',
  access_music_upload: 'music-library',
  access_music_library: 'music-library',
  access_auditions_manage: 'auditions',
  access_auditions_view: 'auditions',
  access_attendance_manage: 'attendance',
  access_events_manage: 'events',
  access_communications: 'communications',
  access_hero_management: 'hero-manager',
  send_emails: 'email',
  manage_pr: 'public-relations',
  sight_reading_access: 'sight-reading',
};

// Legacy permission checker (for backward compatibility)
export function hasPermissionLegacy(grants: ModuleGrant[], legacyKey: string): boolean {
  const moduleKey = LEGACY_PERMISSION_TO_MODULE[legacyKey];
  if (!moduleKey) return false;
  
  const manageHint = /manage|create|edit|delete/.test(legacyKey);
  return manageHint ? hasModuleManage(grants, moduleKey) : hasModuleView(grants, moduleKey);
}