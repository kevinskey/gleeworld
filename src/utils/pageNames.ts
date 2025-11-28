
export const PAGE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/landing': 'Home',
  '/auth': 'Sign In',
  '/admin': 'Admin Dashboard',
  '/dashboard': 'Dashboard',
  
  '/activity-logs': 'Activity Logs',
  '/accounting': 'Accounting',
  '/admin-signing': 'Admin Signing',
  '/contract-signing': 'Contract Signing',
  '/w9-form': 'W9 Form',
  '/event-planner': 'Event Planner',
  '/events': 'Calendar',
  '/calendar': 'Public Calendar',
  '/profile': 'Profile',
  '/profile/setup': 'Profile Setup',
  '/notifications': 'Notifications',
  '/user-management': 'User Management',
  
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
  '/tour-manager': 'Tour Manager Dashboard',
  '/treasurer': 'Treasurer Dashboard',
  '/tour-planner': 'Tour Planner',
  
  // Course Routes
  '/mus-100': 'MUS 100 - Music Theory Fundamentals',
  '/mus-210': 'MUS 210 - Choral Conducting',
  '/mus-240': 'MUS 240 - Survey of African American Music',
  '/mus-240/syllabus': 'MUS 240 Syllabus',
  '/mus-240/listening': 'MUS 240 Listening Hub',
  '/mus-240/assignments': 'MUS 240 Assignments',
  '/mus-240/grades': 'MUS 240 Grades & Progress',
  '/mus-240/resources': 'MUS 240 Resources'
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
  if (pathname.startsWith('/mus-240/listening/')) {
    return 'MUS 240 Week Detail';
  }
  if (pathname.startsWith('/mus-240/assignments/')) {
    return 'MUS 240 Assignment';
  }
  
  // Check exact matches
  if (PAGE_NAMES[pathname]) {
    return PAGE_NAMES[pathname];
  }
  
  // Default fallback
  return 'GleeWorld';
};
