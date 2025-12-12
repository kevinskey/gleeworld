import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting batch conversion of W9 forms to JPG');

    // Get all W9 forms that don't have JPG versions yet
    const { data: w9Forms, error: fetchError } = await supabase
      .from('w9_forms')
      .select('id, storage_path, form_data')
      .not('form_data->jpg_generated', 'eq', true)
      .not('storage_path', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch W9 forms: ${fetchError.message}`);
    }

    if (!w9Forms || w9Forms.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No W9 forms found that need JPG conversion',
          converted: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${w9Forms.length} W9 forms to convert`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    // Process each form
    for (const form of w9Forms) {
      try {
        console.log(`Converting form ${form.id}...`);

        // Call the individual conversion function
        const { error: conversionError } = await supabase.functions.invoke('convert-w9-to-jpg', {
          body: {
            pdfStoragePath: form.storage_path,
            w9FormId: form.id
          }
        });

        if (conversionError) {
          console.error(`Failed to convert form ${form.id}:`, conversionError);
          failCount++;
          results.push({
            id: form.id,
            storage_path: form.storage_path,
            success: false,
            error: conversionError.message
          });
        } else {
          console.log(`Successfully converted form ${form.id}`);
          successCount++;
          results.push({
            id: form.id,
            storage_path: form.storage_path,
            success: true
          });
        }

        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing form ${form.id}:`, error);
        failCount++;
        results.push({
          id: form.id,
          storage_path: form.storage_path,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`Batch conversion completed. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch conversion completed`,
        total: w9Forms.length,
        converted: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch-convert-w9-to-jpg function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to perform batch conversion', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});