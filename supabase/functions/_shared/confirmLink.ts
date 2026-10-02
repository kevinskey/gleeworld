// Scanner-safe sign-in links.
//
// GoTrue's `action_link` points straight at /auth/v1/verify, and that GET is
// what consumes the one-time token. Corporate mail security opens links in
// incoming mail before the human does: on 2026-10-02 a Microsoft Defender
// scanner (135.232.19.0, UA "Windows NT 10.0 / Chrome 142") followed an
// invite 18 seconds after it was minted, COMPLETED THE LOGIN, and called
// /user with the resulting session. The member — on a @spelman.edu address,
// so behind Microsoft 365 — then got "Email link is invalid or has expired"
// when she tapped the same link. Every address behind Safe Links, Proofpoint,
// Mimecast or Barracuda hits this.
//
// So we never email a URL that spends the token. We email our own
// /auth/confirm page carrying the token HASH, and that page only calls
// verifyOtp after a real tap. Scanners fetch the HTML; they don't tap.
//
// Shape of the admin generate_link response we read:
//   { action_link, properties: { hashed_token, verification_type, … } }

export interface GenerateLinkResponse {
  action_link?: string;
  properties?: {
    hashed_token?: string;
    verification_type?: string;
    action_link?: string;
  };
}

/**
 * Build the /auth/confirm URL for a freshly-minted link.
 *
 * Returns undefined when it cannot — no origin to build against, or GoTrue
 * gave us no hashed_token — so callers can fall back to `action_link` rather
 * than email nothing at all. A link a scanner might eat still beats no link.
 */
export function buildConfirmLink(
  origin: string | undefined,
  linkData: GenerateLinkResponse | null | undefined,
  next?: string,
): string | undefined {
  const props = linkData?.properties;
  const tokenHash = props?.hashed_token;
  if (!origin || !tokenHash) return undefined;
  // verification_type is the string verifyOtp() expects: magiclink, recovery,
  // invite, signup, email_change. Default to magiclink — the type every
  // caller here mints except the password-reset path, which sets it.
  const type = props?.verification_type ?? "magiclink";
  try {
    const url = new URL("/auth/confirm", origin);
    url.searchParams.set("token_hash", tokenHash);
    url.searchParams.set("type", type);
    if (next) url.searchParams.set("next", next);
    return url.toString();
  } catch {
    // Malformed origin — same fallback as a missing one.
    return undefined;
  }
}
