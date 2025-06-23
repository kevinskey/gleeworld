
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContractEmailRequest {
  recipientEmail: string;
  recipientName: string;
  contractTitle: string;
  contractId: string;
  senderName?: string;
  customMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      contractTitle,
      contractId,
      senderName = "ContractFlow",
      customMessage = ""
    }: ContractEmailRequest = await req.json();

    console.log("Sending contract email to:", recipientEmail);

    // Get the current origin from the request headers
    const origin = req.headers.get("origin") || "https://68e737ff-b69d-444d-8896-ed604144004c.lovableproject.com";
    const signatureUrl = `${origin}/contract-signing/${contractId}`;

    console.log("Generated signature URL:", signatureUrl);

    const emailResponse = await resend.emails.send({
      from: "ContractFlow <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Contract for Signature: ${contractTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Contract Signature Required</h1>
          
          <p>Hello ${recipientName},</p>
          
          <p>You have been requested to review and sign the following contract:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0; color: #333;">${contractTitle}</h2>
          </div>
          
          ${customMessage ? `
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Message from ${senderName}:</strong></p>
            <p style="margin: 10px 0 0 0;">${customMessage}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signatureUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Review and Sign Contract
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If you have any questions about this contract, please contact ${senderName}.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This email was sent by ContractFlow. If you received this email in error, please ignore it.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending contract email:", error);
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
