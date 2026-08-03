// Friendly messages for create-customer-portal-session failures. The raw
// error codes come back on the FunctionsHttpError response body (via
// edgeFunctionErrorMessage) — without this mapping the UI showed only the
// generic "Edge Function returned a non-2xx status code", which read as the
// button silently not working.
import { edgeFunctionErrorMessage } from './edgeFunctionError';

const FRIENDLY: Record<string, string> = {
  no_stripe_customer_for_tenant:
    'No Stripe billing on file yet — pick a plan in the Plan tab first.',
  admin_only: 'Only workspace admins can open the billing portal.',
  no_tenant_for_caller: 'Your account has no workspace — sign in again.',
  stripe_not_configured:
    "Stripe couldn't open the billing portal — try again in a moment.",
  stripe_portal_failed:
    "Stripe couldn't open the billing portal — try again in a moment.",
};

export async function billingPortalErrorMessage(
  error: unknown,
  data: Record<string, unknown> | null | undefined,
): Promise<string | null> {
  const raw = await edgeFunctionErrorMessage(error, data);
  if (raw == null) return null;
  return FRIENDLY[raw] ?? raw;
}
