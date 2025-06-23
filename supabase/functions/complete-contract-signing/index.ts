
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompleteSigningRequest {
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
    const { contractId, signatureData, recipientEmail, recipientName }: CompleteSigningRequest = await req.json();

    console.log("Processing contract signing for:", contractId);

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

    // Store signature data permanently
    const { data: signatureRecord, error: signatureError } = await supabase
      .from('contract_signatures_v2')
      .insert({
        contract_id: contractId,
        signature_data: signatureData,
        signer_ip: clientIP,
      })
      .select()
      .single();

    if (signatureError) {
      throw new Error('Failed to store signature: ' + signatureError.message);
    }

    console.log("Signature stored with ID:", signatureRecord.id);

    // Generate PDF with signature
    const pdfBytes = await generateSignedPDF(contract, signatureData);
    
    // Upload PDF to storage
    const pdfFileName = `contract_${contractId}_signed_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('signed-contracts')
      .upload(pdfFileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      throw new Error('Failed to store PDF: ' + uploadError.message);
    }

    // Update signature record with PDF path
    await supabase
      .from('contract_signatures_v2')
      .update({ pdf_storage_path: pdfFileName })
      .eq('id', signatureRecord.id);

    // Update contract status
    await supabase
      .from('contracts_v2')
      .update({ status: 'completed' })
      .eq('id', contractId);

    console.log("PDF stored at:", pdfFileName);

    // Send email if recipient info provided
    if (recipientEmail && recipientName) {
      const { data: pdfUrl } = supabase.storage
        .from('signed-contracts')
        .getPublicUrl(pdfFileName);

      await sendSignedContractEmail({
        recipientEmail,
        recipientName,
        contractTitle: contract.title,
        pdfUrl: pdfUrl.publicUrl,
      });

      console.log("Email sent to:", recipientEmail);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      signatureId: signatureRecord.id,
      pdfPath: pdfFileName
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in complete-contract-signing:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function generateSignedPDF(contract: any, signatureData: string): Promise<Uint8Array> {
  // Create a new PDF document
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
    if (yPosition < 150) break; // Leave space for signature
    
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
  }

  // Add signature section
  page.drawText('Digital Signature:', {
    x: 50,
    y: 120,
    size: 14,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Add signature timestamp
  const signedAt = new Date().toLocaleString();
  page.drawText(`Signed on: ${signedAt}`, {
    x: 50,
    y: 80,
    size: 10,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Note: In a real implementation, you'd embed the actual signature image
  // For now, we'll add a placeholder text
  page.drawText('[Digital Signature Applied]', {
    x: 50,
    y: 100,
    size: 10,
    font: timesRomanFont,
    color: rgb(0, 0.5, 0),
  });

  return await pdfDoc.save();
}

async function sendSignedContractEmail({
  recipientEmail,
  recipientName,
  contractTitle,
  pdfUrl,
}: {
  recipientEmail: string;
  recipientName: string;
  contractTitle: string;
  pdfUrl: string;
}) {
  const emailResponse = await resend.emails.send({
    from: "ContractFlow <onboarding@resend.dev>",
    to: [recipientEmail],
    subject: `Signed Contract: ${contractTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Contract Signed Successfully</h1>
        
        <p>Hello ${recipientName},</p>
        
        <p>Your contract has been signed successfully!</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0; color: #333;">${contractTitle}</h2>
          <p style="margin: 10px 0 0 0; color: #666;">Signed on: ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Download Signed Contract (PDF)
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Please keep this signed contract for your records.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          This email was sent by ContractFlow. The signed contract is available for download.
        </p>
      </div>
    `,
  });

  return emailResponse;
}

serve(handler);
