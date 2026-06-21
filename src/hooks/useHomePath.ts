// Every role lands on /dashboard now — the Command Center is the single
// admin + member entry point. The previous admin-only /control-center
// view was retired (route still redirects here).
export function useHomePath(): string {
  return '/dashboard';
}
