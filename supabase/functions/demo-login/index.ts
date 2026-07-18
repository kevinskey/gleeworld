// demo-login — mint a session for one of the three demo accounts (director/
// student/fan) belonging to the CURRENT showcase demo tenant.
//
// The prospect-facing demo is one-click: no credentials ever ship to the
// client. This function holds the passwords (env secrets) and exchanges
// them against GoTrue's password grant. Every account is flagged
// is_demo_viewer, so the sessions it returns are read-only under RLS
// regardless of what the client does with them.
//
// Five showcase tenants exist, each with its own dedicated set of 3
// accounts (gw_profiles is one row per user — a single shared account
// can't have a different tenant/role per subdomain, so each tenant gets
// its own). Which tenant's accounts to use is read from the x-tenant-slug
// header (the same header every client request already sends — see
// src/integrations/supabase/client.ts), never trusted from the request
// body, so a caller can't ask for a different tenant's accounts than the
// subdomain they're actually on.
//
// Body: { role: 'director' | 'student' | 'fan' }
// Returns: { access_token, refresh_token, expires_in }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-slug",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The original tenant ('demo') kept its original account emails/env names
// for backward compatibility; the four newer showcase tenants follow a
// `demo-{tenant}-{role}` / `DEMO_{TENANT}_{ROLE}_PASSWORD` convention.
const SHOWCASE_TENANTS = ["demo", "choir", "district", "school", "songwriter"] as const;
type ShowcaseTenant = typeof SHOWCASE_TENANTS[number];

function accountFor(tenant: ShowcaseTenant, role: string): { email: string; passwordEnv: string } {
  if (tenant === "demo") {
    return {
      email: `demo-${role}@gleeworld.org`,
      passwordEnv: `DEMO_${role.toUpperCase()}_PASSWORD`,
    };
  }
  return {
    email: `demo-${tenant}-${role}@gleeworld.org`,
    passwordEnv: `DEMO_${tenant.toUpperCase()}_${role.toUpperCase()}_PASSWORD`,
  };
}

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
  if (hits.size > 10_000) {
    // Evict stale buckets only — a full clear() would let a burst of spoofed
    // IPs reset everyone's rate-limit state.
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
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
  if (!["director", "student", "fan"].includes(role)) {
    return json(400, { error: "bad_role" });
  }

  // x-tenant-slug is the real tenant slug (e.g. "demo-choir"); our internal
  // per-tenant key drops the "demo-" prefix ("choir") to match the account
  // naming convention. The bare 'demo' tenant (no prefix) stays 'demo'.
  const rawSlug = req.headers.get("x-tenant-slug") || "demo";
  const tenantKey = (rawSlug === "demo" ? "demo" : rawSlug.replace(/^demo-/, "")) as ShowcaseTenant;
  if (!SHOWCASE_TENANTS.includes(tenantKey)) {
    return json(400, { error: "not_a_demo_tenant" });
  }

  const account = accountFor(tenantKey, role);

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
  if (!session?.access_token || !session?.refresh_token) {
    console.error("[demo-login] grant returned no tokens");
    return json(502, { error: "signin_failed" });
  }
  return json(200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
  });
});
