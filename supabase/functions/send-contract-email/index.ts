
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'date' | 'text' | 'initials' | 'username';
  page: number;
  x: number;
  y: number;
  required: boolean;
}

interface ContractEmailRequest {
  recipientEmail: string;
  recipientName: string;
  contractTitle: string;
  contractId: string;
  senderName?: string;
  customMessage?: string;
  signatureFields?: SignatureField[];
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
      customMessage = "",
      signatureFields = []
    }: ContractEmailRequest = await req.json();

    console.log("Sending contract email to:", recipientEmail);
    console.log("Signature fields received:", signatureFields);
    console.log("Number of signature fields:", signatureFields?.length || 0);

    // Get the current origin from the request headers
    const origin = req.headers.get("origin") || "https://68e737ff-b69d-444d-8896-ed604144004c.lovableproject.com";
    const signatureUrl = `${origin}/contract-signing/${contractId}`;

    console.log("Generated signature URL:", signatureUrl);

    // Generate signature fields summary for email - Fixed the logic
    const signatureFieldsSummary = signatureFields && signatureFields.length > 0 ? `
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; font-weight: 600;">📝 Signature Fields Required:</h3>
        <div style="background-color: #dbeafe; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 15px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 500;">
            📋 Total fields: <strong>${signatureFields.length}</strong> | Required: <strong>${signatureFields.filter(f => f.required).length}</strong>
          </p>
        </div>
        <ul style="margin: 0; padding-left: 20px; color: #475569; list-style-type: disc;">
          ${signatureFields.map(field => {
            const getFieldIcon = (type: string) => {
              switch(type) {
                case 'signature': return '✍️';
                case 'date': return '📅';
                case 'text': return '📝';
                case 'initials': return '👤';
                case 'username': return '👥';
                default: return '📄';
              }
            };
            
            const getFieldDescription = (type: string) => {
              switch(type) {
                case 'signature': return 'Digital signature required';
                case 'date': return 'Date selection (auto-fillable)';
                case 'text': return 'Text input required';
                case 'initials': return 'Your initials required';
                case 'username': return 'Full name required';
                default: return 'Field completion required';
              }
            };
            
            return `
            <li style="margin-bottom: 10px; line-height: 1.6;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">${getFieldIcon(field.type)}</span>
                <strong style="color: #1e293b;">${field.label}</strong>
                ${field.required ? '<span style="color: #dc2626; font-size: 12px; font-weight: bold; background-color: #fef2f2; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">REQUIRED</span>' : '<span style="color: #059669; font-size: 12px; background-color: #f0fdf4; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Optional</span>'}
              </div>
              <div style="margin-top: 4px; margin-left: 24px;">
                <span style="color: #64748b; font-size: 13px;">${getFieldDescription(field.type)}</span>
              </div>
            </li>
          `}).join('')}
        </ul>
        <div style="margin-top: 15px; padding: 12px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            <strong>⚠️ Important:</strong> You must complete all required signature fields to finalize the contract.
          </p>
        </div>
      </div>
    ` : `
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
        <p style="margin: 0; color: #dc2626; font-size: 14px;">
          ⚠️ <strong>No signature fields found:</strong> This contract may require manual review for signing requirements.
        </p>
      </div>
    `;

    // Debug: Log the generated summary
    console.log("Generated signature fields summary length:", signatureFieldsSummary.length);

    const emailResponse = await resend.emails.send({
      from: "ContractFlow <noreply@kevinskey.com>",
      to: [recipientEmail],
      subject: `Contract for Signature: ${contractTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Contract Signature Required</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hello ${recipientName},</p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              You have been requested to review and sign the following contract:
            </p>
            
            <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin: 25px 0; border: 1px solid #e5e7eb;">
              <h2 style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">${contractTitle}</h2>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">Contract ID: ${contractId.slice(0, 8)}...</p>
            </div>
            
            ${signatureFieldsSummary}
            
            ${customMessage ? `
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e40af;">💬 Message from ${senderName}:</p>
              <p style="margin: 0; color: #1e40af; line-height: 1.6;">${customMessage}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${signatureUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 15px 30px; text-decoration: none; 
                        border-radius: 8px; display: inline-block; font-weight: 600;
                        font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                📄 Review and Sign Contract
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              If you have any questions about this contract, please contact <strong>${senderName}</strong>.
            </p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This email was sent by ContractFlow. If you received this email in error, please ignore it.
            </p>
          </div>
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
