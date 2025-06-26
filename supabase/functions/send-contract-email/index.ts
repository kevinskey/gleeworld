
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
  isResend?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== SEND CONTRACT EMAIL FUNCTION STARTED ===");
  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));

  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Parsing request body...");
    const requestBody = await req.json();
    console.log("Request body received:", JSON.stringify(requestBody, null, 2));

    const { 
      contractId, 
      recipientEmail, 
      recipientName, 
      contractTitle, 
      customMessage,
      signatureFields,
      isResend = false
    }: SendContractRequest = requestBody;

    console.log("=== REQUEST VALIDATION ===");
    console.log("Contract ID:", contractId);
    console.log("Recipient Email:", recipientEmail);
    console.log("Recipient Name:", recipientName);
    console.log("Contract Title:", contractTitle);
    console.log("Is Resend:", isResend);
    console.log("Custom Message:", customMessage || "None");

    // Validate that we have the required recipient information
    if (!recipientEmail || recipientEmail.trim() === "") {
      console.error("❌ VALIDATION ERROR: No recipient email provided");
      throw new Error("Recipient email is required");
    }

    // Clean and validate the recipient email
    const cleanRecipientEmail = recipientEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(cleanRecipientEmail)) {
      console.error("❌ VALIDATION ERROR: Invalid email format:", cleanRecipientEmail);
      throw new Error("Invalid email format");
    }

    console.log("✅ Email validation passed. Using cleaned email:", cleanRecipientEmail);

    // Initialize Supabase client
    console.log("=== INITIALIZING SUPABASE CLIENT ===");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    console.log("✅ Supabase client initialized");

    // Check if user exists by email
    console.log("=== CHECKING IF USER EXISTS ===");
    const { data: existingUser, error: userCheckError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', cleanRecipientEmail)
      .maybeSingle();

    if (userCheckError) {
      console.error("❌ Error checking for existing user:", userCheckError);
    } else {
      console.log("User check result:", existingUser ? "User exists" : "User not found");
    }

    let autoEnrollMessage = "";
    
    // If user doesn't exist, auto-enroll them
    if (!existingUser) {
      console.log("=== AUTO-ENROLLING NEW USER ===");
      console.log("Calling auto-enroll function for:", cleanRecipientEmail);
      
      const { data: enrollData, error: enrollError } = await supabase.functions.invoke('auto-enroll-user', {
        body: {
          email: cleanRecipientEmail,
          fullName: recipientName,
          role: 'user'
        }
      });

      if (enrollError) {
        console.error("❌ Auto-enrollment failed:", enrollError);
        // Continue anyway - we can still send the contract
      } else {
        console.log("✅ User auto-enrolled successfully:", enrollData);
        autoEnrollMessage = `\n\nNote: An account has been created for you with email ${cleanRecipientEmail}. Your temporary password is: ${enrollData.tempPassword}\nPlease log in and change your password after signing the contract.`;
      }
    } else {
      console.log("✅ User already exists, skipping auto-enrollment");
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

    console.log("Using signature fields count:", effectiveSignatureFields.length);

    // Store contract recipient record
    console.log("=== STORING RECIPIENT RECORD ===");
    const { error: recipientError } = await supabase
      .from('contract_recipients_v2')
      .insert({
        contract_id: contractId,
        recipient_name: recipientName || cleanRecipientEmail.split('@')[0],
        recipient_email: cleanRecipientEmail,
        custom_message: customMessage || null,
        email_status: 'sent',
        delivery_status: 'delivered',
        is_resend: isResend,
        resend_reason: isResend ? 'User requested resend' : null
      });

    if (recipientError) {
      console.error("❌ Error storing recipient record:", recipientError);
    } else {
      console.log("✅ Recipient record stored successfully");
    }

    // Get the contract signing URL - Always use contract.gleeworld.org domain
    const contractUrl = `https://contract.gleeworld.org/contract-signing/${contractId}`;
    console.log("Contract signing URL:", contractUrl);

    // Determine if there are signature fields
    const hasSignatureFields = effectiveSignatureFields.length > 0;
    const signatureFieldsMessage = hasSignatureFields 
      ? "The contract includes digital signature fields for easy online signing." 
      : "⚠️ No signature fields found: This contract may require manual review for signing requirements.";

    const signatureFieldsClass = hasSignatureFields ? "info" : "warning";
    const signatureFieldsBgColor = hasSignatureFields ? "#e3f2fd" : "#fff3e0";
    const signatureFieldsTextColor = hasSignatureFields ? "#1976d2" : "#f57c00";

    // Update email subject and content for resends
    const emailSubject = isResend 
      ? `Contract Signature Required (Resent): ${contractTitle}`
      : `Contract Signature Required: ${contractTitle}`;

    const resendNotice = isResend 
      ? `<div style="border: 1px solid #ff9800; border-radius: 8px; padding: 15px; margin: 20px 0; background-color: #fff3e0;">
           <p style="margin: 0; color: #f57c00; font-size: 14px; display: flex; align-items: center;">
             📧 This is a resend of the contract signing request.
           </p>
         </div>`
      : '';

    console.log("=== PREPARING EMAIL ===");
    console.log("Email subject:", emailSubject);
    console.log("Sending to:", cleanRecipientEmail);

    // Check if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY not found in environment variables");
      throw new Error("Email service not configured - missing API key");
    }
    console.log("✅ Resend API key found");

    // Send email using Resend with the correct domain
    console.log("=== SENDING EMAIL VIA RESEND ===");
    const emailResponse = await resend.emails.send({
      from: "GleeWorld Contracts <contracts@contract.gleeworld.org>",
      to: [cleanRecipientEmail],
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Contract Signature Required</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">GleeWorld Contract Management</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello ${recipientName || cleanRecipientEmail.split('@')[0]},</p>
            
            <p style="font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 25px;">
              You have been requested to review and sign the following contract:
            </p>

            ${resendNotice}
            
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
              If you have any questions about this contract, please contact us at contracts@contract.gleeworld.org.
              This link will remain active until the contract is signed.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">This email was sent by GleeWorld Contract Management</p>
            <p style="margin: 5px 0 0 0;">Secure digital contract platform | contract.gleeworld.org</p>
          </div>
        </div>
      `,
    });

    console.log("=== EMAIL SEND RESULT ===");
    if (emailResponse.error) {
      console.error("❌ Resend API error:", emailResponse.error);
      throw new Error(`Email service error: ${emailResponse.error.message}`);
    }

    console.log("✅ Email sent successfully!");
    console.log("Email ID:", emailResponse.data?.id);
    console.log("Recipient:", cleanRecipientEmail);

    const responseData = { 
      success: true, 
      emailId: emailResponse.data?.id,
      hasSignatureFields: hasSignatureFields,
      signatureFieldsCount: effectiveSignatureFields.length,
      autoEnrolled: !existingUser,
      recipientEmail: cleanRecipientEmail,
      isResend: isResend
    };

    console.log("=== FUNCTION COMPLETED SUCCESSFULLY ===");
    console.log("Response data:", JSON.stringify(responseData, null, 2));

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== FUNCTION ERROR ===");
    console.error("Error type:", typeof error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
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
