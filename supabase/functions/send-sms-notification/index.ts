import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // consider narrowing to your domain
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

interface SMSNotificationRequest {
  groupId?: string | null;
  message: string;
  senderName: string;
  phoneNumbers?: string[]; // can be E.164 or user_id UUIDs
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164_RE = /^\+?[1-9]\d{6,14}$/; // not perfect, but good guard

const DEBUG = Deno.env.get("DEBUG_SMS") === "true";

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Strip spaces, dashes, parentheses
  let compact = trimmed.replace(/[\s().-]/g, "");
  
  // If it already starts with +, use as-is
  if (compact.startsWith("+")) {
    return E164_RE.test(compact) ? compact : null;
  }
  
  // For US numbers: 10 digits without country code, add +1
  if (compact.length === 10 && /^\d{10}$/.test(compact)) {
    return `+1${compact}`;
  }
  
  // For 11 digits starting with 1 (US with country code), add +
  if (compact.length === 11 && compact.startsWith("1") && /^\d{11}$/.test(compact)) {
    return `+${compact}`;
  }
  
  // Otherwise, add + and validate
  const withPlus = `+${compact}`;
  return E164_RE.test(withPlus) ? withPlus : null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function requireAuth(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new Error("Unauthorized: missing bearer token");

  // Validate token using service role client
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized: invalid token");
  return user;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { groupId, message, senderName, phoneNumbers }: SMSNotificationRequest = await req.json();

    if (!message || !senderName) {
      return new Response(JSON.stringify({ error: "senderName and message are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require a valid Supabase JWT to call this function
    await requireAuth(req, supabase);

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER"); // optional if you use Messaging Service
    const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID"); // preferred

    if (!twilioAccountSid || !twilioAuthToken || (!twilioPhoneNumber && !twilioMessagingServiceSid)) {
      return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let groupName = "Glee Club";
    let targets: string[] = Array.isArray(phoneNumbers) ? [...phoneNumbers] : [];

    // If groupId provided, pull members (as user_ids -> then resolve phone numbers)
    if (groupId && groupId !== "null") {
      const { data: grp, error: grpErr } = await supabase.from("gw_message_groups").select("name").eq("id", groupId).single();
      if (grpErr) throw grpErr;
      if (grp?.name) groupName = grp.name;

      const { data: memberRows, error: memberErr } = await supabase
        .from("gw_group_members")
        .select("user_id")
        .eq("group_id", groupId);

      if (memberErr) throw memberErr;

      const userIds = (memberRows ?? []).map(r => r.user_id).filter(Boolean);
      if (userIds.length) {
        const { data: profiles, error: profErr } = await supabase
          .from("gw_profiles")
          .select("user_id, phone_number")
          .in("user_id", userIds);

        if (profErr) throw profErr;
        const phonesFromGroup = (profiles ?? [])
          .map(p => p.phone_number as string | null)
          .filter((p): p is string => !!p);
        targets.push(...phonesFromGroup);
      }
    }

    // If provided "phoneNumbers" may actually be user_ids; resolve them
    const allLookLikeUUIDs = targets.length > 0 && targets.every(v => UUID_RE.test((v ?? "").trim()));
    if (allLookLikeUUIDs) {
      const { data: profiles, error: profErr } = await supabase
        .from("gw_profiles")
        .select("user_id, phone_number")
        .in("user_id", targets);

      if (profErr) throw profErr;
      targets = (profiles ?? [])
        .map(p => p.phone_number as string | null)
        .filter((p): p is string => !!p);
    }

    // Normalize, validate, and de-dupe
    const normalized = Array.from(
      new Set(
        targets
          .map(normalizePhone)
          .filter((p): p is string => !!p)
      )
    );

    if (normalized.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No valid phone numbers to notify" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Compose message (avoid naive 160 truncation; let Twilio segment if needed)
    // If you truly must limit length, consider detecting GSM vs UCS-2. Here we just cap at ~1000 chars hard-limit to avoid abuse.
    const composed = `${groupName}: ${senderName}: ${message}`.slice(0, 1000);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Small concurrency to respect provider limits
    const CONCURRENCY = 8;
    const batches = chunk(normalized, CONCURRENCY);

    const results: Array<{ phoneNumber: string; success: boolean; messageSid?: string; error?: string }> = [];

    for (const batch of batches) {
      const settled = await Promise.allSettled(
        batch.map(async (to) => {
          const form = new URLSearchParams();
          if (twilioMessagingServiceSid) {
            form.append("MessagingServiceSid", twilioMessagingServiceSid);
          } else if (twilioPhoneNumber) {
            form.append("From", twilioPhoneNumber);
          }
          form.append("To", to);
          form.append("Body", composed);

          const res = await fetch(twilioUrl, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
            body: form,
          });

          const text = await res.text();
          if (!res.ok) {
            // Twilio returns JSON with code/message more often than not
            let errMsg = text;
            try {
              const parsed = JSON.parse(text);
              errMsg = parsed.message || text;
            } catch { /* keep text */ }
            throw new Error(errMsg);
          }
          const data = JSON.parse(text);
          return { phoneNumber: to, success: true, messageSid: data.sid as string };
        })
      );

      for (const s of settled) {
        if (s.status === "fulfilled") {
          results.push(s.value);
        } else {
          results.push({ phoneNumber: "", success: false, error: s.reason?.message ?? String(s.reason) });
        }
      }
    }

    const totalSent = results.filter(r => r.success).length;
    const totalFailed = results.length - totalSent;

    // Optional: persist audit log
    const LOG_TABLE = Deno.env.get("GW_SMS_LOG_TABLE") || "gw_sms_log";
    try {
      const logEntries = results.map(r => ({
        group_id: groupId ?? null,
        sender_name: senderName,
        message_preview: composed.slice(0, 160),
        phone_number_hash: r.phoneNumber ? r.phoneNumber.slice(-4) : null,
        message_sid: r.messageSid ?? null,
        success: r.success,
        error: r.error ?? null,
      }));
      await supabase.from(LOG_TABLE).insert(logEntries);
    } catch (e) {
      // Don't fail the whole request if logging fails
      if (DEBUG) console.warn("SMS log insert failed:", e);
    }

    if (DEBUG) {
      console.log("SMS summary:", { totalSent, totalFailed, sample: results.slice(0, 3) });
    }

    return new Response(JSON.stringify({ success: true, totalSent, totalFailed, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("send-sms-notification error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});