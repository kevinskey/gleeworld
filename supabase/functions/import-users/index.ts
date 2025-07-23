import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  email: string;
  full_name?: string;
  role: string;
}

interface ImportRequest {
  users: UserData[];
  source: 'manual' | 'csv';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create regular client to verify the requesting user is an admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is admin or super-admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['admin', 'super-admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { users: usersToImport }: ImportRequest = await req.json()

    if (!usersToImport || !Array.isArray(usersToImport)) {
      return new Response(
        JSON.stringify({ error: 'Invalid users data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const results = {
      success: 0,
      errors: [] as string[],
      users: [] as any[]
    }

    // Process each user
    for (const userData of usersToImport) {
      try {
        const { email, full_name, role } = userData

        // Validate email
        if (!email || !email.includes('@')) {
          results.errors.push(`Invalid email: ${email}`)
          continue
        }

        // Validate role
        if (!['user', 'admin', 'super-admin', 'alumnae'].includes(role)) {
          results.errors.push(`Invalid role for ${email}: ${role}`)
          continue
        }

        // Generate a temporary password (12 characters)
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)

        // Create user in Supabase Auth using admin client
        const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email for admin-created users
          user_metadata: {
            full_name: full_name || ''
          }
        })

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            results.errors.push(`User ${email} already exists`)
          } else {
            results.errors.push(`Failed to create ${email}: ${signUpError.message}`)
          }
          continue
        }

        if (!newUser.user) {
          results.errors.push(`Failed to create user ${email}`)
          continue
        }

        // Update the profile with the specified role
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({
            full_name: full_name || null,
            role: role
          })
          .eq('id', newUser.user.id)

        if (profileUpdateError) {
          console.error('Profile update error:', profileUpdateError)
          // User was created but profile update failed - still count as success
          results.errors.push(`User ${email} created but role assignment failed`)
        }

        results.success++
        results.users.push({
          id: newUser.user.id,
          email: email,
          full_name: full_name,
          role: role,
          temp_password: tempPassword
        })

        console.log(`Successfully created user: ${email} with role: ${role}`)

      } catch (error) {
        console.error('Error processing user:', userData, error)
        results.errors.push(`Error processing ${userData.email}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify(results),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})