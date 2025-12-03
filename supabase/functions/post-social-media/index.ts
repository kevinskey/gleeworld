import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SocialMediaPayload {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin';
  content: string;
  imageUrl?: string;
  postId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload: SocialMediaPayload = await req.json();
    console.log('Processing social media post:', payload);

    let result: any = null;

    switch (payload.platform) {
      case 'twitter':
        result = await postToTwitter(payload);
        break;
      case 'facebook':
        result = await postToFacebook(payload);
        break;
      case 'instagram':
        result = await postToInstagram(payload);
        break;
      case 'linkedin':
        result = await postToLinkedIn(payload);
        break;
      default:
        throw new Error(`Unsupported platform: ${payload.platform}`);
    }

    // Update the social media post status
    if (payload.postId) {
      await supabase
        .from('gw_social_media_posts')
        .update({
          status: result.success ? 'published' : 'failed',
          published_at: result.success ? new Date().toISOString() : null,
          external_id: result.id || null,
          error_message: result.error || null
        })
        .eq('id', payload.postId);
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in social media handler:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

async function postToTwitter(payload: SocialMediaPayload) {
  const twitterApiKey = Deno.env.get('TWITTER_API_KEY');
  const twitterApiSecret = Deno.env.get('TWITTER_API_SECRET');
  const twitterAccessToken = Deno.env.get('TWITTER_ACCESS_TOKEN');
  const twitterAccessTokenSecret = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET');

  if (!twitterApiKey || !twitterApiSecret || !twitterAccessToken || !twitterAccessTokenSecret) {
    return { success: false, error: 'Twitter API credentials not configured' };
  }

  // TODO: Implement Twitter API v2 posting
  // This is a placeholder implementation
  console.log('Twitter posting not fully implemented yet');
  return { success: false, error: 'Twitter posting not implemented' };
}

async function postToFacebook(payload: SocialMediaPayload) {
  const facebookAccessToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN');
  const facebookPageId = Deno.env.get('FACEBOOK_PAGE_ID');

  if (!facebookAccessToken || !facebookPageId) {
    return { success: false, error: 'Facebook API credentials not configured' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${facebookPageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: payload.content,
          access_token: facebookAccessToken,
          ...(payload.imageUrl && { link: payload.imageUrl })
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      return { success: true, id: result.id };
    } else {
      return { success: false, error: result.error?.message || 'Facebook posting failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function postToInstagram(payload: SocialMediaPayload) {
  // Instagram requires Facebook Business API and specific image requirements
  console.log('Instagram posting not implemented yet');
  return { success: false, error: 'Instagram posting not implemented' };
}

async function postToLinkedIn(payload: SocialMediaPayload) {
  const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
  const linkedinPersonId = Deno.env.get('LINKEDIN_PERSON_ID');

  if (!linkedinAccessToken || !linkedinPersonId) {
    return { success: false, error: 'LinkedIn API credentials not configured' };
  }

  try {
    const response = await fetch(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${linkedinAccessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:person:${linkedinPersonId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: payload.content
              },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      return { success: true, id: result.id };
    } else {
      return { success: false, error: result.message || 'LinkedIn posting failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

serve(handler);