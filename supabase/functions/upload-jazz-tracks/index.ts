import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  files: {
    name: string;
    data: string; // base64
    title: string;
    size: number;
  }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { files }: UploadRequest = await req.json();

    // Process uploads in background
    const uploadPromises = files.map(async (fileData) => {
      try {
        // Convert base64 to blob
        const base64Data = fileData.data.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Generate unique filename
        const fileExt = fileData.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `jazz/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabaseClient.storage
          .from('mus240-audio')
          .upload(filePath, binaryData, {
            contentType: `audio/${fileExt}`,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Insert into database
        const { error: dbError } = await supabaseClient
          .from('mus240_audio_resources')
          .insert({
            title: fileData.title,
            description: null,
            file_path: filePath,
            file_size: fileData.size,
            category: 'jazz',
            duration: null,
            uploaded_by: user.id,
          });

        if (dbError) throw dbError;

        return { success: true, title: fileData.title };
      } catch (error) {
        console.error('Upload error:', error);
        return { success: false, title: fileData.title, error: error.message };
      }
    });

    // Start background processing
    EdgeRuntime.waitUntil(Promise.all(uploadPromises));

    // Return immediately
    return new Response(
      JSON.stringify({
        message: 'Upload started',
        count: files.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202, // Accepted
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
