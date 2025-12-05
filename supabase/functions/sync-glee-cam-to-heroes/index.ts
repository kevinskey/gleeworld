import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting Glee Cam to Heroes sync...');

    // Fetch all PR images with their tags
    const { data: prImages, error: imagesError } = await supabase
      .from('pr_images')
      .select(`
        id,
        filename,
        file_path,
        caption,
        uploaded_at,
        is_featured,
        pr_image_tag_associations(
          pr_image_tags(name)
        )
      `)
      .order('uploaded_at', { ascending: false });

    if (imagesError) throw imagesError;

    console.log(`Found ${prImages?.length || 0} PR images`);

    // Filter images tagged with "Glee Cam" (case insensitive)
    const gleeCamImages = prImages?.filter(image => {
      const associations = image.pr_image_tag_associations as any[];
      return associations?.some(association => 
        association.pr_image_tags?.name?.toLowerCase() === 'glee cam'
      );
    }) || [];

    console.log(`Found ${gleeCamImages.length} Glee Cam images`);

    // Get the public URL for each image
    const heroSlides = await Promise.all(gleeCamImages.map(async (image, index) => {
      const { data: urlData } = supabase.storage
        .from('pr-images')
        .getPublicUrl(image.file_path);

      return {
        usage_context: 'homepage',
        title: image.caption || 'Glee Cam',
        description: '',
        image_url: urlData.publicUrl,
        mobile_image_url: urlData.publicUrl,
        ipad_image_url: urlData.publicUrl,
        cta_text: '',
        cta_link: '',
        display_order: index,
        is_active: true,
        source: 'glee_cam',
        source_id: image.id,
      };
    }));

    // Delete existing Glee Cam hero slides
    const { error: deleteError } = await supabase
      .from('gw_hero_slides')
      .delete()
      .eq('source', 'glee_cam');

    if (deleteError) {
      console.error('Error deleting old slides:', deleteError);
    } else {
      console.log('Deleted old Glee Cam hero slides');
    }

    // Insert new hero slides
    if (heroSlides.length > 0) {
      const { data: insertedSlides, error: insertError } = await supabase
        .from('gw_hero_slides')
        .insert(heroSlides)
        .select();

      if (insertError) throw insertError;

      console.log(`Created ${insertedSlides?.length || 0} new hero slides`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Synced ${gleeCamImages.length} Glee Cam images to hero slides`,
        slides_created: heroSlides.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
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
