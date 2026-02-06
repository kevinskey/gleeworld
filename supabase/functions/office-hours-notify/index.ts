import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OfficeHoursNotifyRequest {
  appointment_id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  appointment_type: string;
  appointment_date: string;
  appointment_time: string;
  topic: string;
  notes?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: OfficeHoursNotifyRequest = await req.json();
    console.log("office-hours-notify: Received request:", data);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    // Generate a unique action token for approve/deny
    const actionToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    // Update the appointment with the action token
    const { error: updateError } = await supabase
      .from("gw_appointments")
      .update({
        sms_action_token: actionToken,
        sms_notified_at: new Date().toISOString(),
      })
      .eq("id", data.appointment_id);

    if (updateError) {
      console.error("Error updating appointment with token:", updateError);
    }

    const baseUrl = "https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/office-hours-action";
    const approveUrl = `${baseUrl}?action=approve&token=${actionToken}`;
    const denyUrl = `${baseUrl}?action=deny&token=${actionToken}`;

    // Admin notification recipients
    const adminPhones = [
      "+14042705576",  // Dr. Johnson
    ];

    // SMS to admin with approve/deny links
    const adminSmsBody = `📅 Office Hours Request\n\n` +
      `Student: ${data.student_name}\n` +
      `Type: ${data.appointment_type}\n` +
      `Date: ${data.appointment_date}\n` +
      `Time: ${data.appointment_time}\n` +
      `Topic: ${data.topic}\n\n` +
      `✅ APPROVE: ${approveUrl}\n\n` +
      `❌ DENY: ${denyUrl}`;

    // SMS confirmation to student (if phone provided)
    const studentSmsBody = `🎵 GleeWorld: Your office hours request has been submitted!\n\n` +
      `Type: ${data.appointment_type}\n` +
      `Date: ${data.appointment_date}\n` +
      `Time: ${data.appointment_time}\n\n` +
      `You'll receive a confirmation once Dr. Johnson approves your appointment.`;

    const sendSms = async (to: string, body: string) => {
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        console.log("Twilio not configured, skipping SMS to", to);
        return null;
      }

      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const response = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: to,
            Body: body,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to send SMS to ${to}:`, errorText);
          return { error: errorText };
        }

        const result = await response.json();
        console.log(`SMS sent to ${to}:`, result.sid);
        return result;
      } catch (error) {
        console.error(`Error sending SMS to ${to}:`, error);
        return { error: (error as Error).message };
      }
    };

    // Send all SMS notifications
    const results = [];

    // Admin notifications
    for (const phone of adminPhones) {
      results.push(await sendSms(phone, adminSmsBody));
    }

    // Student notification
    if (data.student_phone) {
      results.push(await sendSms(data.student_phone, studentSmsBody));
    }

    console.log("office-hours-notify: All SMS sent:", results);

    return new Response(
      JSON.stringify({ success: true, results, actionToken }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in office-hours-notify:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
