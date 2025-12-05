import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'course-materials';
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate job ID
    const jobId = crypto.randomUUID();
    
    // Create job record in database
    const { error: jobError } = await supabaseClient
      .from('upload_jobs')
      .insert({
        job_id: jobId,
        status: 'processing',
        file_name: fileName || file.name,
        bucket: bucket,
        file_size: file.size
      });

    if (jobError) {
      console.error('Failed to create job record:', jobError);
      throw new Error('Failed to create upload job');
    }

    console.log(`Created upload job ${jobId} for file: ${fileName || file.name}, size: ${file.size} bytes`);

    // Start background upload task
    const uploadTask = async () => {
      try {
        console.log(`Starting background upload for job ${jobId}`);
        
        // Generate unique file path
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const safeFileName = (fileName || file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${timestamp}-${randomSuffix}-${safeFileName}`;

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);

        console.log(`Uploading to bucket: ${bucket}, path: ${filePath}`);

        // Upload to Supabase Storage
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .upload(filePath, fileBuffer, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error(`Upload failed for job ${jobId}:`, error);
          await supabaseClient
            .from('upload_jobs')
            .update({
              status: 'failed',
              error: error.message
            })
            .eq('job_id', jobId);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from(bucket)
          .getPublicUrl(filePath);

        console.log(`Upload completed for job ${jobId}, URL: ${publicUrl}`);

        // Update job status
        await supabaseClient
          .from('upload_jobs')
          .update({
            status: 'completed',
            url: publicUrl
          })
          .eq('job_id', jobId);

      } catch (error) {
        console.error(`Background upload error for job ${jobId}:`, error);
        await supabaseClient
          .from('upload_jobs')
          .update({
            status: 'failed',
            error: error.message
          })
          .eq('job_id', jobId);
      }
    };

    // Use EdgeRuntime.waitUntil to handle background task
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(uploadTask());
    } else {
      // Fallback: run upload without waiting
      uploadTask().catch(console.error);
    }

    // Return job ID immediately
    return new Response(
      JSON.stringify({
        jobId,
        status: 'processing',
        message: 'Upload started in background'
      }),
      { 
        status: 202, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in upload-large-file function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
