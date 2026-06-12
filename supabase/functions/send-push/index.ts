// Send APNs push notifications to users' registered devices.
// Body: { userIds: string[], title: string, body: string, data?: Record<string,string> }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") ?? "";
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "";
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY") ?? "";
const APNS_TOPIC = Deno.env.get("APNS_TOPIC") ?? "org.gleeworld.app";
// Dev-signed builds (aps-environment: development) use the sandbox gateway.
const APNS_HOST = (Deno.env.get("APNS_PRODUCTION") === "true")
  ? "https://api.push.apple.com"
  : "https://api.sandbox.push.apple.com";

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedJwt: { token: string; iat: number } | null = null;

async function apnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // APNs accepts tokens up to 1h old; reuse for 45 min.
  if (cachedJwt && now - cachedJwt.iat < 2700) return cachedJwt.token;

  const pem = APNS_PRIVATE_KEY.replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
  );

  const header = b64url(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }));
  const payload = b64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: now }));
  const signingInput = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput),
  );
  const token = `${signingInput}.${b64url(new Uint8Array(sig))}`;
  cachedJwt = { token, iat: now };
  return token;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "APNs not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userIds: rawUserIds, groupId, title, body, data } = await req.json();
    let userIds: string[] = Array.isArray(rawUserIds) ? rawUserIds : [];
    if (userIds.length === 0 || !body) {
      return new Response(JSON.stringify({ error: "userIds[] and body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authorize: service-role callers pass; users must be members of the
    // group they're notifying, and may only target fellow members.
    const callerToken = (req.headers.get("authorization") ?? "").replace(/^bearer\s+/i, "");
    if (callerToken !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const { data: userData } = await admin.auth.getUser(callerToken);
      const caller = userData?.user;
      if (!caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof groupId !== "string") {
        return new Response(JSON.stringify({ error: "groupId required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roster } = await admin
        .from("gw_group_members").select("user_id").eq("group_id", groupId);
      const memberIds = new Set((roster ?? []).map((m: { user_id: string }) => m.user_id));
      if (!memberIds.has(caller.id)) {
        return new Response(JSON.stringify({ error: "Not a group member" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userIds = userIds.filter((id) => memberIds.has(id));
      if (userIds.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: tokens, error } = await admin
      .from("gw_push_tokens")
      .select("token, user_id")
      .in("user_id", userIds.slice(0, 500));
    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = await apnsJwt();

    // Per-user unread totals drive the app icon badge.
    const badges = new Map<string, number>();
    const { data: totals } = await admin.rpc("gw_unread_totals", {
      uids: [...new Set(tokens.map((t: { user_id: string }) => t.user_id))],
    });
    for (const r of totals ?? []) badges.set(r.user_id, Number(r.unread));

    const payloadFor = (userId: string) => JSON.stringify({
      aps: {
        alert: { title: title || "GleeWorld", body: String(body).slice(0, 500) },
        sound: "default",
        badge: badges.get(userId) ?? 1,
        "mutable-content": 1,
      },
      ...(data || {}),
    });

    let sent = 0;
    const stale: string[] = [];
    await Promise.all(tokens.map(async (t: { token: string; user_id: string }) => {
      try {
        const res = await fetch(`${APNS_HOST}/3/device/${t.token}`, {
          method: "POST",
          headers: {
            "authorization": `bearer ${jwt}`,
            "apns-topic": APNS_TOPIC,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "content-type": "application/json",
          },
          body: payloadFor(t.user_id),
        });
        if (res.ok) { sent++; return; }
        const errBody = await res.json().catch(() => ({}));
        if (res.status === 410 || errBody?.reason === "BadDeviceToken" || errBody?.reason === "Unregistered") {
          stale.push(t.token);
        } else {
          console.error("APNs error", res.status, errBody?.reason);
        }
      } catch (e) {
        console.error("APNs send failed", e);
      }
    }));

    if (stale.length > 0) {
      await admin.from("gw_push_tokens").delete().in("token", stale);
    }

    return new Response(JSON.stringify({ sent, removed: stale.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
