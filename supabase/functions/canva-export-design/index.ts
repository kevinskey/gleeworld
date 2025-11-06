import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CanvaExportRequest {
  designId: string;
  format?: 'pdf' | 'png' | 'jpg';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CANVA_API_KEY = Deno.env.get('CANVA_API_KEY');
    
    if (!CANVA_API_KEY) {
      throw new Error('Canva API credentials not configured');
    }

    const { designId, format = 'pdf' }: CanvaExportRequest = await req.json();

    console.log('Exporting Canva design:', { designId, format });

    // Request export from Canva
    const exportResponse = await fetch(`https://api.canva.com/rest/v1/designs/${designId}/export`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CANVA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: format.toUpperCase()
      })
    });

    if (!exportResponse.ok) {
      const errorText = await exportResponse.text();
      console.error('Canva export error:', exportResponse.status, errorText);
      throw new Error(`Failed to export design: ${errorText}`);
    }

    const exportData = await exportResponse.json();
    console.log('Canva export initiated:', exportData);

    // Get the export job ID
    const jobId = exportData.job?.id;
    
    if (!jobId) {
      throw new Error('No job ID returned from Canva export');
    }

    // Poll for export completion (max 30 seconds)
    let attempts = 0;
    const maxAttempts = 30;
    let downloadUrl = null;

    while (attempts < maxAttempts && !downloadUrl) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await fetch(`https://api.canva.com/rest/v1/exports/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${CANVA_API_KEY}`,
        }
      });

      if (!statusResponse.ok) {
        console.error('Failed to check export status');
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      console.log('Export status:', statusData.export?.status);

      if (statusData.export?.status === 'success') {
        downloadUrl = statusData.export?.urls?.download;
        break;
      } else if (statusData.export?.status === 'failed') {
        throw new Error('Canva export failed');
      }

      attempts++;
    }

    if (!downloadUrl) {
      throw new Error('Export timed out. Please try again.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl,
        jobId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in canva-export-design:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to export Canva design' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
