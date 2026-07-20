// TrialGuard — redirects any authenticated user whose tenant's trial has
// expired to /paywall, EXCEPT super-admins (Kevin + support agents need to
// stay signed in to help) and a small allowlist of routes the user has to
// keep reaching to convert (workspace settings for plan management, /auth
// for sign-out, /paywall itself to avoid recursion).
//
// Loading state passes through unchanged so we never render a paywall flash
// while the trial query is in flight.

import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useUserRole } from '@/hooks/useUserRole';

const ALLOWED_WHILE_EXPIRED = [
  '/paywall',
  '/auth',
  '/force-password-change',
  '/dashboard/workspace',
];

export function TrialGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const state = useTrialStatus();
  const { isSuperAdmin } = useUserRole();

  if (state.kind !== 'expired') return <>{children}</>;
  if (isSuperAdmin()) return <>{children}</>;
  if (ALLOWED_WHILE_EXPIRED.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return <Navigate to="/paywall" replace />;
}
