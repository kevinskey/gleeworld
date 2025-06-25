
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendContractRequest {
  contractId: string;
  recipientEmail: string;
  recipientName: string;
  contractTitle: string;
  customMessage?: string;
  signatureFields?: any[];
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
      contractTitle, 
      customMessage,
      signatureFields 
    }: SendContractRequest = await req.json();

    console.log("Sending contract email for:", contractId);
    console.log("Recipient:", recipientEmail, recipientName);
    console.log("Signature fields provided:", signatureFields);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists by email
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', recipientEmail)
      .maybeSingle();

    let autoEnrollMessage = "";
    
    // If user doesn't exist, auto-enroll them
    if (!existingUser) {
      console.log("User not found, auto-enrolling:", recipientEmail);
      
      const { data: enrollData, error: enrollError } = await supabase.functions.invoke('auto-enroll-user', {
        body: {
          email: recipientEmail,
          fullName: recipientName,
          role: 'user'
        }
      });

      if (enrollError) {
        console.error("Auto-enrollment failed:", enrollError);
        // Continue anyway - we can still send the contract
      } else {
        console.log("User auto-enrolled successfully:", enrollData);
        autoEnrollMessage = `\n\nNote: An account has been created for you with email ${recipientEmail}. Your temporary password is: ${enrollData.tempPassword}\nPlease log in and change your password after signing the contract.`;
      }
    }

    // Use default signature fields if none provided
    const defaultSignatureFields = [
      {
        id: 1,
        label: 'Artist Signature',
        type: 'signature',
        required: true,
        page: 1,
        x: 100,
        y: 400,
        width: 200,
        height: 50,
        font_size: 12
      },
      {
        id: 2,
        label: 'Date Signed',
        type: 'date',
        required: true,
        page: 1,
        x: 350,
        y: 400,
        width: 150,
        height: 30,
        font_size: 12
      }
    ];

    const effectiveSignatureFields = Array.isArray(signatureFields) && signatureFields.length > 0 
      ? signatureFields 
      : defaultSignatureFields;

    console.log("Using signature fields:", effectiveSignatureFields);

    // Store contract recipient record
    const { error: recipientError } = await supabase
      .from('contract_recipients_v2')
      .insert({
        contract_id: contractId,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        custom_message: customMessage || null,
        email_status: 'sent',
        delivery_status: 'delivered'
      });

    if (recipientError) {
      console.error("Error storing recipient record:", recipientError);
    }

    // Get the contract signing URL
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovable.app') || 
                   req.headers.get('origin') || 
                   'https://your-app.lovable.app';
    
    const contractUrl = `${baseUrl}/contract-signing/${contractId}`;

    // Determine if there are signature fields
    const hasSignatureFields = effectiveSignatureFields.length > 0;
    const signatureFieldsMessage = hasSignatureFields 
      ? "The contract includes digital signature fields for easy online signing." 
      : "⚠️ No signature fields found: This contract may require manual review for signing requirements.";

    const signatureFieldsClass = hasSignatureFields ? "info" : "warning";
    const signatureFieldsBgColor = hasSignatureFields ? "#e3f2fd" : "#fff3e0";
    const signatureFieldsTextColor = hasSignatureFields ? "#1976d2" : "#f57c00";

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "ContractFlow <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Contract Signature Required: ${contractTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Contract Signature Required</h1>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello ${recipientName},</p>
            
            <p style="font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 25px;">
              You have been requested to review and sign the following contract:
            </p>
            
            <!-- Contract Info Card -->
            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 25px 0; background-color: #fafafa;">
              <h2 style="margin: 0 0 10px 0; color: #333; font-size: 20px;">${contractTitle}</h2>
              <p style="margin: 0; color: #666; font-size: 14px;">Contract ID: ${contractId.substring(0, 8)}...</p>
            </div>

            <!-- Signature Fields Status -->
            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 20px 0; background-color: ${signatureFieldsBgColor};">
              <p style="margin: 0; color: ${signatureFieldsTextColor}; font-size: 14px; display: flex; align-items: center;">
                ${hasSignatureFields ? '✓' : '⚠️'} ${signatureFieldsMessage}
              </p>
            </div>
            
            ${customMessage ? `
            <div style="border-left: 4px solid #2196f3; padding: 15px; margin: 25px 0; background-color: #f3f8ff;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Custom Message:</h3>
              <p style="margin: 0; color: #666; font-style: italic; white-space: pre-wrap;">${customMessage}</p>
            </div>
            ` : ''}
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${contractUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-size: 16px; 
                        font-weight: bold;">
                📄 Review and Sign Contract
              </a>
            </div>

            ${autoEnrollMessage ? `
            <div style="border: 1px solid #4caf50; border-radius: 8px; padding: 15px; margin: 20px 0; background-color: #f1f8e9;">
              <h3 style="margin: 0 0 10px 0; color: #2e7d32; font-size: 16px;">Account Created</h3>
              <p style="margin: 0; color: #2e7d32; font-size: 14px; white-space: pre-wrap;">${autoEnrollMessage}</p>
            </div>
            ` : ''}
            
            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              If you have any questions about this contract, please contact the sender directly.
              This link will remain active until the contract is signed.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">This email was sent by ContractFlow</p>
            <p style="margin: 5px 0 0 0;">Secure digital contract management platform</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      hasSignatureFields: hasSignatureFields,
      signatureFieldsCount: effectiveSignatureFields.length,
      autoEnrolled: !existingUser
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
