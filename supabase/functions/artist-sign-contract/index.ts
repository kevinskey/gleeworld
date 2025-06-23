
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ArtistSignRequest {
  contractId: string;
  artistSignatureData: string;
  dateSigned?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId, artistSignatureData, dateSigned }: ArtistSignRequest = await req.json();

    console.log("Processing artist signature for contract:", contractId);
    console.log("Date signed:", dateSigned);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get contract details
    const { data: contract, error: contractError } = await supabase
      .from('contracts_v2')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Use provided date or current date as fallback
    const signedDate = dateSigned || new Date().toLocaleDateString();
    const signedDateTime = new Date().toISOString();

    // Store artist signature data
    const { data: signatureRecord, error: signatureError } = await supabase
      .from('contract_signatures_v2')
      .insert({
        contract_id: contractId,
        artist_signature_data: artistSignatureData,
        artist_signed_at: signedDateTime,
        date_signed: signedDate,
        signer_ip: clientIP,
        status: 'pending_admin_signature'
      })
      .select()
      .single();

    if (signatureError) {
      throw new Error('Failed to store artist signature: ' + signatureError.message);
    }

    console.log("Artist signature stored with ID:", signatureRecord.id);

    // Get admin emails for notifications
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('email')
      .in('role', ['admin', 'super-admin']);

    if (adminError) {
      console.error('Error fetching admin emails:', adminError);
    }

    // Send email notifications to admins
    if (adminProfiles && adminProfiles.length > 0) {
      for (const admin of adminProfiles) {
        if (admin.email) {
          // Store notification in database
          await supabase
            .from('admin_contract_notifications')
            .insert({
              contract_id: contractId,
              signature_id: signatureRecord.id,
              admin_email: admin.email,
              notification_type: 'contract_ready_for_admin_signature'
            });

          // Send email notification
          try {
            await resend.emails.send({
              from: "ContractFlow <onboarding@resend.dev>",
              to: [admin.email],
              subject: `Contract Ready for Admin Signature: ${contract.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #333;">Contract Ready for Admin Signature</h1>
                  
                  <p>Hello Admin,</p>
                  
                  <p>A contract has been signed by the artist and is now ready for your admin signature.</p>
                  
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin: 0; color: #333;">${contract.title}</h2>
                    <p style="margin: 10px 0 0 0; color: #666;">Artist signed on: ${signedDate}</p>
                    <p style="margin: 5px 0 0 0; color: #666;">Signed at: ${new Date().toLocaleString()}</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://', 'https://app.')}/admin/contracts/${contractId}/sign" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                      Review and Sign Contract
                    </a>
                  </div>
                  
                  <p style="color: #666; font-size: 14px;">
                    Please review and sign this contract to complete the process.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  
                  <p style="color: #999; font-size: 12px;">
                    This email was sent by ContractFlow. Please sign the contract to complete the process.
                  </p>
                </div>
              `,
            });
            console.log("Admin notification email sent to:", admin.email);
          } catch (emailError) {
            console.error("Failed to send admin notification email:", emailError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      signatureId: signatureRecord.id,
      dateSigned: signedDate,
      status: 'pending_admin_signature',
      message: 'Artist signature recorded. Admin notification sent.'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in artist-sign-contract:", error);
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
