
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL SECURITY CHECK: Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Authentication required',
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Invalid authentication',
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Check if user has admin privileges
    const { data: profile, error: profileError } = await supabaseClient
      .from('gw_profiles')
      .select('role, is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || (!profile.is_admin && !profile.is_super_admin && !['admin', 'super-admin'].includes(profile.role))) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Admin privileges required',
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    console.log('Starting bulk executive board verification...');

    // Get all active executive board members
    const { data: execBoardMembers, error: fetchError } = await supabaseClient
      .from('gw_executive_board_members')
      .select('user_id, position')
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Failed to fetch executive board members: ${fetchError.message}`);
    }

    console.log(`Found ${execBoardMembers?.length || 0} active executive board members`);

    if (!execBoardMembers || execBoardMembers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active executive board members found',
          verified_count: 0,
          results: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Get user IDs of executive board members
    const execUserIds = execBoardMembers.map(member => member.user_id);

    // Update all executive board members to verified = true
    const { data: updatedProfiles, error: updateError } = await supabaseClient
      .from('gw_profiles')
      .update({ 
        verified: true,
        updated_at: new Date().toISOString()
      })
      .in('user_id', execUserIds)
      .select('user_id, email, full_name');

    if (updateError) {
      throw new Error(`Failed to update profiles: ${updateError.message}`);
    }

    console.log(`Successfully verified ${updatedProfiles?.length || 0} executive board members`);

    // Log the admin operation for audit trail
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'bulk_executive_board_verification',
        resource_type: 'users',
        details: { 
          source: 'bulk-verify-exec-board',
          verified_count: updatedProfiles?.length || 0,
          exec_positions: execBoardMembers.map(m => m.position)
        }
      });

    const results = updatedProfiles?.map((profile, index) => ({
      user_id: profile.user_id,
      email: profile.email,
      full_name: profile.full_name,
      position: execBoardMembers.find(m => m.user_id === profile.user_id)?.position,
      success: true,
      message: 'Verified successfully'
    })) || [];

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully verified ${results.length} executive board members`,
        verified_count: results.length,
        results,
        summary: {
          total_exec_members: execBoardMembers.length,
          verified: results.length,
          failed: 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in bulk verification:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        verified_count: 0,
        results: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
