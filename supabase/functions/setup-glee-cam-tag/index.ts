import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    console.log('Setting up Glee Cam tag...');

    // Check if Glee Cam tag exists
    const { data: existingTag } = await supabase
      .from('pr_image_tags')
      .select('*')
      .ilike('name', 'glee cam')
      .maybeSingle();

    let gleeCamTag = existingTag;

    if (!gleeCamTag) {
      // Create Glee Cam tag
      const { data: newTag, error: tagError } = await supabase
        .from('pr_image_tags')
        .insert({
          name: 'Glee Cam',
          color: '#3b82f6' // Blue color
        })
        .select()
        .single();

      if (tagError) throw tagError;
      gleeCamTag = newTag;
      console.log('Created Glee Cam tag:', gleeCamTag);
    } else {
      console.log('Glee Cam tag already exists:', gleeCamTag);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Glee Cam tag is ready',
        tag: gleeCamTag
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Setup error:', error);
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
