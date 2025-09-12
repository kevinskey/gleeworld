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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '').trim();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (adminError || (!adminData?.is_admin && !adminData?.is_super_admin)) {
      console.error('Permission denied - user is not admin:', { user: user.id, adminData })
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, full_name, contract_id, role = 'user' } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auto-enrolling user:', { email, full_name, role })

    // Check if user already exists
    const { data: existingAuth } = await supabaseClient.auth.admin.getUserByEmail(email)
    
    let userId: string
    let userCreated = false

    if (existingAuth.user) {
      // User exists in auth, use their ID
      userId = existingAuth.user.id
      console.log('User already exists in auth:', userId)
    } else {
      // Create new user in auth
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || email.split('@')[0]
        }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            enrolled: false, 
            error: createError.message 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = newUser.user.id
      userCreated = true
      console.log('Created new user:', userId)
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseClient
      .from('gw_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!existingProfile) {
      // Create profile
      const { error: profileError } = await supabaseClient
        .from('gw_profiles')
        .insert({
          user_id: userId,
          email,
          full_name: full_name || email.split('@')[0],
          role: role,
          is_admin: role === 'admin',
          is_super_admin: role === 'super-admin',
          verified: true
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            enrolled: false, 
            error: profileError.message 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Update existing profile with new role if provided
      const { error: updateError } = await supabaseClient
        .from('gw_profiles')
        .update({
          role: role,
          is_admin: role === 'admin' || role === 'super-admin',
          is_super_admin: role === 'super-admin',
          verified: true
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating profile:', updateError)
      }
    }

    // Send invitation email if user was newly created
    if (userCreated) {
      const { error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email)
      if (inviteError) {
        console.error('Error sending invitation:', inviteError)
        // Don't fail the whole operation if invitation fails
      }
    }

    console.log('Successfully auto-enrolled user:', { userId, email, role })

    return new Response(
      JSON.stringify({
        success: true,
        enrolled: true,
        user_id: userId,
        message: userCreated ? 'User created and enrolled' : 'User updated and enrolled'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in auto-enroll-user function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        enrolled: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})