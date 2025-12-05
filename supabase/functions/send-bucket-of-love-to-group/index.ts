import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendBucketOfLoveRequest {
  message: string;
  note_color: string;
  is_anonymous: boolean;
  decorations?: string;
  group_type: string;
  request_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: SendBucketOfLoveRequest = await req.json();
    const { message, note_color, is_anonymous, decorations, group_type, request_id } = requestData;

    console.log('Sending bucket of love to group:', { group_type, user_id: user.id, request_id });
    
    // Check for duplicate requests based on user, message, and recent timestamp
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentBuckets } = await supabase
      .from('gw_buckets_of_love')
      .select('id')
      .eq('user_id', user.id)
      .eq('message', message)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);
    
    if (recentBuckets && recentBuckets.length > 0) {
      console.log('Duplicate request detected, skipping...', { request_id, existing_bucket: recentBuckets[0].id });
      return new Response(JSON.stringify({
        success: true,
        message: 'Duplicate request detected - message already sent',
        count: 0,
        duplicate: true
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Get recipients based on group type
    let recipients: string[] = [];
    
    switch (group_type) {
      case 'all_members':
        const { data: members } = await supabase
          .from('gw_profiles')
          .select('user_id')
          .eq('role', 'member');
        recipients = members?.map(m => m.user_id) || [];
        break;
        
      case 'all_alumnae':
        const { data: alumnae } = await supabase
          .from('gw_profiles')
          .select('user_id')
          .eq('role', 'alumna');
        recipients = alumnae?.map(a => a.user_id) || [];
        break;
        
      case 'all_fans':
        const { data: fans } = await supabase
          .from('gw_profiles')
          .select('user_id')
          .eq('role', 'fan');
        recipients = fans?.map(f => f.user_id) || [];
        break;
        
      case 'executive_board':
        const { data: executives } = await supabase
          .from('gw_executive_board_members')
          .select('user_id')
          .eq('is_active', true);
        recipients = executives?.map(e => e.user_id) || [];
        break;
        
      case 'soprano_1':
      case 'soprano_2':
      case 'alto_1':
      case 'alto_2':
        const { data: voiceParts } = await supabase
          .from('gw_profiles')
          .select('user_id')
          .eq('voice_part', group_type);
        recipients = voiceParts?.map(v => v.user_id) || [];
        break;
        
      default:
        throw new Error('Invalid group type');
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No recipients found for this group',
        count: 0
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Create bucket of love entries for each recipient
    const bucketEntries = recipients.map(recipientId => ({
      user_id: user.id,
      message,
      note_color,
      is_anonymous,
      decorations: decorations || '',
      recipient_user_id: recipientId
    }));

    const { error: insertError } = await supabase
      .from('gw_buckets_of_love')
      .insert(bucketEntries);

    if (insertError) {
      throw insertError;
    }

    console.log(`Successfully sent bucket of love to ${recipients.length} recipients`);

    return new Response(JSON.stringify({
      success: true,
      message: `Bucket of love sent to ${recipients.length} recipients`,
      count: recipients.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-bucket-of-love-to-group function:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to send bucket of love to group",
      details: error.toString()
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);