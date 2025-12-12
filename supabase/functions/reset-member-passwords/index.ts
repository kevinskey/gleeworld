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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin && !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { targetRole, newPassword, batchLimit } = await req.json()

    if (!targetRole || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: targetRole, newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get users with the target role
    let query = supabaseClient
      .from('gw_profiles')
      .select('user_id, email, full_name')
      .eq('role', targetRole)

    if (batchLimit && batchLimit > 0) {
      query = query.limit(batchLimit)
    }

    const { data: targetUsers, error: fetchError } = await query

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch users: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!targetUsers || targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: `No users found with role: ${targetRole}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Update passwords for each user
    for (const targetUser of targetUsers) {
      try {
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          targetUser.user_id,
          { password: newPassword }
        )

        if (updateError) {
          console.error(`Failed to update password for ${targetUser.email}:`, updateError)
          errors.push(`${targetUser.email}: ${updateError.message}`)
          failedCount++
        } else {
          successCount++
        }
      } catch (error) {
        console.error(`Error updating ${targetUser.email}:`, error)
        errors.push(`${targetUser.email}: ${error.message}`)
        failedCount++
      }
    }

    // Log the bulk admin action
    await supabaseClient
      .from('gw_security_audit_log')
      .insert({
        user_id: user.id,
        action_type: 'bulk_password_reset',
        resource_type: 'user_accounts',
        details: {
          target_role: targetRole,
          users_targeted: targetUsers.length,
          successful_resets: successCount,
          failed_resets: failedCount,
          reset_by_admin: user.email,
          batch_limit: batchLimit || null
        }
      })

    return new Response(
      JSON.stringify({ 
        success: successCount,
        failed: failedCount,
        total: targetUsers.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Password reset complete: ${successCount} successful, ${failedCount} failed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in reset-member-passwords function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})