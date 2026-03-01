import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decode the service account key from environment
const getServiceAccountKey = () => {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");
  try {
    return JSON.parse(raw);
  } catch {
    // Try base64 decode
    return JSON.parse(atob(raw));
  }
};

// Create a JWT for Google API auth
const createJwt = async (serviceAccount: any) => {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${encode(header)}.${encode(claim)}`;

  // Import the private key
  const pemKey = serviceAccount.private_key;
  const pemContents = pemKey.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${unsignedToken}.${signatureB64}`;
};

const getAccessToken = async (serviceAccount: any) => {
  const jwt = await createJwt(serviceAccount);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
    if (!calendarId) throw new Error("GOOGLE_CALENDAR_ID not configured");

    const serviceAccount = getServiceAccountKey();
    const accessToken = await getAccessToken(serviceAccount);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "sync_appointments") {
      // Fetch confirmed upcoming appointments
      const { data: appointments, error } = await supabase
        .from("gw_appointments")
        .select("*")
        .in("status", ["confirmed", "pending"])
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .order("appointment_date");

      if (error) throw error;

      let synced = 0;
      for (const apt of appointments || []) {
        const startDateTime = `${apt.appointment_date}T${apt.start_time || "09:00"}:00`;
        const endMinutes = (apt.duration_minutes || 30);
        const startDate = new Date(startDateTime);
        const endDate = new Date(startDate.getTime() + endMinutes * 60000);

        const event = {
          summary: `Office Hours: ${apt.client_name}`,
          description: `Type: ${apt.appointment_type || 'Office Hours'}\nEmail: ${apt.client_email || 'N/A'}\nPhone: ${apt.client_phone || 'N/A'}\nNotes: ${apt.notes || 'None'}`,
          start: { dateTime: startDate.toISOString(), timeZone: "America/New_York" },
          end: { dateTime: endDate.toISOString(), timeZone: "America/New_York" },
          status: apt.status === "confirmed" ? "confirmed" : "tentative",
        };

        const gcalResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          }
        );

        if (gcalResponse.ok) {
          synced++;
        } else {
          const errData = await gcalResponse.text();
          console.error(`Failed to sync appointment ${apt.id}:`, errData);
        }
      }

      return new Response(
        JSON.stringify({ success: true, synced, total: appointments?.length || 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("google-calendar-sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
