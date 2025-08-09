export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  ADMIN: '/admin',
  DASHBOARD: '/dashboard',
  
  ACTIVITY_LOGS: '/activity-logs',
  ACCOUNTING: '/accounting',
  ADMIN_SIGNING: '/admin-signing',
  CONTRACT_SIGNING: '/contract-signing',
  W9_FORM: '/w9-form',
  TREASURER: '/treasurer',
  DUES_MANAGEMENT: '/dues-management',
  
  EVENT_PLANNER: '/event-planner',
  CALENDAR: '/calendar',
  PERFORMANCE: '/performance',
  TOUR_MANAGER: '/tour-manager',
  ATTENDANCE: '/attendance',
  SCHOLARSHIPS: '/scholarships',
  ADMIN_SCHOLARSHIPS: '/admin/scholarships',
  
  SHOP: '/shop',
  CHECKOUT: '/checkout',
  SHOP_SUCCESS: '/shop/success',
  
  TOUR_PLANNER: '/tour-planner',
  APPOINTMENTS: '/appointments',
  PR_HUB: '/dashboard/pr-hub',
  SIGHT_READING_SUBMISSION: '/sight-reading-submission',
  SIGHT_READING_PREVIEW: '/sight-reading-preview',
  SIGHT_READING_GENERATOR: '/sight-reading-generator',
  
  PERMISSIONS: '/admin/permissions',
  WELLNESS: '/wellness'
} as const;

export const PROTECTED_ROUTES = [
  ROUTES.ADMIN,
  ROUTES.DASHBOARD,
  ROUTES.ACTIVITY_LOGS,
  ROUTES.ACCOUNTING,
  ROUTES.ADMIN_SIGNING,
  ROUTES.TREASURER,
  ROUTES.DUES_MANAGEMENT,
  ROUTES.EVENT_PLANNER,
  ROUTES.PERFORMANCE,
  ROUTES.TOUR_MANAGER,
  ROUTES.ATTENDANCE,
  ROUTES.SCHOLARSHIPS,
  ROUTES.ADMIN_SCHOLARSHIPS,
  ROUTES.TOUR_PLANNER,
  ROUTES.APPOINTMENTS,
  ROUTES.PR_HUB,
  ROUTES.SIGHT_READING_SUBMISSION,
  ROUTES.SIGHT_READING_PREVIEW,
  ROUTES.SIGHT_READING_GENERATOR,
  ROUTES.PERMISSIONS,
  ROUTES.WELLNESS
] as const;

export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.AUTH,
  ROUTES.CONTRACT_SIGNING,
  ROUTES.W9_FORM,
  ROUTES.CALENDAR,
  ROUTES.SHOP,
  ROUTES.CHECKOUT,
  ROUTES.SHOP_SUCCESS
] as const;
