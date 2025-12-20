import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract ASIN from Amazon URL
function extractAsin(url: string): string | null {
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

// Get marketplace info
function getMarketplaceInfo(url: string): { host: string; region: string; marketplace: string } {
  if (url.includes('amazon.co.uk')) return { host: 'webservices.amazon.co.uk', region: 'eu-west-1', marketplace: 'www.amazon.co.uk' };
  if (url.includes('amazon.de')) return { host: 'webservices.amazon.de', region: 'eu-west-1', marketplace: 'www.amazon.de' };
  if (url.includes('amazon.fr')) return { host: 'webservices.amazon.fr', region: 'eu-west-1', marketplace: 'www.amazon.fr' };
  if (url.includes('amazon.es')) return { host: 'webservices.amazon.es', region: 'eu-west-1', marketplace: 'www.amazon.es' };
  if (url.includes('amazon.it')) return { host: 'webservices.amazon.it', region: 'eu-west-1', marketplace: 'www.amazon.it' };
  if (url.includes('amazon.ca')) return { host: 'webservices.amazon.ca', region: 'us-east-1', marketplace: 'www.amazon.ca' };
  if (url.includes('amazon.com.mx')) return { host: 'webservices.amazon.com.mx', region: 'us-east-1', marketplace: 'www.amazon.com.mx' };
  if (url.includes('amazon.com.br')) return { host: 'webservices.amazon.com.br', region: 'us-east-1', marketplace: 'www.amazon.com.br' };
  if (url.includes('amazon.co.jp')) return { host: 'webservices.amazon.co.jp', region: 'us-west-2', marketplace: 'www.amazon.co.jp' };
  if (url.includes('amazon.com.au')) return { host: 'webservices.amazon.com.au', region: 'us-west-2', marketplace: 'www.amazon.com.au' };
  if (url.includes('amazon.in')) return { host: 'webservices.amazon.in', region: 'eu-west-1', marketplace: 'www.amazon.in' };
  return { host: 'webservices.amazon.com', region: 'us-east-1', marketplace: 'www.amazon.com' };
}

// Convert ArrayBuffer to hex string
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// SHA-256 hash
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
}

// HMAC-SHA256
async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

// Create AWS Signature v4
async function createSignedHeaders(
  method: string,
  host: string,
  path: string,
  payload: string,
  accessKey: string,
  secretKey: string,
  region: string
): Promise<Record<string, string>> {
  const encoder = new TextEncoder();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const service = 'ProductAdvertisingAPI';
  const target = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';

  // Hash the payload
  const payloadHash = await sha256(payload);

  // Create canonical request
  const canonicalHeaders = 
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  // Create signing key
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  
  // Create signature
  const signatureBuffer = await hmacSha256(kSigning, stringToSign);
  const signature = toHex(signatureBuffer);

  const authorizationHeader = 
    `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Encoding': 'amz-1.0',
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': target,
    'Authorization': authorizationHeader,
  };
}

serve(async (req) => {
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
        JSON.stringify({ error: 'Could not extract ASIN from URL' }),
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

    const { host, region, marketplace } = getMarketplaceInfo(amazonUrl);
    const path = '/paapi5/getitems';

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

    console.log('Creating signed request for PA-API');
    console.log('Using host:', host, 'region:', region, 'marketplace:', marketplace);
    console.log('Partner Tag:', partnerTag);

    const signedHeaders = await createSignedHeaders(
      'POST',
      host,
      path,
      payload,
      accessKey,
      secretKey,
      region
    );

    const paApiUrl = `https://${host}${path}`;
    console.log('Calling PA-API at:', paApiUrl);
    console.log('Request payload:', payload);

    let response;
    try {
      response = await fetch(paApiUrl, {
        method: 'POST',
        headers: signedHeaders,
        body: payload
      });
    } catch (fetchError) {
      console.error('Fetch error calling PA-API:', fetchError.message);
      throw fetchError;
    }

    console.log('PA-API response status:', response.status);
    console.log('PA-API response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PA-API error response body:', errorText);
      
      // Try to parse the error for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('PA-API error parsed:', JSON.stringify(errorJson, null, 2));
        
        // Common error codes:
        // - InvalidSignature: signature calculation is wrong
        // - UnrecognizedClient: access key is invalid
        // - TooManyRequests: rate limited
        // - ItemsNotFound: ASIN doesn't exist
        if (errorJson.__type) {
          console.error('PA-API error type:', errorJson.__type);
        }
        if (errorJson.message) {
          console.error('PA-API error message:', errorJson.message);
        }
        if (errorJson.Errors) {
          console.error('PA-API Errors array:', JSON.stringify(errorJson.Errors));
        }
      } catch (parseError) {
        console.error('Could not parse error as JSON:', parseError.message);
      }
      
      // Return fallback with affiliate link
      const affiliateUrl = `https://${marketplace}/dp/${asin}?tag=${partnerTag}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          product: {
            asin,
            title: '',
            description: '',
            imageUrl: null,
            affiliateUrl,
            requiresManualEntry: true,
            error: `PA-API returned ${response.status}`,
            errorDetails: errorText.substring(0, 500) // Include first 500 chars of error
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('PA-API response received');

    const item = data?.ItemsResult?.Items?.[0];
    
    if (!item) {
      return new Response(
        JSON.stringify({ 
          success: true,
          product: {
            asin,
            title: '',
            description: '',
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
      title: item.ItemInfo?.Title?.DisplayValue || '',
      description: item.ItemInfo?.Features?.DisplayValues?.slice(0, 3).join(' ') || '',
      imageUrl: item.Images?.Primary?.Large?.URL || item.Images?.Primary?.Medium?.URL || null,
      affiliateUrl: item.DetailPageURL || `https://${marketplace}/dp/${asin}?tag=${partnerTag}`,
      price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || null,
      requiresManualEntry: false
    };

    console.log('Product fetched successfully:', product.title);

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
