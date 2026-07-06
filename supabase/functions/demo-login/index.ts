// demo-login — mint a session for one of the three public demo accounts.
//
// The prospect-facing demo is one-click: no credentials ever ship to the
// client. This function holds the passwords (env secrets) and exchanges
// them against GoTrue's password grant. All three accounts are flagged
// is_demo_viewer, so the sessions it returns are read-only under RLS
// regardless of what the client does with them.
//
// Body: { role: 'director' | 'student' | 'fan' }
// Returns: { access_token, refresh_token, expires_in }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACCOUNTS: Record<string, { email: string; passwordEnv: string }> = {
  director: { email: "demo-director@gleeworld.org", passwordEnv: "DEMO_DIRECTOR_PASSWORD" },
  student: { email: "demo-student@gleeworld.org", passwordEnv: "DEMO_STUDENT_PASSWORD" },
  fan: { email: "demo-fan@gleeworld.org", passwordEnv: "DEMO_FAN_PASSWORD" },
};

// Best-effort per-IP rate limit (per-instance memory — GoTrue's own limits
// back this up). 10 mints/minute is plenty for a human clicking around.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear(); // unbounded-growth guard
  return recent.length > MAX_PER_WINDOW;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json(429, { error: "rate_limited" });

  let role = "";
  try {
    role = ((await req.json()) as { role?: string }).role ?? "";
  } catch {
    return json(400, { error: "bad_json" });
  }
  const account = ACCOUNTS[role];
  if (!account) return json(400, { error: "bad_role" });

  const password = Deno.env.get(account.passwordEnv);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!password || !supabaseUrl || !anonKey) {
    console.error("[demo-login] missing env", { role, hasPassword: !!password });
    return json(500, { error: "not_configured" });
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email: account.email, password }),
  });
  if (!res.ok) {
    console.error("[demo-login] grant failed", res.status, await res.text());
    return json(502, { error: "signin_failed" });
  }
  const session = await res.json();
  return json(200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
  });
});
