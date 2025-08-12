/**
 * Module name standardization utilities
 * All modules use kebab-case naming for consistency
 */

export const STANDARD_MODULE_NAMES = {
  // Media & PR modules
  'media-library': 'Media Library',
  'hero-manager': 'Hero Manager', 
  'pr-manager': 'PR Manager',
  'ai-tools': 'AI Tools',
  'press-kits': 'Press Kits',
  
  // Core modules
  'auditions': 'Auditions',
  'music-library': 'Music Library',
  'student-conductor': 'Student Conductor',
  'section-leader': 'Section Leader',
  'tour-management': 'Tour Management',
  'calendar-management': 'Calendar Management',
  'executive-board-management': 'Executive Board',
  'user-management': 'User Management',
  'permissions': 'Permissions',
  
  // Administrative modules
  'approval-system': 'Approval System',
  'budgets': 'Budgets',
  'contracts': 'Contracts',
  'receipts-records': 'Receipts & Records',
  'monthly-statements': 'Monthly Statements',
  'glee-ledger': 'Glee Ledger',
  
  // Communications
  'notifications': 'Notifications',
  'email-management': 'Email Management',
  'internal-communications': 'Internal Communications',
  
  // Other modules
  'alumnae-portal': 'Alumnae Portal',
  'merch-store': 'Merch Store',
  'wellness': 'Wellness',
  'wardrobe': 'Wardrobe',
  'service-management': 'Service Management',
  'scheduling-module': 'Scheduling',
  'radio-management': 'Radio Management',
  'sight-reading-preview': 'Sight Reading',
  'sight-singing-management': 'Sight Singing',
  'buckets-of-love': 'Buckets of Love',
  'booking-forms': 'Booking Forms',
  'check-requests': 'Check Requests',
  'dues-collection': 'Dues Collection',
  'glee-writing': 'Glee Writing',
  'pr-coordinator': 'PR Coordinator',
  'ai-financial': 'AI Financial',
  'attendance-management': 'Attendance Management',
  'executive-functions': 'Executive Functions'
} as const;

export type StandardModuleName = keyof typeof STANDARD_MODULE_NAMES;

/**
 * Convert various module name formats to standard kebab-case
 */
export function standardizeModuleName(name: string): StandardModuleName | string {
  // Handle common variations
  const nameMap: Record<string, StandardModuleName> = {
    'Media Library': 'media-library',
    'media_library': 'media-library',
    'media': 'media-library',
    'hero_manager': 'hero-manager',
    'pr_manager': 'pr-manager', 
    'ai_tools': 'ai-tools',
    'press_kits': 'press-kits',
    'auditions-management': 'auditions',
    'music-library': 'music-library',
    'student-conductor': 'student-conductor'
  };
  
  return nameMap[name] || name;
}

/**
 * Get display name for a module
 */
export function getModuleDisplayName(name: string): string {
  const standardName = standardizeModuleName(name);
  return STANDARD_MODULE_NAMES[standardName as StandardModuleName] || name;
}

/**
 * Check if module name is in standard format
 */
export function isStandardModuleName(name: string): boolean {
  return name in STANDARD_MODULE_NAMES;
}

/**
 * Get all available module names in standard format
 */
export function getAllStandardModuleNames(): StandardModuleName[] {
  return Object.keys(STANDARD_MODULE_NAMES) as StandardModuleName[];
}
