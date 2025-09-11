
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AutoEnrollRequest {
  email: string;
  full_name?: string;
  contract_id?: string;
  role?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL SECURITY FIX: Verify admin authorization for auto-enrollment
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: Authentication required",
          success: false,
          enrolled: false 
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the requesting user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: Invalid authentication",
          success: false,
          enrolled: false 
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user has admin privileges using gw_profiles
    const { data: adminProfile, error: profileError } = await supabase
      .from("gw_profiles")
      .select("is_admin, is_super_admin, role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !adminProfile || (!adminProfile.is_admin && !adminProfile.is_super_admin && adminProfile.role !== 'admin' && adminProfile.role !== 'super-admin')) {
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: Admin privileges required",
          success: false,
          enrolled: false 
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { email, full_name, contract_id, role }: AutoEnrollRequest = await req.json();

    console.log("Admin", user.id, "auto-enrolling user:", email);

    // Log the admin operation for audit trail
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'admin_auto_enroll_attempt',
        resource_type: 'user_creation',
        details: { 
          target_email: email,
          full_name: full_name,
          contract_id: contract_id,
          role: role
        }
      });

    // Check if user already exists in gw_profiles table
    const { data: existingProfile, error: checkProfileError } = await supabase
      .from('gw_profiles')
      .select('user_id, email')
      .eq('email', email)
      .maybeSingle();

    if (checkProfileError) {
      console.error('Error checking existing profile:', checkProfileError);
      throw new Error('Failed to check existing user: ' + checkProfileError.message);
    }

    if (existingProfile) {
      console.log('User already exists:', email);
      return new Response(JSON.stringify({ 
        success: true, 
        user_id: existingProfile.user_id,
        message: 'User already exists',
        enrolled: false
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Creating/ensuring auth user for email:', email);
    
    // Prefer direct createUser with a secure temp password to avoid email invite dependency
    let targetUserId: string | null = null;
    let createdNewAuthUser = false;
    let tempPassword: string | null = null;

    const generateTempPassword = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const chars = Array.from(bytes).map((b) => String.fromCharCode(33 + (b % 94))).join('');
      // Ensure reasonable strength
      return 'Glee' + chars.slice(0, 10) + (Math.floor(Math.random() * 10)).toString();
    };

    tempPassword = generateTempPassword();
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split('@')[0], auto_enrolled: true, enrolled_for_contract: contract_id || null }
    });

    if (createErr) {
      console.warn('createUser error, will attempt to find existing user:', createErr);
      // If the user already exists, find them by paging
      let page = 1;
      const perPage = 1000;
      let found: any = null;
      while (page <= 20 && !found) {
        const { data: listData, error: listErr } = await (supabase as any).auth.admin.listUsers({ page, perPage });
        if (listErr) {
          console.error('Error listing users (page ' + page + '):', listErr);
          break;
        }
        const users = listData?.users || [];
        found = users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!users.length) break;
        page++;
      }
      if (!found) {
        throw new Error('Failed to create or locate user account: ' + createErr.message);
      }
      targetUserId = found.id;
      tempPassword = null; // Do not return a password if user already existed
      console.log('Located existing auth user for email:', email, 'id:', targetUserId);
    } else {
      targetUserId = created.user!.id;
      createdNewAuthUser = true;
      console.log('Auth user created via createUser:', targetUserId);
    }

    // Create or update profile entry in gw_profiles (idempotent)
    const defaultRole = (role && ['member','fan','alumna','auditioner','admin','super-admin'].includes(role)) ? role : (role || 'member');
    const { data: profile, error: profileUpsertError } = await supabase
      .from('gw_profiles')
      .upsert({
        user_id: targetUserId!,
        email: email,
        full_name: full_name || email.split('@')[0],
        role: defaultRole
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (profileUpsertError) {
      console.error('Error upserting profile:', profileUpsertError);
      // Try to clean up the auth user only if we just created it here
      if (createdNewAuthUser && targetUserId) {
        try {
          await supabase.auth.admin.deleteUser(targetUserId);
        } catch (cleanupErr) {
          console.warn('Cleanup failed deleting auth user:', cleanupErr);
        }
      }
      throw new Error('Failed to create user profile: ' + profileUpsertError.message);
    }

    console.log('Profile ensured successfully for user_id:', targetUserId);

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: targetUserId!,
        action_type: 'user_auto_enrolled',
        resource_type: 'user',
        resource_id: targetUserId!,
        details: {
          email: email,
          full_name: full_name || email.split('@')[0],
          contract_id: contract_id,
          role: defaultRole,
          method: createdNewAuthUser ? 'created_with_password' : 'linked_existing_auth_user'
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: targetUserId!,
      profile: profile,
      message: createdNewAuthUser ? 'User created with temporary password' : 'Existing user linked; profile ensured',
      temp_password: tempPassword || undefined,
      enrolled: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in auto-enroll-user:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
