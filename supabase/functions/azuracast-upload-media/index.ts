import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadRequest {
  fileUrl: string;
  fileName: string;
  title?: string;
  artist?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AzuraCast Upload: Request received');

    const azuracastApiKey = Deno.env.get('AZURACAST_API_KEY');
    if (!azuracastApiKey) {
      return new Response(
        JSON.stringify({ error: 'AzuraCast API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin permissions
    const { data: profile } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin permissions required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileUrl, fileName, title, artist }: UploadRequest = await req.json();
    console.log('AzuraCast Upload: Downloading file from:', fileUrl);

    // Download file from Supabase storage URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to download file from storage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileBlob = await fileResponse.blob();
    console.log('AzuraCast Upload: File downloaded, size:', fileBlob.size);

    // Create multipart form data for AzuraCast
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);

    // Upload to AzuraCast
    const uploadUrl = 'https://radio.gleeworld.org/api/station/glee_world_radio/files';
    console.log('AzuraCast Upload: Uploading to:', uploadUrl);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': azuracastApiKey,
        'Accept': 'application/json',
      },
      body: formData,
    });

    console.log('AzuraCast Upload: Response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('AzuraCast Upload: Error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload to AzuraCast', details: errorText }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log('AzuraCast Upload: Success, media ID:', uploadResult.id);

    // Update metadata if provided
    if ((title || artist) && uploadResult.id) {
      const metadataUrl = `https://radio.gleeworld.org/api/station/glee_world_radio/file/${uploadResult.id}`;
      await fetch(metadataUrl, {
        method: 'PUT',
        headers: {
          'X-API-Key': azuracastApiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, artist }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, mediaId: uploadResult.id, ...uploadResult }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AzuraCast Upload: Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
