
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Use provided date or current date as fallback
    const signedDate = dateSigned || new Date().toLocaleDateString();
    const signedDateTime = new Date().toISOString();

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

    // Create or update signature record
    const { data: signatureRecord, error: signatureError } = await supabase
      .from('contract_signatures_v2')
      .upsert({
        contract_id: contractId,
        artist_signature_data: signatureData,
        artist_signed_at: signedDateTime,
        date_signed: signedDate,
        signer_ip: clientIP,
        pdf_storage_path: pdfFileName,
        status: 'pending_admin_signature'
      }, {
        onConflict: 'contract_id'
      })
      .select()
      .single();

    if (signatureError) {
      throw new Error('Failed to store signature: ' + signatureError.message);
    }

    // Update contract status
    await supabase
      .from('contracts_v2')
      .update({ 
        status: 'pending_admin_signature',
        updated_at: signedDateTime
      })
      .eq('id', contractId);

    console.log("Artist signature processed successfully:", signatureRecord.id);

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
