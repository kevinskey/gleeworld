import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
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

    const { userId, email, newPassword } = await req.json()

    if (!userId || !email || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, email, newPassword' }),
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

    // First, get the auth user ID from the profile - userId might be profile ID or auth user ID
    let authUserId = userId;
    
    // Check if this is a profile ID by looking it up in gw_profiles
    const { data: profileData } = await supabaseClient
      .from('gw_profiles')
      .select('user_id')
      .eq('id', userId)
      .single()
    
    // If we found a profile record, use the user_id field (which is the auth user ID)
    if (profileData?.user_id) {
      authUserId = profileData.user_id;
    }

    // Use Supabase Admin API to update the user's password
    const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
      authUserId,
      { password: newPassword }
    )

    if (updateError) {
      // If the auth user was not found, try to reconcile automatically
      const notFound = (updateError as any)?.status === 404 || (updateError as any)?.code === 'user_not_found'
      if (notFound) {
        console.error('Target auth user not found. Attempting reconciliation via email/profile linkage...', { email, providedUserId: userId, resolvedAuthUserId: authUserId })

        // Try to find an auth user by email by creating the account if missing
        const { data: created, error: createErr } = await supabaseClient.auth.admin.createUser({
          email,
          password: newPassword,
          email_confirm: true,
        })

        if (createErr) {
          console.error('Failed to create missing auth user:', createErr)
          return new Response(
            JSON.stringify({ error: `Failed to create or update user: ${createErr.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Best-effort: link gw_profiles.user_id to the newly created auth user
        if (created?.user?.id) {
          try {
            // If the incoming userId looked like a profile id, update that row; otherwise, update by email
            const profileUpdate = await supabaseClient
              .from('gw_profiles')
              .update({ user_id: created.user.id })
              .or(`id.eq.${userId},email.eq.${email}`)

            if (profileUpdate.error) {
              console.warn('Profile linkage warning (non-fatal):', profileUpdate.error)
            }
          } catch (e) {
            console.warn('Profile linkage threw (non-fatal):', e)
          }
        }

        // Log the admin action
        await supabaseClient
          .from('gw_security_audit_log')
          .insert({
            user_id: user.id,
            action_type: 'admin_password_reset_create_user',
            resource_type: 'user_account',
            resource_id: created?.user?.id ?? null,
            details: { target_email: email, reset_by_admin: user.email, reconciled: true }
          })

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `User was missing. Created auth user and set password for ${email}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.error('Error updating password:', updateError)
      return new Response(
        JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the admin action
    await supabaseClient
      .from('gw_security_audit_log')
      .insert({
        user_id: user.id,
        action_type: 'admin_password_reset',
        resource_type: 'user_account',
        resource_id: userId,
        details: {
          target_email: email,
          reset_by_admin: user.email
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password updated successfully for ${email}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-reset-password function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})