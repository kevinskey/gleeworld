import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyTenant {
  tenant_id: string;
  slug: string;
  name: string | null;
  role: string | null;
}

/**
 * Every tenant the signed-in user belongs to, via the `my_tenants` RPC
 * (SECURITY DEFINER — reads across per-tenant RLS, scoped to auth.uid()).
 * Powers the account menu's "Switch organization" list. Returns [] on error
 * or before the RPC exists, so callers degrade gracefully (no switcher).
 */
export function useMyTenants() {
  const { user } = useAuth();
  return useQuery<MyTenant[]>({
    queryKey: ['my-tenants', user?.id],
    queryFn: async () => {
      // Cast: the RPC isn't in the generated types yet.
      const { data, error } = await supabase.rpc('my_tenants' as never);
      if (error) {
        console.warn('[useMyTenants] query failed', error.message);
        return [];
      }
      return (data ?? []) as MyTenant[];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

/** Absolute URL for a tenant's own subdomain (main = the platform apex). */
export function tenantHomeUrl(slug: string): string {
  return slug === 'main' ? 'https://gleeworld.org' : `https://${slug}.gleeworld.org`;
}

/** Cross-subdomain tenant switch URL that CARRIES the session so the user
 *  lands signed-in on the target world instead of the auth screen.
 *
 *  Supabase sessions live in localStorage under the current origin, so a
 *  bare cross-subdomain navigation drops the user on the destination
 *  with no session → the tenant's login screen. Solution: append the
 *  session tokens to the URL hash in the same format Supabase's own
 *  magic-link callback uses. The client on the destination has
 *  `detectSessionInUrl: true` (see integrations/supabase/client.ts) and
 *  reads the fragment on boot, persisting the session to that origin's
 *  localStorage and clearing the hash. The token exposure window is a
 *  single page load and matches the trust model Supabase already
 *  ships for magic-link recovery — the tokens belong to the user
 *  triggering the switch anyway. */
export function tenantSwitchUrl(slug: string, session: Session | null): string {
  const base = tenantHomeUrl(slug);
  if (!session?.access_token || !session.refresh_token) return base;
  const fragment = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: String(session.expires_in ?? 3600),
    token_type: 'bearer',
    type: 'magiclink',
  }).toString();
  return `${base}/#${fragment}`;
}
