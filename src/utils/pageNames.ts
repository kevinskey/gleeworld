
export const PAGE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/landing': 'Home',
  '/auth': 'Sign In',
  '/dashboard': 'Dashboard',
  
  '/activity-logs': 'Activity Logs',
  '/accounting': 'Accounting',
  '/admin-signing': 'Admin Signing',
  '/contract-signing': 'Contract Signing',
  '/w9-form': 'W9 Form',
  '/event-planner': 'Event Planner',
  '/events': 'Event Planner',
  '/calendar': 'Calendar',
  '/public-calendar': 'Public Calendar',
  '/profile': 'Profile',
  '/profile/setup': 'Profile Setup',
  '/notifications': 'Notifications',
  
  '/announcements': 'Announcements',
  '/admin/announcements/new': 'Create Announcement',
  '/admin/announcements/edit': 'Edit Announcement',
  '/shop': 'Shop',
  '/press-kit': 'Press Kit',
  '/about': 'About',
  '/contracts': 'Contracts',
  '/attendance': 'Attendance',
  '/attendance-test': 'Attendance Test',
  '/music-library': 'Music Library',
  '/payments': 'Payments',
  '/budget-approvals': 'Budget Approvals',
  '/budgets': 'Budget Management',
  '/tour-manager': 'Tour Manager',
  '/treasurer': 'Treasurer Dashboard',
  '/tour-planner': 'Tour Planner'
};

export const getPageName = (pathname: string): string => {
  // Handle dynamic routes
  if (pathname.startsWith('/dashboard/member-view/')) {
    return 'Member View';
  }
  if (pathname.startsWith('/admin/announcements/') && pathname.endsWith('/edit')) {
    return 'Edit Announcement';
  }
  if (pathname.startsWith('/contract-signing/')) {
    return 'Contract Signing';
  }
  
  // Check exact matches
  if (PAGE_NAMES[pathname]) {
    return PAGE_NAMES[pathname];
  }
  
  // Default fallback
  return 'GleeWorld';
};
