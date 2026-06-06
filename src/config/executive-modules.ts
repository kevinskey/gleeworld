// Admin module list — exec-board layer was removed; this list now drives
// admin-level module discovery instead.
export const EXECUTIVE_MODULE_IDS = [
  'user-management',
  'attendance',
  'tour-management',
  'booking-forms',
  'auditions',
  'permissions',
  'wardrobe',

  // Communications
  'email-management',
  'notifications',
  'announcements',
  'pr-coordinator',
  'pr-hub',
  'calendar-management',
  'service-management',
  'buckets-of-love',

  'concert-ticket-requests',

  // Finances
  'budgets',
  'contracts',
  'glee-ledger',
  'dues-collection',
  'invoice-maker',
  'merch-store',

  // Musical Leadership
  'sight-singing-management',
  'sight-reading-generator',
  'member-sight-reading-studio',
  'librarian',

  // Member Management
  'graduates-portal',

  // Tools & Administration
  'ai-tools',
  'hero-manager',
  'settings',
  'press-kits'
];

// Standard modules that ALL members get automatically
export const STANDARD_MEMBER_MODULE_IDS = [
  'music-library',
  'calendar',
  'attendance'
];
