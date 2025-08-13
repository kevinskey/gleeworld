import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RescheduleEmailRequest {
  recipientEmail: string;
  recipientName: string;
  currentDate: string;
  currentTime: string;
  copyEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🎭 Reschedule email function started");
    
    // Check API key
    const apiKey = Deno.env.get("RESEND_API_KEY");
    console.log("API key status:", apiKey ? "API key found" : "API key missing");
    
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set");
      return new Response(JSON.stringify({ 
        error: 'RESEND_API_KEY is not configured' 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const resend = new Resend(apiKey);
    
    const requestData: RescheduleEmailRequest = await req.json();
    console.log("Request data received for:", requestData.recipientEmail);
    
    const { recipientEmail, recipientName, currentDate, currentTime, copyEmail } = requestData;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin-bottom: 10px;">Spelman College Glee Club</h1>
          <p style="color: #4a5568; font-size: 18px; margin: 0;">Audition Schedule Update</p>
        </div>

        <div style="background-color: #fed7d7; border: 1px solid #fc8181; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #c53030; margin-top: 0;">Important: Audition Time Change Required</h2>
          <p style="color: #742a2a; margin-bottom: 0;">Your current audition appointment needs to be rescheduled due to updated audition windows.</p>
        </div>

        <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #2d3748; margin-top: 0;">Dear ${recipientName},</h3>
          
          <p style="color: #4a5568; line-height: 1.6;">
            We hope this message finds you well and excited about your upcoming Spelman College Glee Club audition!
          </p>

          <p style="color: #4a5568; line-height: 1.6;">
            Due to scheduling adjustments, we need to update our audition time windows. Your current appointment scheduled for:
          </p>

          <div style="background-color: #edf2f7; border-left: 4px solid #4299e1; padding: 15px; margin: 15px 0;">
            <strong style="color: #2b6cb0;">Current Appointment:</strong><br>
            <span style="color: #4a5568;">${currentDate} at ${currentTime}</span>
          </div>

          <p style="color: #4a5568; line-height: 1.6;">
            <strong>New Audition Windows:</strong>
          </p>
          <ul style="color: #4a5568; line-height: 1.8;">
            <li><strong>Friday, August 16, 2025:</strong> 2:30 PM - 4:30 PM</li>
            <li><strong>Saturday, August 17, 2025:</strong> 11:00 AM - 1:00 PM</li>
          </ul>

          <p style="color: #4a5568; line-height: 1.6;">
            <strong>What you need to do:</strong>
          </p>
          <ol style="color: #4a5568; line-height: 1.8;">
            <li>Visit the audition scheduling portal: <a href="https://gleeworld.org/appointments" style="color: #4299e1;">https://gleeworld.org/appointments</a></li>
            <li>Select a new time slot within the updated windows</li>
            <li>Confirm your new appointment</li>
          </ol>

          <div style="background-color: #c6f6d5; border: 1px solid #68d391; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #22543d; margin: 0; font-weight: bold;">
              ⏰ Please reschedule by August 14, 2025 to secure your spot!
            </p>
          </div>

          <p style="color: #4a5568; line-height: 1.6;">
            If you have any questions or need assistance with rescheduling, please don't hesitate to contact us.
          </p>

          <p style="color: #4a5568; line-height: 1.6;">
            We look forward to hearing your beautiful voice and can't wait to meet you!
          </p>

          <p style="color: #4a5568; line-height: 1.6;">
            Warm regards,<br>
            <strong>The Spelman College Glee Club Team</strong>
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="color: #a0aec0; font-size: 14px; margin: 0;">
            Spelman College Glee Club<br>
            350 Spelman Lane SW, Atlanta, GA 30314<br>
            <a href="mailto:glee@spelman.edu" style="color: #4299e1;">glee@spelman.edu</a>
          </p>
        </div>
      </div>
    `;

    console.log("Sending email via Resend...");
    
    const emailResponse = await resend.emails.send({
      from: "Spelman Glee Club <noreply@gleeworld.org>",
      to: [recipientEmail],
      cc: copyEmail ? [copyEmail] : undefined,
      subject: "🎵 Important: Please Reschedule Your Glee Club Audition",
      html: emailContent,
    });

    console.log("Resend response:", JSON.stringify(emailResponse, null, 2));

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(`Resend error: ${JSON.stringify(emailResponse.error)}`);
    }

    console.log("✅ Email sent successfully");

    return new Response(JSON.stringify({
      success: true,
      messageId: emailResponse.data?.id,
      recipient: recipientEmail
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Function error:", error);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to send email',
      details: error.stack
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
};

serve(handler);