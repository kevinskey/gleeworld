
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import { Resend } from "npm:resend@2.0.0";

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

    // Get contract and signature details
    const { data: contract, error: contractError } = await supabase
      .from('contracts_v2')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    const { data: signatureRecord, error: signatureError } = await supabase
      .from('contract_signatures_v2')
      .select('*')
      .eq('contract_id', contractId)
      .single();

    if (signatureError || !signatureRecord) {
      throw new Error('Signature record not found');
    }

    // Download the existing interim PDF with artist signature
    let existingPdfBytes: Uint8Array;
    if (signatureRecord.pdf_storage_path) {
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('signed-contracts')
        .download(signatureRecord.pdf_storage_path);

      if (downloadError) {
        console.error('Error downloading interim PDF:', downloadError);
        // If we can't download, generate a new PDF
        existingPdfBytes = await generateNewPDFWithBothSignatures(
          contract, 
          signatureRecord.artist_signature_data, 
          signatureData, 
          signatureRecord.date_signed || new Date().toLocaleDateString()
        );
      } else {
        existingPdfBytes = new Uint8Array(await pdfData.arrayBuffer());
      }
    } else {
      // Generate new PDF if no existing one
      existingPdfBytes = await generateNewPDFWithBothSignatures(
        contract, 
        signatureRecord.artist_signature_data, 
        signatureData, 
        signatureRecord.date_signed || new Date().toLocaleDateString()
      );
    }

    // Add admin signature to the existing PDF
    const finalPdfBytes = await addAdminSignatureToPDF(existingPdfBytes, signatureData);
    
    // Upload final PDF to storage
    const finalPdfFileName = `contract_${contractId}_fully_signed_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('signed-contracts')
      .upload(finalPdfFileName, finalPdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Final PDF upload error:', uploadError);
      throw new Error('Failed to store final PDF: ' + uploadError.message);
    }

    // Update signature record
    const adminSignedAt = new Date().toISOString();
    await supabase
      .from('contract_signatures_v2')
      .update({
        admin_signature_data: signatureData,
        admin_signed_at: adminSignedAt,
        pdf_storage_path: finalPdfFileName,
        status: 'completed'
      })
      .eq('id', signatureRecord.id);

    // Update contract status
    await supabase
      .from('contracts_v2')
      .update({ 
        status: 'completed',
        updated_at: adminSignedAt
      })
      .eq('id', contractId);

    // Delete the interim PDF to save storage space
    if (signatureRecord.pdf_storage_path && signatureRecord.pdf_storage_path !== finalPdfFileName) {
      await supabase.storage
        .from('signed-contracts')
        .remove([signatureRecord.pdf_storage_path]);
    }

    console.log("Final PDF stored at:", finalPdfFileName);

    // Send email if recipient info provided
    if (recipientEmail && recipientName) {
      const { data: pdfUrl } = supabase.storage
        .from('signed-contracts')
        .getPublicUrl(finalPdfFileName);

      await sendSignedContractEmail({
        recipientEmail,
        recipientName,
        contractTitle: contract.title,
        pdfUrl: pdfUrl.publicUrl,
        dateSigned: signatureRecord.date_signed || new Date().toLocaleDateString(),
      });

      console.log("Email sent to:", recipientEmail);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      signatureId: signatureRecord.id,
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

async function addAdminSignatureToPDF(existingPdfBytes: Uint8Array, adminSignatureData: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Update admin signature section
  firstPage.drawText('Admin/Agent Signature:', {
    x: 300,
    y: 180,
    size: 14,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Convert base64 signature to image and embed it
  try {
    if (adminSignatureData && adminSignatureData.startsWith('data:image/png;base64,')) {
      const base64Data = adminSignatureData.split(',')[1];
      const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      // Draw the admin signature image
      firstPage.drawImage(signatureImage, {
        x: 300,
        y: 120,
        width: 200,
        height: 50,
      });
    }
  } catch (error) {
    console.error('Error embedding admin signature image:', error);
    // Fallback to text if image embedding fails
    firstPage.drawText('[Admin Signature Applied]', {
      x: 300,
      y: 140,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0.5, 0),
    });
  }

  // Add admin signature timestamp
  const adminSignedAt = new Date().toLocaleString();
  firstPage.drawText(`Admin signed on: ${adminSignedAt}`, {
    x: 300,
    y: 40,
    size: 10,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

async function generateNewPDFWithBothSignatures(
  contract: any, 
  artistSignatureData: string, 
  adminSignatureData: string, 
  dateSigned: string
): Promise<Uint8Array> {
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
    if (yPosition < 200) break; // Leave space for signatures
    
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

  // Embed artist signature
  try {
    if (artistSignatureData && artistSignatureData.startsWith('data:image/png;base64,')) {
      const base64Data = artistSignatureData.split(',')[1];
      const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      page.drawImage(signatureImage, {
        x: 50,
        y: 120,
        width: 200,
        height: 50,
      });
    }
  } catch (error) {
    console.error('Error embedding artist signature:', error);
  }

  // Add admin signature section
  page.drawText('Admin/Agent Signature:', {
    x: 300,
    y: 180,
    size: 14,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Embed admin signature
  try {
    if (adminSignatureData && adminSignatureData.startsWith('data:image/png;base64,')) {
      const base64Data = adminSignatureData.split(',')[1];
      const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      page.drawImage(signatureImage, {
        x: 300,
        y: 120,
        width: 200,
        height: 50,
      });
    }
  } catch (error) {
    console.error('Error embedding admin signature:', error);
  }

  // Add signing date
  page.drawText(`Date Signed: ${dateSigned}`, {
    x: 50,
    y: 80,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
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
    subject: `Fully Signed Contract: ${contractTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Contract Fully Signed</h1>
        
        <p>Hello ${recipientName},</p>
        
        <p>Your contract has been fully signed by both parties!</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0; color: #333;">${contractTitle}</h2>
          <p style="margin: 10px 0 0 0; color: #666;">Date Signed: ${dateSigned}</p>
          <p style="margin: 5px 0 0 0; color: #666;">Completed on: ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Download Fully Signed Contract (PDF)
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
