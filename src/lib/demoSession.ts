// Demo-session plumbing for the prospect-facing demo (demo.gleeworld.org).
//
// The demo uses three seeded read-only accounts (director / student / fan),
// all flagged is_demo_viewer so RESTRICTIVE RLS blocks their writes. Sessions
// are minted server-side by the demo-login edge function — no credentials in
// this bundle. See docs/superpowers/specs/2026-07-06-demo-onboarding-redesign-design.md.

import { supabase } from '@/integrations/supabase/client';

export type DemoRole = 'director' | 'student' | 'fan';

export const DEMO_ROLES: DemoRole[] = ['director', 'student', 'fan'];

// Post-switch destination per role — mirrors pickDestination() in
// useRoleBasedRedirect.ts (admin/student → Command Center, fan → fan portal).
export const DEMO_HOME: Record<DemoRole, string> = {
  director: '/dashboard',
  student: '/dashboard',
  fan: '/fan',
};

export const DEMO_WRITE_BLOCKED_EVENT = 'gw-demo-write-blocked';

export function decodeJwtClaims(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// A session is "the demo" only when it carries the server-issued demo_viewer
// claim AND belongs to the demo tenant. demo-admin (Kevin's curator account)
// has no demo_viewer claim, so it never sees prospect chrome.
export function claimsToDemoRole(claims: Record<string, unknown> | null): DemoRole | null {
  if (!claims || claims.demo_viewer !== true) return null;
  if (claims.tenant_slug !== 'demo') return null;
  const role = claims.tenant_role;
  if (role === 'admin') return 'director';
  if (role === 'student') return 'student';
  if (role === 'fan') return 'fan';
  return null;
}

export async function getDemoSessionRole(): Promise<DemoRole | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return claimsToDemoRole(decodeJwtClaims(token));
}

// Mint a demo session for the given role and install it. Throws on failure —
// callers decide the fallback (redirect to /auth, error banner, …).
export async function startDemoSession(role: DemoRole): Promise<void> {
  const { data, error } = await supabase.functions.invoke('demo-login', { body: { role } });
  if (error) throw error;
  const tokens = data as { access_token?: string; refresh_token?: string; error?: string };
  if (!tokens?.access_token || !tokens?.refresh_token) {
    throw new Error(tokens?.error || 'demo-login returned no session');
  }
  const { error: setErr } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (setErr) throw setErr;
}

// ── Write interceptor ────────────────────────────────────────────────────────
// Demo viewers are blocked from writing by RESTRICTIVE RLS. Headline features
// get explicit guards; this interceptor is the global fallback that turns any
// unguarded RLS rejection into a friendly event (DemoBar shows the toast)
// instead of a raw "violates row-level security" toast.

let interceptorInstalled = false;

function looksLikeRlsDenial(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === '42501' || /row-level security/i.test(e.message ?? '');
}

export function installDemoWriteInterceptor(): void {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFrom = supabase.from.bind(supabase);
  supabase.from = (table: string) => {
    const builder = originalFrom(table);
    return wrapBuilder(builder);
  };

  function wrapBuilder(builder: any): any {
    return new Proxy(builder, {
      get(target, prop, receiver) {
        if (prop === 'then') {
          const then = Reflect.get(target, prop, receiver);
          if (typeof then !== 'function') return then;
          return (onFulfilled?: (v: any) => any, onRejected?: (e: any) => any) =>
            then.call(
              target,
              (result: any) => {
                if (result?.error && looksLikeRlsDenial(result.error)) {
                  window.dispatchEvent(new CustomEvent(DEMO_WRITE_BLOCKED_EVENT));
                }
                return onFulfilled ? onFulfilled(result) : result;
              },
              onRejected,
            );
        }
        const value = Reflect.get(target, prop, receiver);
        // Builder methods return new builders — keep them wrapped so the
        // terminal await still passes through the then() above.
        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            const out = value.apply(target, args);
            return out && typeof out === 'object' && typeof out.then === 'function'
              ? wrapBuilder(out)
              : out;
          };
        }
        return value;
      },
    });
  }
}
