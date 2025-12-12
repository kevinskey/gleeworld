import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://cdn.jsdelivr.net/npm/resend@2.0.0/+esm";
import { PDFDocument, rgb, StandardFonts } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminSignRequest {
  contractId: string;
  signatureData: string;
  recipientEmail?: string;
  recipientName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId, signatureData, recipientEmail, recipientName }: AdminSignRequest = await req.json();

    console.log("Processing admin signature for contract:", contractId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get contract and existing signature record
    const { data: contract, error: contractError } = await supabase
      .from('contracts_v2')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    const { data: existingSignature, error: signatureError } = await supabase
      .from('contract_signatures_v2')
      .select('*')
      .eq('contract_id', contractId)
      .single();

    if (signatureError || !existingSignature) {
      throw new Error('Artist signature not found');
    }

    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const signedDateTime = new Date().toISOString();

    // Parse existing embedded signatures
    let embeddedSignatures = [];
    try {
      embeddedSignatures = JSON.parse(existingSignature.embedded_signatures || '[]');
    } catch (e) {
      console.error('Error parsing embedded signatures:', e);
    }

    // Add admin signature to embedded signatures
    const adminSignature = {
      fieldId: 2,
      signatureData: signatureData,
      dateSigned: new Date().toLocaleDateString(),
      timestamp: signedDateTime,
      ipAddress: clientIP,
      signerType: 'admin',
      signerName: 'Admin/Agent'
    };

    embeddedSignatures.push(adminSignature);

    // Generate final signed PDF
    const pdfBytes = await generateFinalSignedPDF(
      contract, 
      existingSignature.artist_signature_data,
      existingSignature.date_signed || new Date().toLocaleDateString(),
      signatureData,
      new Date().toLocaleDateString()
    );
    
    // Upload final PDF
    const finalPdfFileName = `contract_${contractId}_fully_signed_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('signed-contracts')
      .upload(finalPdfFileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      throw new Error('Failed to store final PDF: ' + uploadError.message);
    }

    // Update signature record to completed
    const { data: updatedSignature, error: updateError } = await supabase
      .from('contract_signatures_v2')
      .update({
        admin_signature_data: signatureData,
        admin_signed_at: signedDateTime,
        pdf_storage_path: finalPdfFileName,
        status: 'completed',
        embedded_signatures: JSON.stringify(embeddedSignatures)
      })
      .eq('id', existingSignature.id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update signature record: ' + updateError.message);
    }

    // Update contract status
    await supabase
      .from('contracts_v2')
      .update({ 
        status: 'completed',
        updated_at: signedDateTime
      })
      .eq('id', contractId);

    // Find the user who signed the contract to send W9 request
    let userId = null;
    if (recipientEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', recipientEmail)
        .single();
      
      if (profile) {
        userId = profile.id;
      }
    }

    // Create notification about contract completion and W9 requirement
    if (userId) {
      await supabase
        .from('user_notifications')
        .insert([{
          user_id: userId,
          title: 'Contract Completed - W9 Form Required',
          message: `Your contract "${contract.title}" has been fully signed and completed. Please submit your W9 form to be eligible for payment.`,
          type: 'info',
          related_contract_id: contractId,
        }]);

      // Send W9 request email
      try {
        await supabase.functions.invoke('send-w9-request', {
          body: {
            userId: userId,
            contractId: contractId,
            contractTitle: contract.title,
            recipientEmail: recipientEmail,
            recipientName: recipientName
          }
        });
      } catch (emailError) {
        console.error('W9 request email failed:', emailError);
      }
    }

    console.log("Admin signature completed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      signatureId: updatedSignature.id,
      pdfPath: finalPdfFileName,
      status: 'completed'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in admin-sign-contract:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function generateFinalSignedPDF(
  contract: any, 
  artistSignatureData: string, 
  artistDateSigned: string,
  adminSignatureData: string,
  adminDateSigned: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  // Add contract title
  page.drawText(contract.title, {
    x: 50,
    y: height - 100,
    size: 20,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Add contract content
  const contentLines = contract.content.split('\n');
  let yPosition = height - 150;
  
  for (const line of contentLines) {
    if (yPosition < 200) break;
    
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
  }

  // Add artist signature section
  page.drawText('Artist Signature:', {
    x: 50,
    y: 180,
    size: 14,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Add artist signature image
  try {
    if (artistSignatureData && artistSignatureData.startsWith('data:image/png;base64,')) {
      const base64Data = artistSignatureData.split(',')[1];
      const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      page.drawImage(signatureImage, {
        x: 50,
        y: 120,
        width: 150,
        height: 40,
      });
    }
  } catch (error) {
    console.error('Error embedding artist signature:', error);
  }

  page.drawText(`Date: ${artistDateSigned}`, {
    x: 50,
    y: 80,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Add admin signature section
  page.drawText('Admin/Agent Signature:', {
    x: 300,
    y: 180,
    size: 14,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Add admin signature image
  try {
    if (adminSignatureData && adminSignatureData.startsWith('data:image/png;base64,')) {
      const base64Data = adminSignatureData.split(',')[1];
      const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      page.drawImage(signatureImage, {
        x: 300,
        y: 120,
        width: 150,
        height: 40,
      });
    }
  } catch (error) {
    console.error('Error embedding admin signature:', error);
  }

  page.drawText(`Date: ${adminDateSigned}`, {
    x: 300,
    y: 80,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Add completion timestamp
  page.drawText(`Contract fully executed on: ${new Date().toLocaleString()}`, {
    x: 50,
    y: 40,
    size: 10,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

serve(handler);
