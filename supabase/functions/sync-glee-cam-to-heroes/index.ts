import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    // Fetch approved Glee Cam pics from quick_capture_media
    const { data: gleeCamPics, error: picsError } = await supabase
      .from('quick_capture_media')
      .select('*')
      .eq('category', 'glee_cam_pic')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (picsError) throw picsError;

    console.log(`Found ${gleeCamPics?.length || 0} approved Glee Cam pics`);

    // Create hero slides from Glee Cam pics
    let slidesCreated = 0;
    
    for (const pic of gleeCamPics || []) {
      // Check if this image already exists in hero slides
      const { data: existing } = await supabase
        .from('dashboard_hero_slides')
        .select('id')
        .eq('image_url', pic.file_url)
        .limit(1);
      
      if (!existing || existing.length === 0) {
        const slide = {
          title: pic.title || 'Glee Cam',
          description: pic.description || 'GW Cam!',
          image_url: pic.file_url,
          mobile_image_url: pic.file_url,
          ipad_image_url: pic.file_url,
          display_order: 100 + slidesCreated, // High display order to not interfere with manual slides
          is_active: true,
        };

        const { error: insertError } = await supabase
          .from('dashboard_hero_slides')
          .insert(slide);
        
        if (insertError) {
          console.error('Error inserting slide:', insertError);
        } else {
          slidesCreated++;
          console.log(`Created slide for: ${pic.title}`);
        }
      } else {
        console.log(`Slide already exists for: ${pic.title}`);
      }
    }

    // Also sync from PR images tagged with "Glee Cam" for backwards compatibility
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

    if (!imagesError && prImages) {
      // Filter images tagged with "Glee Cam" (case insensitive)
      const gleeCamImages = prImages.filter(image => {
        const associations = image.pr_image_tag_associations as any[];
        return associations?.some(association => 
          association.pr_image_tags?.name?.toLowerCase() === 'glee cam'
        );
      });

      console.log(`Found ${gleeCamImages.length} PR images tagged Glee Cam`);

      for (const image of gleeCamImages) {
        const { data: urlData } = supabase.storage
          .from('pr-images')
          .getPublicUrl(image.file_path);

        // Check if this image already exists in hero slides
        const { data: existing } = await supabase
          .from('dashboard_hero_slides')
          .select('id')
          .eq('image_url', urlData.publicUrl)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          const slide = {
            title: image.caption || 'Glee Cam',
            description: 'GW Cam!',
            image_url: urlData.publicUrl,
            mobile_image_url: urlData.publicUrl,
            ipad_image_url: urlData.publicUrl,
            display_order: 100 + slidesCreated,
            is_active: true,
          };

          const { error: insertError } = await supabase
            .from('dashboard_hero_slides')
            .insert(slide);
          
          if (insertError) {
            console.error('Error inserting PR slide:', insertError);
          } else {
            slidesCreated++;
          }
        }
      }
    }

    console.log(`Created ${slidesCreated} new hero slides total`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Synced Glee Cam images, created ${slidesCreated} new slides`,
        quick_capture_pics: gleeCamPics?.length || 0,
        slides_created: slidesCreated
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
