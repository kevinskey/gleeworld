
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  SYSTEM: '/system',
  ACTIVITY_LOGS: '/activity-logs',
  ACCOUNTING: '/accounting',
  ADMIN_SIGNING: '/admin-signing',
  CONTRACT_SIGNING: '/contract-signing',
  W9_FORM: '/w9-form',
} as const;

export const PROTECTED_ROUTES = [
  ROUTES.HOME,
  ROUTES.DASHBOARD,
  ROUTES.SYSTEM,
  ROUTES.ACTIVITY_LOGS,
  ROUTES.ACCOUNTING,
  ROUTES.ADMIN_SIGNING,
] as const;

export const PUBLIC_ROUTES = [
  ROUTES.AUTH,
  ROUTES.CONTRACT_SIGNING,
  ROUTES.W9_FORM,
] as const;
