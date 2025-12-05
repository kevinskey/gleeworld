
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ArtistSignRequest {
  contractId: string;
  signatureData: string;
  dateSigned?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId, signatureData, dateSigned }: ArtistSignRequest = await req.json();

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

    // Get client IP and parse it properly
    const rawIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log("Raw IP from headers:", rawIP);
    
    // Parse and clean the IP address more robustly
    let clientIP: string | null = null;
    if (rawIP && rawIP !== 'unknown') {
      // Split by comma and take the first IP, then clean it
      const firstIP = rawIP.split(',')[0].trim();
      // Validate if it looks like a valid IP (basic check)
      if (firstIP && (firstIP.match(/^\d+\.\d+\.\d+\.\d+$/) || firstIP.includes(':'))) {
        clientIP = firstIP;
      }
    }
    console.log("Parsed client IP:", clientIP);

    // Use provided date or current date as fallback
    const signedDate = dateSigned || new Date().toLocaleDateString();
    const signedDateTime = new Date().toISOString();

    // Create artist signature in embedded format
    const artistSignature = {
      fieldId: 1,
      signatureData: signatureData,
      dateSigned: signedDate,
      timestamp: signedDateTime,
      ipAddress: clientIP || 'unknown',
      signerType: 'artist',
      signerName: 'Artist'
    };

    // Update contract content with embedded artist signature
    let updatedContent = contract.content;
    // Remove any existing embedded signatures section
    updatedContent = updatedContent.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/s, '');
    
    // Add the artist signature as embedded signature
    const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${JSON.stringify([artistSignature])}[/EMBEDDED_SIGNATURES]`;
    updatedContent += signaturesSection;

    // Generate interim PDF with artist signature
    const pdfBytes = await generateInterimPDF(contract, signatureData, signedDate);
    
    // Upload interim PDF to storage
    const pdfFileName = `contract_${contractId}_artist_signed_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('signed-contracts')
      .upload(pdfFileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('PDF upload error:', uploadError);
      throw new Error('Failed to store interim PDF: ' + uploadError.message);
    }

    // Check if signature record already exists
    const { data: existingSignature } = await supabase
      .from('contract_signatures_v2')
      .select('*')
      .eq('contract_id', contractId)
      .maybeSingle();

    let signatureRecord;

    if (existingSignature) {
      // Update existing signature record
      const { data: updatedRecord, error: updateError } = await supabase
        .from('contract_signatures_v2')
        .update({
          artist_signature_data: signatureData,
          artist_signed_at: signedDateTime,
          date_signed: signedDate,
          signer_ip: clientIP,
          pdf_storage_path: pdfFileName,
          status: 'pending_admin_signature',
          embedded_signatures: JSON.stringify([artistSignature])
        })
        .eq('id', existingSignature.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update signature error:', updateError);
        throw new Error('Failed to update signature: ' + updateError.message);
      }
      signatureRecord = updatedRecord;
    } else {
      // Create new signature record
      const { data: newRecord, error: insertError } = await supabase
        .from('contract_signatures_v2')
        .insert({
          contract_id: contractId,
          artist_signature_data: signatureData,
          artist_signed_at: signedDateTime,
          date_signed: signedDate,
          signer_ip: clientIP,
          pdf_storage_path: pdfFileName,
          status: 'pending_admin_signature',
          embedded_signatures: JSON.stringify([artistSignature])
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert signature error:', insertError);
        throw new Error('Failed to store signature: ' + insertError.message);
      }
      signatureRecord = newRecord;
    }

    console.log("Signature record handled successfully:", signatureRecord.id);

    // Update contract status and content with embedded signature
    await supabase
      .from('contracts_v2')
      .update({ 
        content: updatedContent,
        status: 'pending_admin_signature',
        updated_at: signedDateTime
      })
      .eq('id', contractId);

    console.log("Artist signature processed successfully with embedded format:", signatureRecord.id);

    return new Response(JSON.stringify({ 
      success: true, 
      signatureId: signatureRecord.id,
      pdfPath: pdfFileName,
      dateSigned: signedDate,
      status: 'pending_admin_signature'
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

async function generateInterimPDF(contract: any, artistSignatureData: string, dateSigned: string): Promise<Uint8Array> {
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

  // Convert base64 signature to image and embed it
  try {
    if (artistSignatureData && artistSignatureData.startsWith('data:image/png;base64,')) {
      const base64Data = artistSignatureData.split(',')[1];
      const signatureImageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      
      // Draw the signature image
      page.drawImage(signatureImage, {
        x: 50,
        y: 120,
        width: 200,
        height: 50,
      });
    }
  } catch (error) {
    console.error('Error embedding artist signature image:', error);
    // Fallback to text if image embedding fails
    page.drawText('[Artist Signature Applied]', {
      x: 50,
      y: 140,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0.5, 0),
    });
  }

  // Add signing date
  page.drawText(`Date Signed: ${dateSigned}`, {
    x: 50,
    y: 80,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Add admin signature placeholder
  page.drawText('Admin/Agent Signature: [Pending]', {
    x: 300,
    y: 180,
    size: 14,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Add signature timestamp for audit trail
  const signedAt = new Date().toLocaleString();
  page.drawText(`Artist signed on: ${signedAt}`, {
    x: 50,
    y: 40,
    size: 10,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

serve(handler);
