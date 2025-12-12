import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting delete-all-mus240-groups function');
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Authorization header found');

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token and verify user
    const jwt = authHeader.replace('Bearer ', '');
    
    try {
      // Use the service role client to verify the JWT and get user info
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
      
      if (userError || !user) {
        console.log('User authentication failed:', userError?.message || 'No user found');
        return new Response(
          JSON.stringify({ error: 'Authentication failed', details: userError?.message }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('User authenticated:', user.id);

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('Failed to get user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to get user profile' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const isAdmin = profile.is_admin || profile.is_super_admin || ['admin', 'super-admin'].includes(profile.role);
    if (!isAdmin) {
      console.log('User is not admin:', profile);
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Admin access verified, proceeding with deletion');

    // Get count of groups before deletion
    const { count: initialCount } = await supabaseClient
      .from('mus240_project_groups')
      .select('*', { count: 'exact', head: true });

    console.log(`Found ${initialCount} groups to delete`);

    // Delete all group applications first (references groups)
    const { error: applicationsError } = await supabaseClient
      .from('mus240_group_applications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (applicationsError) {
      console.log('Error deleting group applications:', applicationsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete group applications', details: applicationsError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully deleted all group applications');

    // Delete all group memberships (references groups)
    const { error: membershipsError } = await supabaseClient
      .from('mus240_group_memberships')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (membershipsError) {
      console.log('Error deleting group memberships:', membershipsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete group memberships', details: membershipsError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully deleted all group memberships');

    // Delete all project groups
    const { error: groupsError } = await supabaseClient
      .from('mus240_project_groups')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (groupsError) {
      console.log('Error deleting project groups:', groupsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete project groups', details: groupsError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully deleted all project groups');

    // Verify deletion
    const { count: finalCount } = await supabaseClient
      .from('mus240_project_groups')
      .select('*', { count: 'exact', head: true });

    console.log(`Groups remaining after deletion: ${finalCount}`);

    // Log the admin action
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'delete_all_mus240_groups',
        resource_type: 'mus240_groups',
        details: {
          groups_deleted: initialCount,
          timestamp: new Date().toISOString(),
          admin_user: user.email
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted all MUS 240 groups`,
        groups_deleted: initialCount,
        groups_remaining: finalCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

    } catch (authError) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: authError.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in delete-all-mus240-groups function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});