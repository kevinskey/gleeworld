import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle both GET (from SMS links) and OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "approve" or "deny"
    const token = url.searchParams.get("token");

    console.log("office-hours-action:", { action, token });

    if (!action || !token) {
      return new Response(renderHtml("Missing Parameters", "Invalid link. Please try again.", "error"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (action !== "approve" && action !== "deny") {
      return new Response(renderHtml("Invalid Action", "Action must be 'approve' or 'deny'.", "error"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the appointment by token
    const { data: appointment, error: fetchError } = await supabase
      .from("gw_appointments")
      .select("*")
      .eq("sms_action_token", token)
      .single();

    if (fetchError || !appointment) {
      console.error("Appointment not found for token:", token, fetchError);
      return new Response(
        renderHtml("Not Found", "This appointment link has expired or is invalid.", "error"),
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // Check if already processed
    if (appointment.status === "confirmed" || appointment.status === "cancelled") {
      return new Response(
        renderHtml(
          "Already Processed",
          `This appointment has already been ${appointment.status}. No further action needed.`,
          "info"
        ),
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }

    // Update the appointment status
    const newStatus = action === "approve" ? "confirmed" : "cancelled";
    const { error: updateError } = await supabase
      .from("gw_appointments")
      .update({
        status: newStatus,
        approved_by: null, // SMS action, no specific user ID
        approved_at: new Date().toISOString(),
        sms_action_token: null, // Invalidate token after use
      })
      .eq("id", appointment.id);

    if (updateError) {
      console.error("Error updating appointment:", updateError);
      return new Response(
        renderHtml("Error", "Failed to update appointment. Please try again.", "error"),
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    // Send confirmation SMS to student
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (appointment.client_phone && twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      const studentMsg = action === "approve"
        ? `🎵 GleeWorld: Your office hours appointment has been APPROVED! ✅\n\nDate: ${appointment.appointment_date}\nSee you there!`
        : `🎵 GleeWorld: Your office hours appointment has been declined. ❌\n\nPlease book a different time at gleeworld.org/book-appointment`;

      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: appointment.client_phone,
            Body: studentMsg,
          }),
        });
        console.log("Confirmation SMS sent to student:", appointment.client_phone);
      } catch (smsError) {
        console.error("Failed to send student confirmation SMS:", smsError);
      }
    }

    // Render success page
    const title = action === "approve" ? "Appointment Approved ✅" : "Appointment Denied ❌";
    const message = action === "approve"
      ? `The appointment for ${appointment.client_name} has been confirmed. A confirmation SMS has been sent to the student.`
      : `The appointment for ${appointment.client_name} has been declined. The student has been notified.`;

    return new Response(
      renderHtml(title, message, action === "approve" ? "success" : "denied"),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("Error in office-hours-action:", error);
    return new Response(
      renderHtml("Error", "An unexpected error occurred. Please try again.", "error"),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
});

function renderHtml(title: string, message: string, type: string): string {
  const colors = {
    success: { bg: "#ecfdf5", border: "#10b981", text: "#065f46", icon: "✅" },
    denied: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b", icon: "❌" },
    error: { bg: "#fefce8", border: "#f59e0b", text: "#92400e", icon: "⚠️" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", icon: "ℹ️" },
  };
  const c = colors[type as keyof typeof colors] || colors.info;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - GleeWorld</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${c.bg};
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      border-top: 4px solid ${c.border};
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: ${c.text}; font-size: 22px; margin-bottom: 12px; }
    p { color: #6b7280; font-size: 15px; line-height: 1.5; }
    .logo { margin-top: 24px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${c.icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="logo">🎵 GleeWorld.org</div>
  </div>
</body>
</html>`;
}
