
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

    // Get all existing users and profiles upfront to avoid duplicates
    const { data: existingAuthUsers } = await supabaseClient.auth.admin.listUsers()
    const { data: existingProfiles } = await supabaseClient
      .from('profiles')
      .select('id, email')

    // Create comprehensive lookup maps
    const existingEmails = new Set()
    const existingUserIds = new Set()

    // Track existing auth users
    existingAuthUsers?.users?.forEach(authUser => {
      if (authUser.email) {
        existingEmails.add(authUser.email.toLowerCase().trim())
        existingUserIds.add(authUser.id)
      }
    })

    // Track existing profiles
    existingProfiles?.forEach(profile => {
      if (profile.email) {
        existingEmails.add(profile.email.toLowerCase().trim())
      }
      existingUserIds.add(profile.id)
    })

    console.log(`Found ${existingEmails.size} existing emails and ${existingUserIds.size} existing user IDs`)

    // Process each user with comprehensive duplicate prevention
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

        // Skip if email already exists in system
        if (existingEmails.has(normalizedEmail)) {
          results.failed++
          results.errors.push(`User already exists: ${userData.email}`)
          console.log(`Skipping existing user: ${userData.email}`)
          continue
        }

        console.log(`Creating new user: ${userData.email} with role: ${userRole}`)

        // Create user in auth.users with retry logic
        let authUser = null
        let createAttempts = 0
        const maxAttempts = 3

        while (createAttempts < maxAttempts && !authUser) {
          createAttempts++
          
          try {
            const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
              email: userData.email,
              email_confirm: true,
              user_metadata: {
                full_name: userData.full_name || '',
              }
            })

            if (authError) {
              if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
                console.log(`User ${userData.email} already exists in auth, skipping`)
                results.failed++
                results.errors.push(`User already exists in auth: ${userData.email}`)
                break
              }
              throw authError
            }

            if (!authData?.user) {
              throw new Error('No user returned from auth creation')
            }

            authUser = authData.user
            console.log(`Created auth user for ${userData.email} with ID: ${authUser.id}`)

          } catch (authCreateError) {
            console.error(`Attempt ${createAttempts} failed for ${userData.email}:`, authCreateError)
            
            if (createAttempts >= maxAttempts) {
              results.failed++
              results.errors.push(`Failed to create auth user for ${userData.email} after ${maxAttempts} attempts: ${authCreateError.message}`)
              break
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        // If auth user creation failed, continue to next user
        if (!authUser) {
          continue
        }

        // Check if this user ID already exists in our tracking
        if (existingUserIds.has(authUser.id)) {
          console.log(`User ID ${authUser.id} already exists, cleaning up and skipping`)
          
          // Clean up the auth user we just created
          try {
            await supabaseClient.auth.admin.deleteUser(authUser.id)
            console.log(`Cleaned up duplicate auth user: ${authUser.id}`)
          } catch (cleanupError) {
            console.error(`Failed to cleanup auth user ${authUser.id}:`, cleanupError)
          }
          
          results.failed++
          results.errors.push(`User ID already exists for ${userData.email}`)
          continue
        }

        // Add to our tracking immediately to prevent within-batch duplicates
        existingEmails.add(normalizedEmail)
        existingUserIds.add(authUser.id)

        // Create profile with comprehensive error handling
        try {
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert({
              id: authUser.id,
              email: userData.email,
              full_name: userData.full_name || '',
              role: userRole
            })

          if (profileError) {
            console.error(`Profile creation failed for ${userData.email}:`, profileError)
            
            // Clean up auth user if profile creation failed
            try {
              await supabaseClient.auth.admin.deleteUser(authUser.id)
              console.log(`Cleaned up auth user after profile failure: ${authUser.id}`)
            } catch (cleanupError) {
              console.error(`Failed to cleanup auth user ${authUser.id}:`, cleanupError)
            }
            
            // Remove from tracking since we cleaned up
            existingEmails.delete(normalizedEmail)
            existingUserIds.delete(authUser.id)
            
            results.failed++
            results.errors.push(`Failed to create profile for ${userData.email}: ${profileError.message}`)
            continue
          }

          results.success++
          console.log(`Successfully imported user: ${userData.email} with role: ${userRole}`)

        } catch (profileCreateError) {
          console.error(`Profile creation error for ${userData.email}:`, profileCreateError)
          
          // Clean up auth user
          try {
            await supabaseClient.auth.admin.deleteUser(authUser.id)
            console.log(`Cleaned up auth user after profile error: ${authUser.id}`)
          } catch (cleanupError) {
            console.error(`Failed to cleanup auth user ${authUser.id}:`, cleanupError)
          }
          
          // Remove from tracking since we cleaned up
          existingEmails.delete(normalizedEmail)
          existingUserIds.delete(authUser.id)
          
          results.failed++
          results.errors.push(`Error creating profile for ${userData.email}: ${profileCreateError.message}`)
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
