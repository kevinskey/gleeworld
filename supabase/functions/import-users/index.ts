
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
        console.log(`API Response headers:`, Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`API Error response:`, errorText)
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}. Response: ${errorText.substring(0, 200)}`)
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text()
          console.log(`Non-JSON response:`, responseText.substring(0, 200))
          throw new Error(`API returned non-JSON content. Content-Type: ${contentType}. Response preview: ${responseText.substring(0, 100)}...`)
        }

        const apiData = await response.json()
        console.log(`API Data received:`, apiData)
        
        // Transform API response to our format
        usersToImport = Array.isArray(apiData) ? apiData : apiData.users || apiData.data || []
        
        if (!Array.isArray(usersToImport)) {
          throw new Error(`Expected user data to be an array, got: ${typeof usersToImport}`)
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
            error: `Failed to fetch users from API: ${apiError.message}`,
            details: 'Please check your API URL and key. The API might be returning HTML instead of JSON, which could indicate an authentication issue or incorrect endpoint.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!usersToImport || usersToImport.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No users to import',
          details: 'Either no users were provided or the API returned no user data.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Get all existing users and profiles upfront for efficient checking
    const { data: existingAuthUsers } = await supabaseClient.auth.admin.listUsers()
    const { data: existingProfiles } = await supabaseClient
      .from('profiles')
      .select('id, email')

    // Create lookup maps for efficient checking
    const authUsersByEmail = new Map()
    const authUsersById = new Map()
    existingAuthUsers?.users?.forEach(user => {
      if (user.email) {
        authUsersByEmail.set(user.email.toLowerCase(), user)
        authUsersById.set(user.id, user)
      }
    })

    const profilesByEmail = new Map()
    const profilesById = new Map()
    existingProfiles?.forEach(profile => {
      if (profile.email) {
        profilesByEmail.set(profile.email.toLowerCase(), profile)
        profilesById.set(profile.id, profile)
      }
    })

    // Process each user individually with comprehensive error handling
    for (const userData of usersToImport) {
      try {
        if (!userData.email) {
          results.failed++
          results.errors.push(`Missing email for user: ${JSON.stringify(userData)}`)
          continue
        }

        const normalizedEmail = userData.email.toLowerCase().trim()
        
        // Validate and normalize role value
        let userRole = 'user' // default role
        if (userData.role) {
          const normalizedRole = userData.role.toLowerCase().trim()
          if (['user', 'admin', 'super-admin'].includes(normalizedRole)) {
            userRole = normalizedRole
          } else {
            console.log(`Invalid role "${userData.role}" for ${userData.email}, defaulting to "user"`)
          }
        }

        console.log(`Processing user ${userData.email} with role: ${userRole}`)

        // Check if user already exists in both auth and profiles
        const existingAuthUser = authUsersByEmail.get(normalizedEmail)
        const existingProfile = profilesByEmail.get(normalizedEmail)
        
        // Case 1: User exists in both auth and profiles - skip
        if (existingAuthUser && existingProfile) {
          results.failed++
          results.errors.push(`User already exists: ${userData.email}`)
          continue
        }
        
        // Case 2: User exists in auth but not in profiles - create profile only
        if (existingAuthUser && !existingProfile) {
          console.log(`User exists in auth but missing profile: ${userData.email}`)
          
          // Check if profile exists by ID (might have different email)
          if (profilesById.has(existingAuthUser.id)) {
            results.failed++
            results.errors.push(`Profile with ID already exists for ${userData.email}`)
            continue
          }
          
          try {
            const { error: profileError } = await supabaseClient
              .from('profiles')
              .insert({
                id: existingAuthUser.id,
                email: userData.email,
                full_name: userData.full_name || '',
                role: userRole
              })

            if (profileError) {
              results.failed++
              results.errors.push(`Failed to create profile for existing user ${userData.email}: ${profileError.message}`)
              continue
            }

            // Add to our tracking
            profilesByEmail.set(normalizedEmail, { id: existingAuthUser.id, email: userData.email })
            profilesById.set(existingAuthUser.id, { id: existingAuthUser.id, email: userData.email })

            results.success++
            console.log(`Created profile for existing user: ${userData.email} with role: ${userRole}`)
            continue
          } catch (profileCreateError) {
            results.failed++
            results.errors.push(`Error creating profile for existing user ${userData.email}: ${profileCreateError.message}`)
            continue
          }
        }

        // Case 3: User doesn't exist in auth - create both auth user and profile
        console.log(`Creating new user ${userData.email} with role: ${userRole}`)

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

        if (!authUser?.user) {
          results.failed++
          results.errors.push(`Failed to create auth user for ${userData.email}: No user returned`)
          continue
        }

        // Add to our tracking immediately
        authUsersByEmail.set(normalizedEmail, authUser.user)
        authUsersById.set(authUser.user.id, authUser.user)

        // Create profile for the new user
        try {
          // Double-check profile doesn't exist by ID before creating
          if (profilesById.has(authUser.user.id)) {
            results.failed++
            results.errors.push(`Profile with ID ${authUser.user.id} already exists for ${userData.email}`)
            
            // Clean up auth user
            try {
              await supabaseClient.auth.admin.deleteUser(authUser.user.id)
              authUsersByEmail.delete(normalizedEmail)
              authUsersById.delete(authUser.user.id)
            } catch (cleanupError) {
              console.error(`Failed to cleanup auth user ${authUser.user.id}:`, cleanupError)
            }
            continue
          }

          const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert({
              id: authUser.user.id,
              email: userData.email,
              full_name: userData.full_name || '',
              role: userRole
            })

          if (profileError) {
            results.failed++
            results.errors.push(`Failed to create profile for ${userData.email}: ${profileError.message}`)
            
            // Clean up auth user if profile creation failed
            try {
              await supabaseClient.auth.admin.deleteUser(authUser.user.id)
              authUsersByEmail.delete(normalizedEmail)
              authUsersById.delete(authUser.user.id)
            } catch (cleanupError) {
              console.error(`Failed to cleanup auth user ${authUser.user.id}:`, cleanupError)
            }
            continue
          }

          // Add to our tracking
          profilesByEmail.set(normalizedEmail, { id: authUser.user.id, email: userData.email })
          profilesById.set(authUser.user.id, { id: authUser.user.id, email: userData.email })

          results.success++
          console.log(`Successfully imported user: ${userData.email} with role: ${userRole}`)

        } catch (profileCreateError) {
          results.failed++
          results.errors.push(`Error creating profile for ${userData.email}: ${profileCreateError.message}`)
          
          // Clean up auth user if profile creation failed
          try {
            await supabaseClient.auth.admin.deleteUser(authUser.user.id)
            authUsersByEmail.delete(normalizedEmail)
            authUsersById.delete(authUser.user.id)
          } catch (cleanupError) {
            console.error(`Failed to cleanup auth user ${authUser.user.id}:`, cleanupError)
          }
          continue
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
