
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportUser {
  email: string;
  full_name?: string;
  role?: string;
}

interface ImportRequest {
  apiUrl?: string;
  apiKey?: string;
  users?: ImportUser[];
  source: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if user is admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super-admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { apiUrl, apiKey, users, source }: ImportRequest = await req.json()

    let usersToImport: ImportUser[] = []

    if (source === 'manual' && users) {
      usersToImport = users
    } else if (source === 'reader.gleeworld.org' && apiUrl && apiKey) {
      // Fetch users from external API
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const apiData = await response.json()
      
      // Transform API response to our format
      // Adjust this based on the actual API response structure
      usersToImport = Array.isArray(apiData) ? apiData : apiData.users || []
      
      // Normalize the user data
      usersToImport = usersToImport.map((user: any) => ({
        email: user.email || user.emailAddress,
        full_name: user.full_name || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: user.role || 'user'
      }))
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each user
    for (const userData of usersToImport) {
      try {
        if (!userData.email) {
          results.failed++
          results.errors.push(`Missing email for user: ${JSON.stringify(userData)}`)
          continue
        }

        // Check if user already exists
        const { data: existingProfile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', userData.email)
          .single()

        if (existingProfile) {
          results.failed++
          results.errors.push(`User already exists: ${userData.email}`)
          continue
        }

        // Create user in auth.users
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
          email: userData.email,
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name || '',
          }
        })

        if (authError) {
          results.failed++
          results.errors.push(`Failed to create auth user for ${userData.email}: ${authError.message}`)
          continue
        }

        // Create profile
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: authUser.user.id,
            email: userData.email,
            full_name: userData.full_name || '',
            role: userData.role || 'user'
          })

        if (profileError) {
          results.failed++
          results.errors.push(`Failed to create profile for ${userData.email}: ${profileError.message}`)
          
          // Clean up auth user if profile creation failed
          await supabaseClient.auth.admin.deleteUser(authUser.user.id)
          continue
        }

        results.success++
        console.log(`Successfully imported user: ${userData.email}`)

      } catch (error) {
        results.failed++
        results.errors.push(`Error processing ${userData.email}: ${error.message}`)
        console.error(`Error importing user ${userData.email}:`, error)
      }
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Import function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
