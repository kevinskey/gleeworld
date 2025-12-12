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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user's profile
    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('email, role, is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single()

    // Check username permissions
    const { data: permissions } = await supabase
      .from('username_permissions')
      .select('*')
      .eq('user_email', user.email)
      .eq('module_name', 'auditions')
      .eq('is_active', true)

    // Try to query auditioner profiles to test access
    const { data: auditioners, error: auditionerError } = await supabase
      .from('gw_profiles')
      .select('email, full_name, role')
      .eq('role', 'auditioner')
      .limit(5)

    console.log('Access check results:', {
      user_email: user.email,
      profile: profile,
      permissions: permissions,
      can_see_auditioners: !auditionerError,
      auditioner_count: auditioners?.length || 0,
      error: auditionerError?.message
    })

    return new Response(
      JSON.stringify({
        user: {
          email: user.email,
          profile: profile
        },
        permissions: permissions,
        can_see_auditioners: !auditionerError,
        auditioner_count: auditioners?.length || 0,
        auditioners_sample: auditioners?.slice(0, 3) || [],
        error: auditionerError?.message || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error checking audition access:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})