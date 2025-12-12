import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompleteSigningRequest {
  contractId: string;
  signatureData: string;
  dateSigned?: string;
  recipientEmail?: string;
  recipientName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId, signatureData, dateSigned, recipientEmail, recipientName }: CompleteSigningRequest = await req.json();

    console.log("Processing contract signing for:", contractId);
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

    // Check if there's an existing signature record
    const { data: existingSignature, error: signatureCheckError } = await supabase
      .from('contract_signatures_v2')
      .select('*')
      .eq('contract_id', contractId)
      .maybeSingle();

    if (signatureCheckError) {
      console.error('Error checking existing signature:', signatureCheckError);
    }

    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Use provided date or current date as fallback
    const signedDate = dateSigned || new Date().toLocaleDateString();
    const signedDateTime = new Date().toISOString();

    let signatureRecord;

    if (existingSignature && existingSignature.artist_signature_data) {
      // This is likely an admin signing completion
      console.log("Completing admin signature for existing artist signature");
      
      // Call the admin-sign-contract function
      const { data: adminSignData, error: adminSignError } = await supabase.functions.invoke('admin-sign-contract', {
        body: {
          contractId,
          signatureData,
          recipientEmail,
          recipientName
        }
      });

      if (adminSignError) {
        throw new Error('Failed to complete admin signature: ' + adminSignError.message);
      }

      return new Response(JSON.stringify(adminSignData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } else {
      // This is a new single-step signing (legacy support)
      console.log("Processing single-step contract signing");

      // Generate PDF with signature and signed date
      const pdfBytes = await generateSignedPDF(contract, signatureData, signedDate);
      
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

      // Store signature data permanently with the signed date
      const { data: newSignatureRecord, error: signatureError } = await supabase
        .from('contract_signatures_v2')
        .insert({
          contract_id: contractId,
          artist_signature_data: signatureData,
          signer_ip: clientIP,
          artist_signed_at: signedDateTime,
          date_signed: signedDate,
          pdf_storage_path: pdfFileName,
          status: 'completed'
        })
        .select()
        .single();

      if (signatureError) {
        throw new Error('Failed to store signature: ' + signatureError.message);
      }

      signatureRecord = newSignatureRecord;

      // Update contract status
      await supabase
        .from('contracts_v2')
        .update({ 
          status: 'completed',
          updated_at: signedDateTime
        })
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
          dateSigned: signedDate,
        });

        console.log("Email sent to:", recipientEmail);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      signatureId: signatureRecord.id,
      pdfPath: signatureRecord.pdf_storage_path || '',
      dateSigned: signedDate,
      status: signatureRecord.status
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

async function generateSignedPDF(contract: any, signatureData: string, dateSigned: string): Promise<Uint8Array> {
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

  // Convert base64 signature to image and embed it
  try {
    if (signatureData && signatureData.startsWith('data:image/png;base64,')) {
      const base64Data = signatureData.split(',')[1];
      const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      // Draw the signature image
      page.drawImage(signatureImage, {
        x: 50,
        y: 80,
        width: 200,
        height: 50,
      });
    }
  } catch (error) {
    console.error('Error embedding signature image:', error);
    // Fallback to text if image embedding fails
    page.drawText('[Digital Signature Applied]', {
      x: 50,
      y: 100,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0.5, 0),
    });
  }

  // Add the actual date when contract was signed
  page.drawText(`Date Signed: ${dateSigned}`, {
    x: 50,
    y: 50,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Add signature timestamp for audit trail
  const signedAt = new Date().toLocaleString();
  page.drawText(`Signed on: ${signedAt}`, {
    x: 50,
    y: 30,
    size: 10,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

async function sendSignedContractEmail({
  recipientEmail,
  recipientName,
  contractTitle,
  pdfUrl,
  dateSigned,
}: {
  recipientEmail: string;
  recipientName: string;
  contractTitle: string;
  pdfUrl: string;
  dateSigned: string;
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
          <p style="margin: 10px 0 0 0; color: #666;">Date Signed: ${dateSigned}</p>
          <p style="margin: 5px 0 0 0; color: #666;">Completed on: ${new Date().toLocaleString()}</p>
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
