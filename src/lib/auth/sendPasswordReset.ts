// One way to ask for a password reset, so every entry point gets the
// tenant's branding.
//
// supabase.auth.resetPasswordForEmail() sends through GoTrue's mailer, which
// has a single instance-wide sender name ("GleeWorld") and a single stock
// template. A Yo-Doc student asking yo-doc.com for a reset got an email from
// "GleeWorld" — an unrecognizable brand that reads like phishing. The
// gw-send-password-reset edge function mints the same recovery link and
// delivers it as the tenant instead.
//
// Call this rather than resetPasswordForEmail anywhere a human asks for a
// reset. The admin path (admin-reset-password) is unrelated and unaffected:
// that one sets a password directly and sends no mail.

import { supabase, getTenantSlug } from '@/integrations/supabase/client';

/**
 * Send a tenant-branded reset email.
 *
 * Resolves rather than rejects when the address is unknown: the function
 * deliberately cannot distinguish "sent" from "no such user", so callers must
 * show the same "check your email" state either way. Only a transport failure
 * throws.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.functions.invoke('gw-send-password-reset', {
    body: {
      email,
      // The origin matters: a tenant admin resetting from
      // theirchoir.gleeworld.org must land back on their own site, and the
      // branded host is what selects the branding.
      appOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
      // Only a hint; the function resolves the tenant from appOrigin, which
      // is also what GoTrue validates the redirect against.
      tenantSlug: getTenantSlug(),
    },
  });
  if (error) throw error;
}
