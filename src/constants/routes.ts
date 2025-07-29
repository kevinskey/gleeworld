
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  
  ACTIVITY_LOGS: '/activity-logs',
  ACCOUNTING: '/accounting',
  ADMIN_SIGNING: '/admin-signing',
  CONTRACT_SIGNING: '/contract-signing',
  W9_FORM: '/w9-form',
  TREASURER: '/treasurer',
  
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
  
  TOUR_PLANNER: '/tour-planner'
} as const;

export const PROTECTED_ROUTES = [
  ROUTES.HOME,
  ROUTES.DASHBOARD,
  ROUTES.ACTIVITY_LOGS,
  ROUTES.ACCOUNTING,
  ROUTES.ADMIN_SIGNING,
  ROUTES.TREASURER,
  ROUTES.EVENT_PLANNER,
  ROUTES.PERFORMANCE,
  ROUTES.TOUR_MANAGER,
  ROUTES.ATTENDANCE,
  ROUTES.SCHOLARSHIPS,
  ROUTES.ADMIN_SCHOLARSHIPS,
  ROUTES.TOUR_PLANNER
] as const;

export const PUBLIC_ROUTES = [
  ROUTES.AUTH,
  ROUTES.CONTRACT_SIGNING,
  ROUTES.W9_FORM,
  ROUTES.CALENDAR,
  ROUTES.SHOP,
  ROUTES.CHECKOUT,
  ROUTES.SHOP_SUCCESS
] as const;
