import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productType, productName, category, productId } = await req.json();
    
    console.log(`Generating mockup for ${productName} (${productType})`);

    // Product-specific mockup prompts with realistic logo placement
    const mockupPrompts = {
      't-shirt': `Professional product mockup of a ${productName.toLowerCase()} on a clean white background. The Spelman College Glee Club logo should be centered on the chest area, approximately 4-5 inches wide, printed in a complementary color. The shirt should be laid flat or on a model, commercial photography style, high quality, realistic proportions. The logo should look professionally screen printed, not oversized.`,
      
      'hoodie': `Professional product mockup of a ${productName.toLowerCase()} on a clean white background. The Spelman College Glee Club logo should be placed on the left chest area, approximately 3-4 inches wide, embroidered style. The hoodie should look premium quality, commercial photography style, realistic proportions. Show the hoodie in a natural position.`,
      
      'sweatshirt': `Professional product mockup of a ${productName.toLowerCase()} on a clean white background. The Spelman College Glee Club logo should be centered on the chest, approximately 4-5 inches wide, printed style. Commercial photography, premium quality appearance, realistic proportions.`,
      
      'polo': `Professional product mockup of a ${productName.toLowerCase()} polo shirt on a clean white background. The Spelman College Glee Club logo should be small and placed on the left chest area, approximately 2-3 inches wide, embroidered style. Premium quality, commercial photography, professional appearance.`,
      
      'jacket': `Professional product mockup of a ${productName.toLowerCase()} on a clean white background. The Spelman College Glee Club logo should be placed on the left chest or back, appropriately sized for the jacket style. Premium quality, commercial photography, realistic proportions.`,
      
      'hat': `Professional product mockup of a ${productName.toLowerCase()} cap/hat on a clean white background. The Spelman College Glee Club logo should be embroidered on the front panel, properly sized for the cap dimensions. Premium quality, commercial photography, realistic proportions, front-facing view.`,
      
      'beanie': `Professional product mockup of a ${productName.toLowerCase()} beanie on a clean white background. The Spelman College Glee Club logo should be embroidered or as a woven patch, appropriately sized. Premium quality, commercial photography, realistic proportions.`,
      
      'mug': `Professional product mockup of a ${productName.toLowerCase()} coffee mug on a clean white background. The Spelman College Glee Club logo should be printed on the front center of the mug, properly proportioned for the mug surface. Commercial photography, premium quality ceramic, realistic proportions.`,
      
      'water-bottle': `Professional product mockup of a ${productName.toLowerCase()} water bottle on a clean white background. The Spelman College Glee Club logo should be printed on the main body, respecting the bottle's curvature. Premium quality, commercial photography, realistic proportions.`,
      
      'tumbler': `Professional product mockup of a ${productName.toLowerCase()} tumbler on a clean white background. The Spelman College Glee Club logo should be centered on the cylindrical surface, properly sized. Premium quality, commercial photography, realistic proportions.`,
      
      'tote-bag': `Professional product mockup of a ${productName.toLowerCase()} tote bag on a clean white background. The Spelman College Glee Club logo should be centered on the front of the bag, appropriately sized for bag dimensions. Commercial photography, premium quality canvas/fabric, realistic proportions.`,
      
      'lanyard': `Professional product mockup of a ${productName.toLowerCase()} lanyard on a clean white background. The Spelman College Glee Club logo should be printed or woven into the lanyard design, appropriately sized. Commercial photography, premium quality, realistic proportions.`,
      
      'pin': `Professional product mockup of a ${productName.toLowerCase()} enamel pin on a clean white background. The design should be a miniaturized version of the Spelman College Glee Club logo, suitable for pin format. Commercial photography, premium quality enamel, realistic proportions.`,
      
      'sheet-music': `Professional product mockup of ${productName.toLowerCase()} sheet music cover design. The Spelman College Glee Club logo should be integrated into the cover layout professionally. Clean, academic design with musical notation background elements, premium quality appearance.`,
      
      'course': `Professional product mockup of a ${productName.toLowerCase()} course thumbnail/cover. The Spelman College Glee Club logo should be integrated into the design layout. Educational, premium quality appearance, professional academic styling.`,
      
      'recording': `Professional product mockup of a ${productName.toLowerCase()} album/recording cover. The Spelman College Glee Club logo should be part of the artistic design. Premium quality, professional music industry styling, elegant layout.`
    };

    // Determine the appropriate prompt based on product type
    let prompt = mockupPrompts['t-shirt']; // default
    
    // Map product names to types
    const productLower = productName.toLowerCase();
    if (productLower.includes('t-shirt') || productLower.includes('tee')) {
      prompt = mockupPrompts['t-shirt'];
    } else if (productLower.includes('hoodie')) {
      prompt = mockupPrompts['hoodie'];
    } else if (productLower.includes('sweatshirt')) {
      prompt = mockupPrompts['sweatshirt'];
    } else if (productLower.includes('polo')) {
      prompt = mockupPrompts['polo'];
    } else if (productLower.includes('jacket')) {
      prompt = mockupPrompts['jacket'];
    } else if (productLower.includes('hat') || productLower.includes('cap')) {
      prompt = mockupPrompts['hat'];
    } else if (productLower.includes('beanie')) {
      prompt = mockupPrompts['beanie'];
    } else if (productLower.includes('mug')) {
      prompt = mockupPrompts['mug'];
    } else if (productLower.includes('bottle')) {
      prompt = mockupPrompts['water-bottle'];
    } else if (productLower.includes('tumbler')) {
      prompt = mockupPrompts['tumbler'];
    } else if (productLower.includes('tote') || productLower.includes('bag')) {
      prompt = mockupPrompts['tote-bag'];
    } else if (productLower.includes('lanyard')) {
      prompt = mockupPrompts['lanyard'];
    } else if (productLower.includes('pin')) {
      prompt = mockupPrompts['pin'];
    } else if (productLower.includes('sheet') || productLower.includes('music')) {
      prompt = mockupPrompts['sheet-music'];
    } else if (productLower.includes('course') || productLower.includes('lesson')) {
      prompt = mockupPrompts['course'];
    } else if (productLower.includes('recording') || productLower.includes('performance')) {
      prompt = mockupPrompts['recording'];
    }

    console.log(`Using prompt for ${productName}: ${prompt.substring(0, 100)}...`);

    // Generate image with OpenAI
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        size: '1024x1024',
        quality: 'high',
        output_format: 'webp',
        n: 1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageBase64 = data.data[0].b64_json;
    
    // Convert base64 to blob
    const imageData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Upload to storage
    const fileName = `${productId}-mockup.webp`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, imageData, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;
    console.log(`Generated mockup for ${productName}: ${imageUrl}`);

    // Update product with new image URL
    const { error: updateError } = await supabase
      .from('gw_products')
      .update({ 
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl,
      productName,
      message: `Generated mockup for ${productName}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-product-mockup function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});