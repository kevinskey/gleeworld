// Shared LTI 1.3 helpers used by AGS/NRPS edge functions.
//
// Pattern: GleeWorld signs a JWT with its tool RSA private key, POSTs
// it to the platform's OAuth token endpoint as a JWT-bearer assertion,
// and gets back a short-lived access_token. That access_token then
// authorizes any AGS/NRPS REST call.

import * as jose from "https://deno.land/x/jose@v5.6.3/index.ts";

const PRIVATE_KEY_PEM = Deno.env.get("LTI_PRIVATE_KEY") ?? "";
const PUBLIC_JWK_RAW = Deno.env.get("LTI_PUBLIC_JWK") ?? "";

let cachedPrivateKey: CryptoKey | null = null;
let cachedKid: string | null = null;

async function getPrivateKey(): Promise<{ key: CryptoKey; kid: string }> {
  if (cachedPrivateKey && cachedKid) return { key: cachedPrivateKey, kid: cachedKid };
  if (!PRIVATE_KEY_PEM) throw new Error("LTI_PRIVATE_KEY not set in environment");
  if (!PUBLIC_JWK_RAW) throw new Error("LTI_PUBLIC_JWK not set in environment");
  // PEM is stored as one line with literal \n separators; normalize.
  const pem = PRIVATE_KEY_PEM.replace(/\\n/g, "\n");
  cachedPrivateKey = await jose.importPKCS8(pem, "RS256");
  cachedKid = JSON.parse(PUBLIC_JWK_RAW).kid;
  return { key: cachedPrivateKey, kid: cachedKid! };
}

// Mint the client-assertion JWT for the OAuth client_credentials grant.
// Audience MUST be the platform's auth_token_url per LTI spec.
export async function mintClientAssertion(args: {
  clientId: string;
  audience: string;
}): Promise<string> {
  const { key, kid } = await getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid })
    .setIssuer(args.clientId)
    .setSubject(args.clientId)
    .setAudience(args.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .setJti(crypto.randomUUID())
    .sign(key);
}

// Request a Bearer token from the platform's token endpoint, scoped to
// whichever AGS/NRPS scopes the caller needs.
export async function requestPlatformToken(args: {
  clientId: string;
  tokenUrl: string;
  scopes: string[];
}): Promise<string> {
  const assertion = await mintClientAssertion({ clientId: args.clientId, audience: args.tokenUrl });
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: assertion,
    scope: args.scopes.join(" "),
  });
  const res = await fetch(args.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`platform token ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error("platform token: missing access_token");
  return json.access_token as string;
}

// LTI AGS scope strings. Subset only — add as needed.
export const AGS_SCOPES = {
  LINEITEM:        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
  LINEITEM_READ:   "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
  RESULT_READ:     "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
  SCORE:           "https://purl.imsglobal.org/spec/lti-ags/scope/score",
};

export const NRPS_SCOPE = "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly";
