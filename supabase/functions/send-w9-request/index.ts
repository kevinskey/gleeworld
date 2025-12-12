import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface W9RequestData {
  userId: string;
  contractId: string;
  contractTitle: string;
  recipientEmail: string;
  recipientName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, contractId, contractTitle, recipientEmail, recipientName }: W9RequestData = await req.json();

    console.log("Sending W9 request for user:", userId);
    console.log("Contract:", contractTitle);
    console.log("Recipient email:", recipientEmail);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user profile for better name formatting
    let displayName = recipientName;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      
      if (profile?.full_name) {
        displayName = profile.full_name;
        console.log("Found user profile name:", displayName);
      }
    } catch (error) {
      console.log("Could not fetch user profile, using provided name:", displayName);
    }

    const w9FormUrl = `https://contract.gleeworld.org/w9-form`;
    const dashboardUrl = `https://contract.gleeworld.org/dashboard`;

    // Send W9 request email
    const emailResponse = await resend.emails.send({
      from: "GleeWorld Contract System <noreply@contract.gleeworld.org>",
      to: [recipientEmail],
      reply_to: "admin@contract.gleeworld.org",
      subject: `W9 Form Required - Contract "${contractTitle}" Completed`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">W9 Form Required</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">GleeWorld Contract Management</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Dear ${displayName},</p>
            
            <p style="font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 25px;">
              Congratulations! Your contract "<strong>${contractTitle}</strong>" has been fully signed and completed by all parties.
            </p>

            <div style="border: 1px solid #28a745; border-radius: 8px; padding: 20px; margin: 25px 0; background-color: #f8fff9;">
              <h2 style="margin: 0 0 15px 0; color: #28a745; font-size: 20px;">✅ Next Step: Submit W9 Form</h2>
              <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6;">
                To be eligible for payment, please submit your W9 tax form. This is a standard requirement for all contractors.
              </p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${w9FormUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-size: 16px; 
                        font-weight: bold;
                        margin-right: 15px;">
                📄 Submit W9 Form
              </a>
              <a href="${dashboardUrl}" 
                 style="background: #6c757d; 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-size: 16px; 
                        font-weight: bold;">
                📊 View Dashboard
              </a>
            </div>

            <div style="border-left: 4px solid #17a2b8; padding: 15px; margin: 25px 0; background-color: #f0f8ff;">
              <h3 style="margin: 0 0 10px 0; color: #17a2b8; font-size: 16px;">Important Notes:</h3>
              <ul style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                <li>The W9 form is required by the IRS for tax reporting purposes</li>
                <li>Your payment will be processed once the W9 is submitted and approved</li>
                <li>Please ensure all information is accurate and complete</li>
                <li>Contact us if you have any questions about the process</li>
              </ul>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              Questions about the W9 form or payment process? Contact us at admin@contract.gleeworld.org
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">GleeWorld Contract Management</p>
            <p style="margin: 5px 0 0 0;">contract.gleeworld.org</p>
          </div>
        </div>
      `,
      text: `
W9 Form Required - Contract Completed

Dear ${displayName},

Congratulations! Your contract "${contractTitle}" has been fully signed and completed by all parties.

Next Step: Submit W9 Form
To be eligible for payment, please submit your W9 tax form. This is a standard requirement for all contractors.

Submit W9 Form: ${w9FormUrl}
View Dashboard: ${dashboardUrl}

Important Notes:
- The W9 form is required by the IRS for tax reporting purposes
- Your payment will be processed once the W9 is submitted and approved
- Please ensure all information is accurate and complete
- Contact us if you have any questions about the process

Questions about the W9 form or payment process? Contact us at admin@contract.gleeworld.org

---
GleeWorld Contract Management
contract.gleeworld.org
      `.trim(),
    });

    if (emailResponse.error) {
      console.error("W9 request email failed:", emailResponse.error);
      throw new Error(`Email service error: ${emailResponse.error.message}`);
    }

    console.log("W9 request email sent successfully!");
    console.log("Email ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      recipient: recipientEmail,
      contractTitle: contractTitle
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-w9-request:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
