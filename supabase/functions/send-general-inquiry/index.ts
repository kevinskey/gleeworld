import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GeneralInquiryRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  userRole?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message, userRole }: GeneralInquiryRequest = await req.json();

    console.log("Processing general inquiry from:", email);

    // Send email to Chief of Staff
    const emailResponse = await resend.emails.send({
      from: "GleeWorld <onboarding@resend.dev>",
      to: ["chiefofstaff@gleeworld.org"], // Replace with actual Chief of Staff email
      subject: `General Inquiry: ${subject}`,
      html: `
        <h2>New General Inquiry Submitted</h2>
        <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; max-width: 600px;">
          <h3>Inquiry Details:</h3>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Role:</strong> ${userRole || 'Not specified'}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          
          <h3>Message:</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 10px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <hr style="margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px;">
            This inquiry was submitted through the GleeWorld Executive Services Directory.<br>
            Submitted at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    // Send confirmation email to the inquirer
    const confirmationResponse = await resend.emails.send({
      from: "GleeWorld <onboarding@resend.dev>",
      to: [email],
      subject: "Your inquiry has been received",
      html: `
        <h2>Thank you for your inquiry, ${name}!</h2>
        <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; max-width: 600px;">
          <p>We have received your general inquiry and our Chief of Staff will review it shortly.</p>
          
          <h3>Your submitted inquiry:</h3>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 10px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <p>We typically respond within 24-48 hours during business days.</p>
          
          <hr style="margin: 20px 0;">
          
          <p style="color: #666;">
            <strong>Spelman College Glee Club</strong><br>
            "To Amaze and Inspire"<br>
            <a href="https://gleeworld.org">Visit GleeWorld.org</a>
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully to Chief of Staff:", emailResponse);
    console.log("Confirmation sent to inquirer:", confirmationResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Inquiry submitted successfully",
        emailId: emailResponse.data?.id 
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
    console.error("Error in send-general-inquiry function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send inquiry" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);