// Self-service account deletion (App Store guideline 5.1.1(v)): the signed-in
// user permanently deletes their own auth account and app data.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== "DELETE") {
      return json({ error: 'Confirmation required: send { "confirm": "DELETE" }' }, 400);
    }

    const email = user.email ?? "";

    await admin.from("gw_security_audit_log").insert({
      user_id: user.id,
      action_type: "self_account_deletion",
      resource_type: "user_account",
      resource_id: user.id,
      details: { email, timestamp: new Date().toISOString() },
    });

    // Auth first: if cleanup fails, the account can no longer log in and an
    // admin can re-run admin_delete_user_data to finish.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: `Failed to delete account: ${delErr.message}` }, 500);

    const { error: cleanupErr } = await admin.rpc("admin_delete_user_data", {
      p_user_id: user.id,
      p_user_email: email,
    });
    if (cleanupErr) {
      console.error("Cleanup failed after auth deletion:", cleanupErr.message);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
