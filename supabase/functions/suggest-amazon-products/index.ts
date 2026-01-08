import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AMAZON_ASSOCIATE_TAG = 'kevinskey-20';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, category, title, description, searchUrl, imageUrl } = body;

    if (action === 'suggest') {
      // Generate AI suggestions for Amazon products
      const prompt = `You are helping the Spelman College Glee Club find relevant Amazon products for their members and fans. 
      
Category focus: ${category || 'General music and choir supplies'}

Suggest 5 Amazon products that would be useful for:
- Choir/Glee Club members
- Music students
- HBCU supporters
- Singers and performers

For each product, provide:
1. A specific product name (be specific with brand if possible)
2. A brief description (1-2 sentences)
3. An Amazon search URL

Return ONLY valid JSON in this exact format:
{
  "products": [
    {
      "title": "Product Name",
      "description": "Brief description",
      "searchUrl": "https://www.amazon.com/s?k=encoded+search+terms"
    }
  ]
}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a helpful product recommendation assistant. Always respond with valid JSON only." },
            { role: "user", content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required for AI features." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      let suggestions;
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        return new Response(JSON.stringify({ 
          error: "Failed to parse AI suggestions",
          raw: content 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        suggestions: suggestions.products 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === 'add') {
      // Add a suggested product to advertising_hero
      // Add affiliate tag to URL
      let affiliateUrl = searchUrl;
      if (searchUrl.includes('amazon.com')) {
        try {
          const url = new URL(searchUrl);
          url.searchParams.set('tag', AMAZON_ASSOCIATE_TAG);
          affiliateUrl = url.toString();
        } catch {
          affiliateUrl = `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}tag=${AMAZON_ASSOCIATE_TAG}`;
        }
      }

      // Get the max display order
      const { data: maxOrder } = await supabase
        .from('advertising_hero')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      
      const nextOrder = (maxOrder?.[0]?.display_order || 0) + 1;

      const { data, error } = await supabase
        .from('advertising_hero')
        .insert({
          title,
          description,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
          link_url: affiliateUrl,
          link_target: '_blank',
          is_active: true,
          amazon_affiliate_tag: AMAZON_ASSOCIATE_TAG,
          display_order: nextOrder
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        product: data 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error in suggest-amazon-products:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
