import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  organization_name: string;
  contact_person_name: string;
  contact_email: string;
  contact_phone: string;
  event_name: string;
  event_date: string;
  venue_name: string;
  honorarium_amount?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-notification function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bookingData: BookingNotificationRequest = await req.json();
    console.log("Received booking notification request:", bookingData);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    // Admin notification recipients
    const adminEmails = ["gleeworld@spelman.edu"];
    const adminPhones = ["+14042705576"]; // Add admin phone numbers here

    // Build email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">New Booking Request Received</h1>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #1f2937; margin-top: 0;">${bookingData.event_name}</h2>
          <p><strong>Organization:</strong> ${bookingData.organization_name}</p>
          <p><strong>Contact:</strong> ${bookingData.contact_person_name}</p>
          <p><strong>Email:</strong> ${bookingData.contact_email}</p>
          <p><strong>Phone:</strong> ${bookingData.contact_phone || 'Not provided'}</p>
          <p><strong>Event Date:</strong> ${bookingData.event_date}</p>
          <p><strong>Venue:</strong> ${bookingData.venue_name}</p>
          ${bookingData.honorarium_amount ? `<p><strong>Honorarium Offered:</strong> $${bookingData.honorarium_amount.toLocaleString()}</p>` : ''}
        </div>
        <p style="color: #6b7280;">
          Log in to the <a href="https://gleeworld.org/dashboard?module=tour-management" style="color: #7c3aed;">Tour Manager Dashboard</a> to review and respond to this request.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          This is an automated notification from GleeWorld.org
        </p>
      </div>
    `;

    // Send email notification
    const emailPromise = resend.emails.send({
      from: "GleeWorld Bookings <onboarding@resend.dev>",
      to: adminEmails,
      subject: `📅 New Booking Request: ${bookingData.event_name} from ${bookingData.organization_name}`,
      html: emailHtml,
    });

    // Build SMS content
    const smsBody = `🎵 New Booking Request!\n\n${bookingData.event_name}\nFrom: ${bookingData.organization_name}\nDate: ${bookingData.event_date}\nContact: ${bookingData.contact_person_name}\n\nCheck the Tour Manager Dashboard to review.`;

    // Send SMS notifications
    const smsPromises = adminPhones.map(async (phone) => {
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        console.log("Twilio credentials not configured, skipping SMS");
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
            To: phone,
            Body: smsBody,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to send SMS to ${phone}:`, errorText);
          return { error: errorText };
        }

        const result = await response.json();
        console.log(`SMS sent successfully to ${phone}:`, result.sid);
        return result;
      } catch (error) {
        console.error(`Error sending SMS to ${phone}:`, error);
        return { error: error.message };
      }
    });

    // Wait for all notifications to be sent
    const [emailResult, ...smsResults] = await Promise.all([emailPromise, ...smsPromises]);
    
    console.log("Email result:", emailResult);
    console.log("SMS results:", smsResults);

    return new Response(
      JSON.stringify({
        success: true,
        email: emailResult,
        sms: smsResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
