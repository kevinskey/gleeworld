// Browser-side caller for the public-intake edge function.
//
// Used by both the public booking page and the audition form. The visitor has
// no session, so this posts with the anon key and lets the function do the
// work. It never throws: every failure comes back as { ok: false, message }
// so callers can render the message directly.

import { getTenantSlug, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export interface PublicIntakeAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface PublicIntakeInput {
  kind: 'appointment' | 'audition';
  account: PublicIntakeAccount;
  payload: Record<string, unknown>;
}

export type PublicIntakeResult =
  | { ok: true; recordId: string; accountStatus: 'created' | 'existing' }
  | { ok: false; reason: string; message: string };

export async function submitPublicIntake(
  input: PublicIntakeInput,
): Promise<PublicIntakeResult> {
  const tenantSlug = getTenantSlug();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-tenant-slug': tenantSlug,
      },
      body: JSON.stringify({ ...input, tenantSlug }),
    });
    try {
      return (await res.json()) as PublicIntakeResult;
    } catch {
      return {
        ok: false,
        reason: 'invalid_response',
        message: "Something went wrong on our end. Please try again in a moment.",
      };
    }
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: "We couldn't connect. Check your connection and try again.",
    };
  }
}
