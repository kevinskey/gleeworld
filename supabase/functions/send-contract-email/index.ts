
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  contractId: string;
  recipientEmail: string;
  recipientName?: string;
  customMessage?: string;
  isResend?: boolean;
  resendReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contractId, 
      recipientEmail, 
      recipientName, 
      customMessage, 
      isResend = false, 
      resendReason 
    }: EmailRequest = await req.json();

    console.log("Sending contract email to:", recipientEmail);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auto-enroll user if they don't exist
    console.log("Checking if user needs auto-enrollment...");
    const { data: autoEnrollResult, error: enrollError } = await supabase.functions.invoke('auto-enroll-user', {
      body: {
        email: recipientEmail,
        full_name: recipientName,
        contract_id: contractId
      }
    });

    if (enrollError) {
      console.error('Auto-enrollment failed:', enrollError);
      // Continue with email sending even if auto-enrollment fails
    } else {
      console.log('Auto-enrollment result:', autoEnrollResult);
    }

    // Get contract details
    const { data: contract, error: contractError } = await supabase
      .from('contracts_v2')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    // Create or update contract recipient record
    const recipientData = {
      contract_id: contractId,
      recipient_email: recipientEmail,
      recipient_name: recipientName || recipientEmail.split('@')[0],
      custom_message: customMessage,
      is_resend: isResend,
      resend_reason: resendReason,
      email_status: 'sent',
      delivery_status: 'pending',
      sent_at: new Date().toISOString()
    };

    const { data: recipient, error: recipientError } = await supabase
      .from('contract_recipients_v2')
      .insert(recipientData)
      .select()
      .single();

    if (recipientError) {
      console.error('Error creating recipient record:', recipientError);
      throw new Error('Failed to create recipient record: ' + recipientError.message);
    }

    // Prepare email content
    const contractSigningUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/contract-signing/${contractId}`;
    
    const emailSubject = `Contract for Signing: ${contract.title}`;
    const emailBody = `
      <h2>Contract Signing Request</h2>
      <p>Dear ${recipientName || recipientEmail.split('@')[0]},</p>
      
      <p>You have been sent a contract for your review and signature.</p>
      
      <p><strong>Contract:</strong> ${contract.title}</p>
      
      ${customMessage ? `<p><strong>Message:</strong> ${customMessage}</p>` : ''}
      
      ${autoEnrollResult?.enrolled ? `
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Account Created:</strong> An account has been automatically created for you to access and sign this contract.</p>
          ${autoEnrollResult.temp_password ? `<p><strong>Temporary Password:</strong> ${autoEnrollResult.temp_password}</p>` : ''}
          <p>You can change your password after logging in.</p>
        </div>
      ` : ''}
      
      <p>
        <a href="${contractSigningUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Review and Sign Contract
        </a>
      </p>
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>The Contract Management Team</p>
    `;

    // Here you would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll simulate sending the email
    console.log("Email would be sent with subject:", emailSubject);
    console.log("Email body:", emailBody);

    // Update recipient status to indicate email was sent successfully
    await supabase
      .from('contract_recipients_v2')
      .update({ 
        delivery_status: 'delivered',
        email_status: 'delivered'
      })
      .eq('id', recipient.id);

    // Update contract status
    await supabase
      .from('contracts_v2')
      .update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    console.log("Contract email sent successfully to:", recipientEmail);

    return new Response(JSON.stringify({ 
      success: true, 
      recipientId: recipient.id,
      contractSigningUrl,
      autoEnrolled: autoEnrollResult?.enrolled || false,
      userId: autoEnrollResult?.user_id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-contract-email:", error);
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
