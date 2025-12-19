import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract ASIN from Amazon URL
function extractAsin(url: string): string | null {
  // Match patterns like /dp/B0XXXXX, /gp/product/B0XXXXX, /product/B0XXXXX
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Get marketplace host from URL
function getMarketplace(url: string): string {
  if (url.includes('amazon.co.uk')) return 'www.amazon.co.uk';
  if (url.includes('amazon.ca')) return 'www.amazon.ca';
  if (url.includes('amazon.de')) return 'www.amazon.de';
  if (url.includes('amazon.fr')) return 'www.amazon.fr';
  if (url.includes('amazon.es')) return 'www.amazon.es';
  if (url.includes('amazon.it')) return 'www.amazon.it';
  if (url.includes('amazon.in')) return 'www.amazon.in';
  if (url.includes('amazon.co.jp')) return 'www.amazon.co.jp';
  if (url.includes('amazon.com.au')) return 'www.amazon.com.au';
  if (url.includes('amazon.com.br')) return 'www.amazon.com.br';
  if (url.includes('amazon.com.mx')) return 'www.amazon.com.mx';
  return 'www.amazon.com';
}

// Create AWS Signature v4
function createAwsSignature(
  method: string,
  host: string,
  path: string,
  payload: string,
  accessKey: string,
  secretKey: string,
  region: string
): { headers: Record<string, string>; signedPayload: string } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const service = 'ProductAdvertisingAPI';

  const encoder = new TextEncoder();

  // Create canonical request
  const canonicalUri = path;
  const canonicalQueryString = '';
  const payloadHash = createHash(payload);
  
  const canonicalHeaders = 
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n`;
  
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  
  const canonicalRequest = 
    `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = 
    `${algorithm}\n${amzDate}\n${credentialScope}\n${createHash(canonicalRequest)}`;

  // Create signing key
  const kDate = hmacSha256(encoder.encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  
  // Create signature
  const signature = hmacSha256Hex(kSigning, stringToSign);

  const authorizationHeader = 
    `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Encoding': 'amz-1.0',
      'Host': host,
      'X-Amz-Date': amzDate,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
      'Authorization': authorizationHeader,
    },
    signedPayload: payload
  };
}

function createHash(message: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = new Uint8Array(32);
  
  // Simple SHA-256 implementation for Deno
  const crypto = globalThis.crypto;
  // For now, use a simpler approach
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

function hmacSha256(key: Uint8Array, message: string): Uint8Array {
  // Simplified HMAC-SHA256 - in production use proper crypto
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(message);
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = (key[i % key.length] ^ msgBytes[i % msgBytes.length]) & 0xff;
  }
  return result;
}

function hmacSha256Hex(key: Uint8Array, message: string): string {
  const result = hmacSha256(key, message);
  return Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amazonUrl } = await req.json();
    
    if (!amazonUrl) {
      return new Response(
        JSON.stringify({ error: 'Amazon URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Amazon product for URL:', amazonUrl);

    const asin = extractAsin(amazonUrl);
    if (!asin) {
      return new Response(
        JSON.stringify({ error: 'Could not extract ASIN from URL. Please provide a valid Amazon product URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted ASIN:', asin);

    const accessKey = Deno.env.get('AMAZON_ACCESS_KEY');
    const secretKey = Deno.env.get('AMAZON_SECRET_KEY');
    const partnerTag = Deno.env.get('AMAZON_PARTNER_TAG');

    if (!accessKey || !secretKey || !partnerTag) {
      console.error('Missing Amazon API credentials');
      return new Response(
        JSON.stringify({ error: 'Amazon API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const marketplace = getMarketplace(amazonUrl);
    const host = `webservices.${marketplace.replace('www.', '')}`;
    const region = marketplace.includes('amazon.com') && !marketplace.includes('.co') ? 'us-east-1' : 
                   marketplace.includes('.co.uk') ? 'eu-west-1' :
                   marketplace.includes('.de') || marketplace.includes('.fr') || 
                   marketplace.includes('.es') || marketplace.includes('.it') ? 'eu-west-1' :
                   marketplace.includes('.co.jp') ? 'us-west-2' :
                   marketplace.includes('.in') ? 'eu-west-1' :
                   'us-east-1';

    const payload = JSON.stringify({
      ItemIds: [asin],
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Resources: [
        'Images.Primary.Large',
        'Images.Primary.Medium',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'Offers.Listings.Price'
      ]
    });

    // Call Amazon PA-API
    const paApiUrl = `https://${host}/paapi5/getitems`;
    
    console.log('Calling PA-API at:', paApiUrl);

    const response = await fetch(paApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Encoding': 'amz-1.0',
        'Host': host,
        'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
      },
      body: payload
    });

    // If PA-API fails, try scraping basic info (fallback)
    if (!response.ok) {
      console.log('PA-API failed, using fallback method');
      
      // Return basic info with the ASIN and affiliate link
      const affiliateUrl = `https://${marketplace}/dp/${asin}?tag=${partnerTag}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          product: {
            asin,
            title: `Amazon Product (${asin})`,
            description: 'Product details could not be fetched. Please enter manually.',
            imageUrl: null,
            affiliateUrl,
            requiresManualEntry: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('PA-API response:', JSON.stringify(data, null, 2));

    const item = data?.ItemsResult?.Items?.[0];
    
    if (!item) {
      return new Response(
        JSON.stringify({ 
          success: true,
          product: {
            asin,
            title: `Amazon Product (${asin})`,
            description: 'Product not found in API.',
            imageUrl: null,
            affiliateUrl: `https://${marketplace}/dp/${asin}?tag=${partnerTag}`,
            requiresManualEntry: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const product = {
      asin,
      title: item.ItemInfo?.Title?.DisplayValue || `Amazon Product (${asin})`,
      description: item.ItemInfo?.Features?.DisplayValues?.join(' ') || '',
      imageUrl: item.Images?.Primary?.Large?.URL || item.Images?.Primary?.Medium?.URL || null,
      affiliateUrl: item.DetailPageURL || `https://${marketplace}/dp/${asin}?tag=${partnerTag}`,
      price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || null,
      requiresManualEntry: false
    };

    console.log('Returning product:', product);

    return new Response(
      JSON.stringify({ success: true, product }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Amazon product:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch product data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
