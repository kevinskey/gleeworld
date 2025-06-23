
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
        // Adjust this based on the actual API response structure
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

    // Get all existing users and profiles upfront to avoid repeated API calls
    const { data: allAuthUsers } = await supabaseClient.auth.admin.listUsers()
    const existingAuthUsers = new Map(allAuthUsers?.users?.map(u => [u.email?.toLowerCase(), u]) || [])
    
    const { data: allProfiles } = await supabaseClient
      .from('profiles')
      .select('id, email')
    const existingProfiles = new Set(allProfiles?.map(p => p.id) || [])

    // Process each user
    for (const userData of usersToImport) {
      try {
        if (!userData.email) {
          results.failed++
          results.errors.push(`Missing email for user: ${JSON.stringify(userData)}`)
          continue
        }

        const normalizedEmail = userData.email.toLowerCase()
        const existingAuthUser = existingAuthUsers.get(normalizedEmail)
        
        if (existingAuthUser) {
          // User exists in auth, check if profile exists
          if (existingProfiles.has(existingAuthUser.id)) {
            results.failed++
            results.errors.push(`User already exists: ${userData.email}`)
            continue
          } else {
            // User exists in auth but no profile, create profile
            const userRole = userData.role && ['user', 'admin', 'super-admin'].includes(userData.role.toLowerCase().trim()) 
              ? userData.role.toLowerCase().trim() 
              : 'user'

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

            results.success++
            console.log(`Created profile for existing user: ${userData.email} with role: ${userRole}`)
            continue
          }
        }

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

        console.log(`Creating user ${userData.email} with role: ${userRole}`)

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

        // Create profile with validated role
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
          await supabaseClient.auth.admin.deleteUser(authUser.user.id)
          continue
        }

        results.success++
        console.log(`Successfully imported user: ${userData.email} with role: ${userRole}`)

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
