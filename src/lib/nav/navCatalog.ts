// Canonical list of every nav item a tenant super-admin can hide
// from lower-privilege users. Keep in sync with the sections rendered
// in DashboardShell — the `path` is the stable identifier stored in
// gw_tenant_nav_prefs.hidden_items.
//
// The Workspace Settings → Navigation tab renders checkboxes over this
// list; DashboardShell filters each rendered item against the same
// paths.

export type NavRole = 'admin' | 'student' | 'fan' | 'graduate' | 'member';

export const HIDEABLE_NAV_ROLES: { value: NavRole; label: string }[] = [
  { value: 'admin',    label: 'Tenant admins' },
  { value: 'student',  label: 'Students' },
  { value: 'fan',      label: 'Fans' },
  { value: 'graduate', label: 'Graduates' },
  { value: 'member',   label: 'Members' },
];

export interface NavCatalogItem {
  /** Route path used as the stable identity in hidden_items. */
  path: string;
  label: string;
  section: string;
}

export const NAV_CATALOG: NavCatalogItem[] = [
  // Today
  { path: '/dashboard',                 label: 'Dashboard',       section: 'Today' },
  { path: '/dashboard/inbox',           label: 'Inbox',           section: 'Today' },
  { path: '/dashboard/schedule',        label: 'Schedule',        section: 'Today' },
  { path: '/dashboard/calendar',        label: 'Calendar',        section: 'Today' },

  // Music
  { path: '/dashboard/music-library',   label: 'Music Library',   section: 'Music' },
  { path: '/dashboard/viewer',          label: 'Viewer',          section: 'Music' },
  { path: '/dashboard/part-tracks',     label: 'Part Tracks',     section: 'Music' },

  // Teach
  { path: '/dashboard/academy',         label: 'Academy',         section: 'Teach' },
  { path: '/dashboard/attendance',      label: 'Attendance',      section: 'Teach' },
  { path: '/dashboard/auditions',       label: 'Auditions',       section: 'Teach' },

  // Make
  { path: '/studio',                    label: 'Studio',          section: 'Make' },
  { path: '/video',                     label: 'Video',           section: 'Make' },
  { path: '/dashboard/music-tools',     label: 'Music Tools',     section: 'Make' },

  // Plan
  { path: '/dashboard/concert-planner', label: 'Concert Planner', section: 'Plan' },
  { path: '/dashboard/tour',            label: 'Tour Manager',    section: 'Plan' },
  { path: '/dashboard/liturgy-planner', label: 'Liturgy Planner', section: 'Plan' },

  // Reach
  { path: '/dashboard/pr-hub',          label: 'PR Hub',          section: 'Reach' },
  { path: '/admin/fan-page',            label: 'Fan Page',        section: 'Reach' },
  { path: '/dashboard/feeds',           label: 'Feeds',           section: 'Reach' },
  { path: '/dashboard/shop',            label: 'Store',           section: 'Reach' },
  { path: '/dashboard/alumni',          label: 'Graduates',       section: 'Reach' },

  // Money
  { path: '/dashboard/box-office',      label: 'Box Office',      section: 'Money' },
  { path: '/dashboard/finance',         label: 'Finance',         section: 'Money' },

  // People
  { path: '/dashboard/users',           label: 'People',          section: 'People' },

  // Admin
  { path: '/admin/public-page',         label: 'Site Setup',      section: 'Admin' },
  { path: '/dashboard/analytics',       label: 'Analytics',       section: 'Admin' },
  { path: '/dashboard/workspace',       label: 'Settings',        section: 'Admin' },
];
