import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  email: string;
  name: string;
}

interface EmailRequest {
  recipients: Recipient[];
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, subject, message }: EmailRequest = await req.json();

    console.log(`Sending email to ${recipients.length} recipients`);

    // Validate input
    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ error: "Subject and message are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send emails (using BCC for privacy)
    const emailResponse = await resend.emails.send({
      from: "Spelman Glee Club <noreply@gleeworld.org>",
      to: "noreply@gleeworld.org",
      bcc: recipients.map(r => r.email),
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Spelman College Glee Club</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Alumnae Communication</p>
          </div>
          <div style="padding: 30px; background: white;">
            <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div style="padding: 20px; background: #f5f5f5; text-align: center; color: #666; font-size: 12px;">
            <p>This email was sent to you as a member of the Spelman College Glee Club Alumnae community.</p>
            <p style="margin: 10px 0 0 0;">
              <a href="https://gleeworld.org/alumnae" style="color: #667eea; text-decoration: none;">
                Visit Alumnae Portal
              </a>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to ${recipients.length} recipients`,
        emailResponse 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-alumnae-email function:", error);
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
