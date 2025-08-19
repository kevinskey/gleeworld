// Deno deploy target (Supabase Edge Functions)
// Resets passwords for users by app role (default: 'member') to 'Spelman'.
// Auth: requires a logged-in admin (profiles.role === 'admin') OR an x-admin-key header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EDGE_KEY = Deno.env.get("ADMIN_EDGE_KEY") ?? ""; // optional backdoor for CI

type ReqBody = {
  role?: string;          // default "member"
  newPassword?: string;   // default "Spelman"
  dryRun?: boolean;       // default false
  limit?: number;         // optional batch limit
};

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
function bad(msg: string, status = 400) {
  return ok({ error: msg }, status);
}

async function getAuthedUser(req: Request) {
  const supa = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) return null;
  return { supa, user: data.user };
}

async function isAdminByProfile(userId: string) {
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await adminClient.from("gw_profiles").select("role").eq("user_id", userId).single();
  if (error) return false;
  return data?.role === "admin";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return bad("Use POST", 405);

  // Auth: allow either x-admin-key or an authenticated admin user
  const headerKey = req.headers.get("x-admin-key");
  let adminAuthOK = !!(ADMIN_EDGE_KEY && headerKey && ADMIN_EDGE_KEY === headerKey);

  if (!adminAuthOK) {
    const authed = await getAuthedUser(req);
    if (!authed) return bad("Unauthorized", 401);
    const isAdmin = await isAdminByProfile(authed.user.id);
    if (!isAdmin) return bad("Forbidden", 403);
    adminAuthOK = true;
  }

  const body = (await req.json().catch(() => ({}))) as ReqBody;
  const targetRole = body.role ?? "member";
  const newPassword = body.newPassword ?? "Spelman"; // Capital S
  const dryRun = !!body.dryRun;
  const limit = body.limit && body.limit > 0 ? body.limit : undefined;

  if (newPassword.length < 6) return bad("Password too short per Supabase min length");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Fetch target user ids by app role from gw_profiles
  let q = admin.from("gw_profiles").select("user_id").eq("role", targetRole);
  if (limit) q = q.limit(limit);
  const { data: rows, error: qErr } = await q;
  if (qErr) return bad(`Query error: ${qErr.message}`, 500);
  if (!rows?.length) return ok({ message: `No users with role '${targetRole}'` });

  if (dryRun) {
    return ok({ dryRun: true, count: rows.length, sample: rows.slice(0, 10) });
  }

  let success = 0;
  const failures: Array<{ user_id: string; error: string }> = [];

  for (const r of rows) {
    const { error: updErr } = await admin.auth.admin.updateUserById(r.user_id, { password: newPassword });
    if (updErr) failures.push({ user_id: r.user_id, error: updErr.message });
    else success++;
  }

  return ok({ role: targetRole, setTo: newPassword, success, failed: failures.length, failures });
});