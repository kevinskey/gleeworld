import { useUserRole } from '@/hooks/useUserRole';

// Admins land on /control-center; everyone else on /dashboard.
export function useHomePath(): string {
  const { profile } = useUserRole();
  const isAdmin = !!(
    profile?.is_admin ||
    profile?.is_super_admin ||
    profile?.role === 'admin' ||
    profile?.role === 'super-admin'
  );
  return isAdmin ? '/control-center' : '/dashboard';
}
