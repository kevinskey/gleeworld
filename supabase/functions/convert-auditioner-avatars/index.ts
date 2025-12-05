import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    // Get auditioners from both tables
    const { data: auditionApplications, error: appsError } = await supabase
      .from('audition_applications')
      .select('user_id, full_name, email, profile_image_url')
      .not('profile_image_url', 'is', null);

    const { data: gwAuditions, error: gwError } = await supabase
      .from('gw_auditions')
      .select('user_id, first_name, last_name, email, selfie_url')
      .not('selfie_url', 'is', null);

    if (appsError) {
      console.error('Error fetching audition applications:', appsError);
    }
    if (gwError) {
      console.error('Error fetching gw_auditions:', gwError);
    }

    // Combine and format the data
    const allAuditioners = [];
    
    if (auditionApplications) {
      auditionApplications.forEach(app => {
        allAuditioners.push({
          user_id: app.user_id,
          full_name: app.full_name,
          email: app.email,
          source_image_url: app.profile_image_url,
          suggested_avatar_filename: `${app.user_id}/avatar-${Date.now()}.jpg`,
          target_avatar_url: `https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/avatars/${app.user_id}/avatar-${Date.now()}.jpg`
        });
      });
    }

    if (gwAuditions) {
      gwAuditions.forEach(audition => {
        allAuditioners.push({
          user_id: audition.user_id,
          full_name: `${audition.first_name || ''} ${audition.last_name || ''}`.trim(),
          email: audition.email,
          source_image_url: audition.selfie_url,
          suggested_avatar_filename: `${audition.user_id}/avatar-${Date.now()}.jpg`,
          target_avatar_url: `https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/avatars/${audition.user_id}/avatar-${Date.now()}.jpg`
        });
      });
    }

    if (!allAuditioners || allAuditioners.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No auditioners need avatar conversion',
          total_processed: 0,
          successful: 0,
          failed: 0,
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found ${allAuditioners.length} auditioners to convert`);

    const results: ConversionResult[] = [];

    for (const auditioner of allAuditioners) {
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