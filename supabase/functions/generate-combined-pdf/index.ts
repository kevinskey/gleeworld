
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CombinedPDFRequest {
  contractContent: string;
  contractTitle: string;
  w9FormData: any;
  embeddedSignatures: any[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      contractContent,
      contractTitle,
      w9FormData,
      embeddedSignatures
    }: CombinedPDFRequest = await req.json();

    console.log("Generating combined PDF for:", contractTitle);

    // Generate HTML content combining contract and W9
    const combinedHTML = generateCombinedHTML(
      contractContent, 
      contractTitle, 
      w9FormData, 
      embeddedSignatures
    );

    // For now, return the HTML content as a downloadable file
    // In a real implementation, you would use a PDF generation library
    const blob = new Blob([combinedHTML], { type: 'text/html' });
    const fileName = `${contractTitle.replace(/[^a-zA-Z0-9]/g, '_')}_with_W9.html`;

    // Create a data URL for download
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:text/html;base64,${base64}`;

    return new Response(JSON.stringify({ 
      success: true, 
      downloadUrl: dataUrl,
      fileName 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error generating combined PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateCombinedHTML(
  contractContent: string, 
  contractTitle: string, 
  w9FormData: any, 
  embeddedSignatures: any[]
): string {
  const signatureHTML = embeddedSignatures.map(sig => `
    <div style="margin: 20px 0; padding: 15px; border: 2px solid #ccc; border-radius: 8px;">
      <h4>${sig.signerType === 'admin' ? 'Admin Signature' : 'Artist Signature'}</h4>
      ${sig.signatureData && sig.signatureData.startsWith('data:image') 
        ? `<img src="${sig.signatureData}" alt="Signature" style="max-width: 200px; height: 60px; border: 1px solid #ccc;"/>`
        : `<div style="font-family: cursive; font-size: 24px; padding: 10px; border: 1px solid #ccc; background: white;">${sig.signatureData || 'Digital Signature'}</div>`
      }
      <p style="font-size: 12px; color: #666;">Signed on: ${sig.dateSigned} | ${new Date(sig.timestamp).toLocaleString()}</p>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${contractTitle} - Contract & W9</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 40px; page-break-inside: avoid; }
        .w9-section { border-top: 3px solid #000; padding-top: 20px; }
        .signature-section { border: 1px solid #ccc; padding: 15px; margin: 20px 0; }
        @media print { .page-break { page-break-before: always; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${contractTitle}</h1>
        <p>Contract with W9 Tax Information</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="section">
        <h2>CONTRACT</h2>
        <div style="white-space: pre-wrap;">${contractContent.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '')}</div>
        
        ${signatureHTML ? `
          <div class="signature-section">
            <h3>Signatures</h3>
            ${signatureHTML}
          </div>
        ` : ''}
      </div>
      
      <div class="page-break"></div>
      
      <div class="section w9-section">
        <h2>FORM W-9: REQUEST FOR TAXPAYER IDENTIFICATION NUMBER</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 5px; border: 1px solid #ccc;"><strong>Name:</strong></td><td style="padding: 5px; border: 1px solid #ccc;">${w9FormData.name || 'N/A'}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #ccc;"><strong>Business Name:</strong></td><td style="padding: 5px; border: 1px solid #ccc;">${w9FormData.businessName || 'N/A'}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #ccc;"><strong>Federal Tax Classification:</strong></td><td style="padding: 5px; border: 1px solid #ccc;">${w9FormData.federalTaxClassification || 'N/A'}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #ccc;"><strong>Address:</strong></td><td style="padding: 5px; border: 1px solid #ccc;">${w9FormData.address || 'N/A'}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #ccc;"><strong>City, State, ZIP:</strong></td><td style="padding: 5px; border: 1px solid #ccc;">${w9FormData.city || ''}, ${w9FormData.state || ''} ${w9FormData.zipCode || ''}</td></tr>
          <tr><td style="padding: 5px; border: 1px solid #ccc;"><strong>Taxpayer ID:</strong></td><td style="padding: 5px; border: 1px solid #ccc;">${w9FormData.taxpayerIdNumber || 'N/A'}</td></tr>
        </table>
        
        <div style="margin-top: 30px;">
          <p><strong>Certification:</strong> ${w9FormData.certificationSigned ? 'SIGNED AND CERTIFIED' : 'NOT CERTIFIED'}</p>
          <p style="font-size: 12px; color: #666;">Submitted on: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
