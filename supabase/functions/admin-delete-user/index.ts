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

    // Check if user is admin or super admin
    const { data: profile } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin, email')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin && !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, userEmail, confirmText } = await req.json()

    if (!userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, userEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify confirmation text matches
    const expectedText = `DELETE ${userEmail}`
    if (confirmText !== expectedText) {
      return new Response(
        JSON.stringify({ error: 'Confirmation text does not match. Please type exactly: ' + expectedText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent deletion of other super admins
    const { data: targetProfile } = await supabaseClient
      .from('gw_profiles')
      .select('is_super_admin, email')
      .eq('user_id', userId)
      .single()

    if (targetProfile?.is_super_admin && !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can delete other super admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the deletion attempt before starting
    await supabaseClient
      .from('gw_security_audit_log')
      .insert({
        user_id: user.id,
        action_type: 'admin_user_deletion_attempt',
        resource_type: 'user_account',
        resource_id: userId,
        details: {
          target_email: userEmail,
          deleted_by_admin: profile.email,
          timestamp: new Date().toISOString()
        }
      })

    // Step 1: Delete/cleanup related data first (in order of dependencies)
    console.log('Starting user deletion process for:', userEmail)

    // Delete user module permissions
    await supabaseClient
      .from('gw_user_module_permissions')
      .delete()
      .eq('user_id', userId)

    // Delete username permissions
    await supabaseClient
      .from('username_permissions')
      .delete()
      .eq('user_email', userEmail)

    // Delete executive board memberships
    await supabaseClient
      .from('gw_executive_board_members')
      .delete()
      .eq('user_id', userId)

    // Delete user preferences
    await supabaseClient
      .from('user_preferences')
      .delete()
      .eq('user_id', userId)

    // Delete notification preferences
    await supabaseClient
      .from('gw_notification_preferences')
      .delete()
      .eq('user_id', userId)

    // Delete user module orders
    await supabaseClient
      .from('gw_user_module_orders')
      .delete()
      .eq('user_id', userId)

    // Delete payment records (mark as deleted rather than hard delete)
    await supabaseClient
      .from('payments')
      .update({ notes: 'User account deleted', updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    // Delete contract assignments
    await supabaseClient
      .from('contract_user_assignments')
      .delete()
      .eq('user_id', userId)

    await supabaseClient
      .from('singer_contract_assignments')
      .delete()
      .eq('singer_id', userId)

    // Delete attendance records (keep for historical purposes but anonymize)
    await supabaseClient
      .from('gw_attendance')
      .update({ 
        notes: 'User deleted',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    // Step 2: Delete the profile record
    const { error: profileError } = await supabaseClient
      .from('gw_profiles')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      throw new Error(`Failed to delete user profile: ${profileError.message}`)
    }

    // Step 3: Delete the auth user (this must be last)
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`)
    }

    // Log successful deletion
    await supabaseClient
      .from('gw_security_audit_log')
      .insert({
        user_id: user.id,
        action_type: 'admin_user_deletion_success',
        resource_type: 'user_account',
        resource_id: userId,
        details: {
          target_email: userEmail,
          deleted_by_admin: profile.email,
          deletion_completed_at: new Date().toISOString()
        }
      })

    console.log('User deletion completed successfully for:', userEmail)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${userEmail} has been permanently deleted` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-delete-user function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error during user deletion' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
