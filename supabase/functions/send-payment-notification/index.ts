import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  userId: string;
  amount: number;
  paymentMethod: string;
  contractId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, amount, paymentMethod, contractId }: PaymentNotificationRequest = await req.json();

    console.log("Sending payment notification for user:", userId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    // Get contract details if provided
    let contractInfo = '';
    if (contractId) {
      const { data: contract } = await supabase
        .from('contracts_v2')
        .select('title')
        .eq('id', contractId)
        .single();
      
      if (contract) {
        contractInfo = ` for contract "${contract.title}"`;
      }
    }

    const recipientName = profile.full_name || profile.email.split('@')[0];

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "GleeWorld Contract System <noreply@contract.gleeworld.org>",
      to: [profile.email],
      reply_to: "admin@contract.gleeworld.org",
      subject: "Payment Issued - Thank You for Your Service",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Payment Issued</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">GleeWorld Contract Management</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Dear ${recipientName},</p>
            
            <p style="font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 25px;">
              Thank you for your excellent service! We are pleased to inform you that your payment has been issued.
            </p>
            
            <!-- Payment Details -->
            <div style="border: 1px solid #28a745; border-radius: 8px; padding: 20px; margin: 25px 0; background-color: #f8fff9;">
              <h2 style="margin: 0 0 15px 0; color: #28a745; font-size: 20px;">💰 Payment Details</h2>
              <p style="margin: 5px 0; color: #333; font-size: 16px;"><strong>Amount:</strong> $${amount}</p>
              <p style="margin: 5px 0; color: #333; font-size: 16px;"><strong>Method:</strong> ${paymentMethod}</p>
              ${contractInfo ? `<p style="margin: 5px 0; color: #333; font-size: 16px;"><strong>For:</strong> ${contractInfo.substring(5)}</p>` : ''}
              <p style="margin: 5px 0; color: #333; font-size: 16px;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p style="font-size: 16px; color: #666; line-height: 1.6; margin: 25px 0;">
              We appreciate your professionalism and dedication. We look forward to working with you again in the future.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="https://contract.gleeworld.org/dashboard" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-size: 16px; 
                        font-weight: bold;">
                📊 View Your Dashboard
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              Questions about your payment? Contact us at admin@contract.gleeworld.org
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
Payment Issued - Thank You for Your Service

Dear ${recipientName},

Thank you for your excellent service! We are pleased to inform you that your payment has been issued.

Payment Details:
- Amount: $${amount}
- Method: ${paymentMethod}
${contractInfo ? `- For: ${contractInfo.substring(5)}\n` : ''}- Date: ${new Date().toLocaleDateString()}

We appreciate your professionalism and dedication. We look forward to working with you again in the future.

View your dashboard: https://contract.gleeworld.org/dashboard

Questions about your payment? Contact us at admin@contract.gleeworld.org

---
GleeWorld Contract Management
contract.gleeworld.org
      `.trim(),
    });

    if (emailResponse.error) {
      console.error("Email sending failed:", emailResponse.error);
      throw new Error(`Email service error: ${emailResponse.error.message}`);
    }

    console.log("Payment notification email sent successfully!");
    console.log("Email ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      recipient: profile.email
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-payment-notification:", error);
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
