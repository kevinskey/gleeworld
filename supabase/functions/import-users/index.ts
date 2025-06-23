
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
  raw_user_meta_data?: any;
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
    } else if (source === 'csv' && users) {
      usersToImport = users
    } else if (source === 'reader.gleeworld.org' && apiUrl && apiKey) {
      console.log(`Attempting to fetch from: ${apiUrl}`)
      
      // Fetch users from external API
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        })

        console.log(`API Response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`API Error response:`, errorText)
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text()
          console.log(`Non-JSON response:`, responseText.substring(0, 200))
          throw new Error(`API returned non-JSON content`)
        }

        const apiData = await response.json()
        console.log(`API Data received:`, apiData)
        
        // Transform API response to our format
        usersToImport = Array.isArray(apiData) ? apiData : apiData.users || apiData.data || []
        
        if (!Array.isArray(usersToImport)) {
          throw new Error(`Expected user data to be an array`)
        }
        
        // Normalize the user data
        usersToImport = usersToImport.map((user: any) => ({
          email: user.email || user.emailAddress,
          full_name: user.full_name || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role || 'user'
        }))

        console.log(`Processed ${usersToImport.length} users for import`)

      } catch (apiError) {
        console.error('API fetch error:', apiError)
        return new Response(
          JSON.stringify({ 
            error: `Failed to fetch users from API: ${apiError.message}`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!usersToImport || usersToImport.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No users to import'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    console.log(`Starting import of ${usersToImport.length} users`)

    // Get all existing auth users and profiles in one go
    const { data: existingAuthUsers } = await supabaseClient.auth.admin.listUsers()
    const { data: existingProfiles } = await supabaseClient
      .from('profiles')
      .select('id, email')

    // Create sets for fast lookup
    const existingAuthEmails = new Set(existingAuthUsers?.users?.map(u => u.email?.toLowerCase()) || [])
    const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || [])
    const authUserMap = new Map(existingAuthUsers?.users?.map(u => [u.email?.toLowerCase(), u]) || [])

    // Process each user
    for (const userData of usersToImport) {
      try {
        if (!userData.email) {
          results.failed++
          results.errors.push(`Missing email for user: ${JSON.stringify(userData)}`)
          continue
        }

        const normalizedEmail = userData.email.toLowerCase().trim()
        
        // Validate and normalize role
        let userRole = 'user'
        if (userData.role) {
          const normalizedRole = userData.role.toLowerCase().trim()
          if (['user', 'admin', 'super-admin'].includes(normalizedRole)) {
            userRole = normalizedRole
          } else {
            console.log(`Invalid role "${userData.role}" for ${userData.email}, defaulting to "user"`)
          }
        }

        // Extract full_name from raw_user_meta_data if not directly provided
        let fullName = userData.full_name || ''
        if (!fullName && userData.raw_user_meta_data) {
          fullName = userData.raw_user_meta_data.full_name || 
                   userData.raw_user_meta_data.name || 
                   `${userData.raw_user_meta_data.first_name || ''} ${userData.raw_user_meta_data.last_name || ''}`.trim()
        }

        console.log(`Processing user: ${userData.email} with role: ${userRole} and name: ${fullName}`)

        if (existingAuthEmails.has(normalizedEmail)) {
          console.log(`User ${userData.email} already exists in auth, updating profile`)
          
          // Find the existing user
          const existingUser = authUserMap.get(normalizedEmail)
          
          if (existingUser) {
            // Update or create profile for existing user
            const { error: profileError } = await supabaseClient
              .from('profiles')
              .upsert({
                id: existingUser.id,
                email: userData.email,
                full_name: fullName,
                role: userRole
              }, {
                onConflict: 'id'
              })

            if (profileError) {
              console.error(`Failed to update profile for ${userData.email}:`, profileError)
              results.failed++
              results.errors.push(`Failed to update profile for ${userData.email}: ${profileError.message}`)
              continue
            }

            results.success++
            console.log(`Successfully updated user: ${userData.email}`)
          } else {
            results.failed++
            results.errors.push(`Could not find existing user for ${userData.email}`)
          }
        } else {
          console.log(`Creating new user: ${userData.email}`)

          // Prepare user metadata
          const userMetadata = {
            full_name: fullName,
            ...(userData.raw_user_meta_data || {})
          }

          // Create new user in auth
          const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: userData.email,
            email_confirm: true,
            user_metadata: userMetadata
          })

          if (authError) {
            console.error(`Failed to create auth user for ${userData.email}:`, authError)
            results.failed++
            results.errors.push(`Failed to create auth user for ${userData.email}: ${authError.message}`)
            continue
          }

          if (!authData?.user) {
            results.failed++
            results.errors.push(`No user returned from auth creation for ${userData.email}`)
            continue
          }

          console.log(`Created auth user for ${userData.email} with ID: ${authData.user.id}`)

          // Create or update profile for new user
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
              id: authData.user.id,
              email: userData.email,
              full_name: fullName,
              role: userRole
            }, {
              onConflict: 'id'
            })

          if (profileError) {
            console.error(`Profile creation/update failed for ${userData.email}:`, profileError)
            
            // If profile creation fails, we should still consider this a success
            // since the user was created in auth successfully
            console.log(`User ${userData.email} created in auth but profile creation failed - this is recoverable`)
          }

          results.success++
          console.log(`Successfully created user: ${userData.email}`)
        }

      } catch (error) {
        results.failed++
        results.errors.push(`Error processing ${userData.email}: ${error.message}`)
        console.error(`Error importing user ${userData.email}:`, error)
      }
    }

    console.log(`Import completed. Success: ${results.success}, Failed: ${results.failed}`)

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Import function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more details about this error.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
