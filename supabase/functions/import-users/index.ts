import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        const { email, full_name, role = 'user' } = userData
        
        if (!email) {
          results.errors.push('Email is required')
          continue
        }

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8)
        
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
          })

        if (gwProfileError) {
          console.warn(`Warning: Failed to create gw_profile for ${email}:`, gwProfileError.message)
          // Don't treat this as a fatal error since gw_profiles might not be required
        }

        results.success++
        results.users.push({
          email: email,
          temp_password: tempPassword,
          user_id: authData.user.id
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