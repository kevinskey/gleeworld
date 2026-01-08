import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AMAZON_ASSOCIATE_TAG = 'kevinskey-20';
const AMAZON_HOST = 'webservices.amazon.com';
const AMAZON_REGION = 'us-east-1';

// Helper to create SHA256 hash
async function sha256(message: string): Promise<ArrayBuffer> {
  const msgBuffer = new TextEncoder().encode(message);
  return await crypto.subtle.digest('SHA-256', msgBuffer);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// HMAC-SHA256 using Web Crypto API
async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

// AWS Signature Version 4 signing
async function signRequest(
  accessKey: string,
  secretKey: string,
  payload: string
): Promise<{ headers: Record<string, string> }> {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const service = 'ProductAdvertisingAPI';
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/${service}/aws4_request`;
  
  const payloadHash = toHex(await sha256(payload));
  
  const canonicalHeaders = 
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${AMAZON_HOST}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems\n`;
  
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  
  const canonicalRequest = 
    `POST\n` +
    `/paapi5/searchitems\n` +
    `\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${payloadHash}`;
  
  const canonicalRequestHash = toHex(await sha256(canonicalRequest));
  
  const stringToSign = 
    `AWS4-HMAC-SHA256\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    `${canonicalRequestHash}`;
  
  // Create signing key
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, AMAZON_REGION);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  
  const signatureBuffer = await hmacSha256(kSigning, stringToSign);
  const signature = toHex(signatureBuffer);
  
  const authorizationHeader = 
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;
  
  return {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Encoding': 'amz-1.0',
      'Host': AMAZON_HOST,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
      'Authorization': authorizationHeader,
    }
  };
}

// Search Amazon PA-API for products
async function searchAmazonProducts(keywords: string, accessKey: string, secretKey: string) {
  const payload = JSON.stringify({
    Keywords: keywords,
    PartnerTag: AMAZON_ASSOCIATE_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'ItemInfo.Features',
      'Offers.Listings.Price'
    ],
    ItemCount: 5
  });

  const { headers } = await signRequest(accessKey, secretKey, payload);
  
  console.log('Calling Amazon PA-API with keywords:', keywords);
  
  const response = await fetch(`https://${AMAZON_HOST}/paapi5/searchitems`, {
    method: 'POST',
    headers,
    body: payload
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Amazon PA-API error:', response.status, errorText);
    throw new Error(`Amazon API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const AMAZON_ACCESS_KEY = Deno.env.get("AMAZON_PAAPI_ACCESS_KEY");
    const AMAZON_SECRET_KEY = Deno.env.get("AMAZON_PAAPI_SECRET_KEY");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, category, title, description, searchUrl, imageUrl } = body;

    if (action === 'suggest') {
      // Try Amazon PA-API first, fall back to AI suggestions
      if (AMAZON_ACCESS_KEY && AMAZON_SECRET_KEY) {
        try {
          const searchTerms = category || 'choir music supplies';
          console.log('Searching Amazon PA-API for:', searchTerms);
          
          const amazonData = await searchAmazonProducts(searchTerms, AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY);
          
          if (amazonData.SearchResult?.Items) {
            const products = amazonData.SearchResult.Items.map((item: any) => ({
              title: item.ItemInfo?.Title?.DisplayValue || 'Amazon Product',
              description: item.ItemInfo?.Features?.DisplayValues?.[0] || 'Great product for music lovers',
              searchUrl: item.DetailPageURL,
              imageUrl: item.Images?.Primary?.Large?.URL || null,
              price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || null,
              asin: item.ASIN
            }));
            
            console.log('Found', products.length, 'products from Amazon');
            
            return new Response(JSON.stringify({ 
              success: true, 
              suggestions: products,
              source: 'amazon-paapi'
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (amazonError) {
          console.error('Amazon PA-API failed, falling back to AI:', amazonError);
        }
      }

      // Fallback to AI suggestions
      if (!LOVABLE_API_KEY) {
        throw new Error("No API keys configured for product suggestions");
      }

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
      
      let suggestions;
      try {
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
        suggestions: suggestions.products,
        source: 'ai-generated'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === 'add') {
      // Add a suggested product to advertising_hero
      let affiliateUrl = searchUrl;
      if (searchUrl && searchUrl.includes('amazon.com')) {
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

      // Use provided image or fallback based on title keywords
      const defaultImages: Record<string, string> = {
        voice: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400',
        music: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400',
        sheet: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400',
        choir: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
        performance: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
        theory: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
        book: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
        hbcu: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
        accessory: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
        default: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'
      };
      
      let selectedImage = imageUrl;
      if (!selectedImage) {
        const lowerTitle = (title || '').toLowerCase();
        selectedImage = Object.entries(defaultImages).find(([key]) => 
          lowerTitle.includes(key)
        )?.[1] || defaultImages.default;
      }

      const { data, error } = await supabase
        .from('advertising_hero')
        .insert({
          title,
          description,
          image_url: selectedImage,
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
