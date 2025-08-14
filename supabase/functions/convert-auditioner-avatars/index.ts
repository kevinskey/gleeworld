import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversionResult {
  user_id: string;
  full_name: string;
  email: string;
  success: boolean;
  error?: string;
  source_url?: string;
  target_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting auditioner avatar conversion process...');

    // Get list of auditioners that need conversion
    const { data: auditioners, error: fetchError } = await supabase
      .rpc('get_auditioner_images_for_conversion');

    if (fetchError) {
      console.error('Error fetching auditioners:', fetchError);
      throw fetchError;
    }

    if (!auditioners || auditioners.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No auditioners need avatar conversion',
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found ${auditioners.length} auditioners to convert`);

    const results: ConversionResult[] = [];

    for (const auditioner of auditioners) {
      try {
        console.log(`Processing ${auditioner.full_name} (${auditioner.email})`);
        
        // Extract the file path from the source URL
        // URL format: https://domain/storage/v1/object/sign/user-files/user-id/audition/filename?token=...
        const urlParts = auditioner.source_image_url.split('/');
        const userFilesIndex = urlParts.indexOf('user-files');
        
        if (userFilesIndex === -1) {
          throw new Error('Invalid source URL format');
        }

        // Get the path after 'user-files/'
        const pathParts = urlParts.slice(userFilesIndex + 1);
        const sourcePath = pathParts.join('/').split('?')[0]; // Remove query params
        
        console.log(`Source path: ${sourcePath}`);

        // Download the image from user-files bucket
        const { data: imageData, error: downloadError } = await supabase.storage
          .from('user-files')
          .download(sourcePath);

        if (downloadError) {
          console.error(`Download error for ${auditioner.full_name}:`, downloadError);
          throw downloadError;
        }

        if (!imageData) {
          throw new Error('No image data received');
        }

        console.log(`Downloaded image for ${auditioner.full_name}, size: ${imageData.size} bytes`);

        // Upload to avatars bucket
        const avatarFilename = auditioner.suggested_avatar_filename;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(avatarFilename, imageData, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/jpeg'
          });

        if (uploadError) {
          console.error(`Upload error for ${auditioner.full_name}:`, uploadError);
          throw uploadError;
        }

        console.log(`Successfully uploaded avatar for ${auditioner.full_name}`);

        results.push({
          user_id: auditioner.user_id,
          full_name: auditioner.full_name,
          email: auditioner.email,
          success: true,
          source_url: auditioner.source_image_url,
          target_url: auditioner.target_avatar_url
        });

      } catch (error) {
        console.error(`Error processing ${auditioner.full_name}:`, error);
        results.push({
          user_id: auditioner.user_id,
          full_name: auditioner.full_name,
          email: auditioner.email,
          success: false,
          error: error.message
        });
      }
    }

    // Now update the database with avatar URLs for successful conversions
    const successfulConversions = results.filter(r => r.success);
    if (successfulConversions.length > 0) {
      console.log(`Updating database for ${successfulConversions.length} successful conversions`);
      
      const { data: updateResult, error: updateError } = await supabase
        .rpc('convert_auditioner_images_to_avatars');

      if (updateError) {
        console.error('Error updating database:', updateError);
        // Don't throw here, we still want to return the conversion results
      } else {
        console.log(`Database updated: ${updateResult} profiles updated`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Conversion completed: ${successCount} successful, ${failCount} failed`,
        total_processed: results.length,
        successful: successCount,
        failed: failCount,
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});