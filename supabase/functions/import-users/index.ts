import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // CRITICAL SECURITY FIX: Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: 0, 
          errors: ['Unauthorized: Authentication required'],
          users: []
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
          success: 0, 
          errors: ['Unauthorized: Invalid authentication'],
          users: []
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

    if (profileError || !profile || !(profile.is_admin || profile.is_super_admin || ['admin', 'super-admin'].includes(profile.role))) {
      return new Response(
        JSON.stringify({ 
          success: 0, 
          errors: ['Unauthorized: Admin privileges required'],
          users: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Log the admin operation for audit trail
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'bulk_user_import',
        resource_type: 'users',
        details: { source: req.headers.get('source') || 'unknown', user_count: Array.isArray(req.body?.users) ? req.body.users.length : 0 }
      })

    const { users, source } = await req.json()
    
    if (!users || !Array.isArray(users)) {
      throw new Error('Users array is required')
    }

    const results = {
      success: 0,
      errors: [] as string[],
      users: [] as any[]
    }

    for (const userData of users) {
      try {
        const { email, full_name, class_year, role = 'user' } = userData
        
        if (!email) {
          results.errors.push('Email is required')
          continue
        }

        // SECURITY FIX: Generate secure temporary password
        const tempPassword = crypto.getRandomValues(new Uint8Array(12))
          .reduce((acc, byte) => acc + String.fromCharCode(33 + (byte % 94)), '');
        
        // Create user in auth.users
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: full_name || ''
          }
        })

        if (authError) {
          results.errors.push(`Failed to create auth user for ${email}: ${authError.message}`)
          continue
        }

        if (!authData.user) {
          results.errors.push(`No user data returned for ${email}`)
          continue
        }

        // Create/update profile
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: email,
            full_name: full_name || '',
            role: role
          })

        if (profileError) {
          results.errors.push(`Failed to create profile for ${email}: ${profileError.message}`)
          continue
        }

        // Create/update gw_profile
        const { error: gwProfileError } = await supabaseClient
          .from('gw_profiles')
          .upsert({
            user_id: authData.user.id,
            email: email,
            full_name: full_name || '',
            first_name: full_name ? full_name.split(' ')[0] : '',
            last_name: full_name ? full_name.split(' ').slice(1).join(' ') : null,
            class_year: class_year || null,
          })

        if (gwProfileError) {
          console.warn(`Warning: Failed to create gw_profile for ${email}:`, gwProfileError.message)
          // Don't treat this as a fatal error since gw_profiles might not be required
        }

        results.success++
        // SECURITY FIX: Do not expose passwords in API responses
        results.users.push({
          email: email,
          user_id: authData.user.id,
          password_reset_required: true
        })

      } catch (userError) {
        results.errors.push(`Error processing user ${userData.email}: ${userError.message}`)
      }
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in import-users function:', error)
    return new Response(
      JSON.stringify({ 
        success: 0, 
        errors: [error.message || 'Unknown error occurred'],
        users: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})