import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
    // Use service role key which bypasses RLS and triggers
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    )

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create an admin client to verify the user (not for the update)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify the user is authenticated using the anon key client
    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.log('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin using service role client
    const { data: profile, error: profileError } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.log('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.is_admin && !profile.is_super_admin && profile.role !== 'admin' && profile.role !== 'super-admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body to check for specific admin promotion
    const body = await req.json().catch(() => ({}));
    
    // Handle Genesis admin promotion
    if (body.targetEmail === 'genesisharris@spelman.edu') {
      console.log('Promoting Genesis to admin...');
      
      const { data: genesisUpdate, error: genesisError } = await supabaseClient
        .from('gw_profiles')
        .update({ 
          is_admin: true, 
          is_super_admin: true,
          verified: true 
        })
        .eq('email', 'genesisharris@spelman.edu')
        .select();

      if (genesisError) {
        console.error('Error updating Genesis:', genesisError);
        return new Response(
          JSON.stringify({ error: 'Failed to update Genesis admin permissions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Genesis admin permissions updated successfully',
          profile: genesisUpdate[0]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all MUS 240 students using the service role client
    const { data: students, error: studentsError } = await supabaseClient
      .from('mus240_grade_summaries')
      .select('student_id')
      .eq('semester', 'Fall 2025')

    if (studentsError) {
      console.log('Students error:', studentsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch students' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No students found', updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${students.length} students enrolled in MUS 240 Fall 2025`)

    // Call the secure database function that bypasses triggers
    console.log(`Calling secure database function to update student roles`)
    
    const { data: updateResult, error: updateError } = await supabaseClient
      .rpc('update_mus240_student_roles')

    if (updateError) {
      console.log('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update student roles', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actualUpdated = updateResult ? updateResult.length : 0;
    console.log(`Successfully updated ${actualUpdated} student roles to 'student'`, updateResult)
    
    return new Response(
      JSON.stringify({ 
        message: `Successfully updated ${actualUpdated} student roles`,
        updated: actualUpdated,
        total_students: students.length,
        details: updateResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})