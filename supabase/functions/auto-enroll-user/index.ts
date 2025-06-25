
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutoEnrollRequest {
  email: string;
  full_name?: string;
  contract_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, contract_id }: AutoEnrollRequest = await req.json();

    console.log("Auto-enrolling user:", email);

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user already exists in profiles table
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking existing profile:', profileError);
      throw new Error('Failed to check existing user: ' + profileError.message);
    }

    if (existingProfile) {
      console.log('User already exists:', email);
      return new Response(JSON.stringify({ 
        success: true, 
        user_id: existingProfile.id,
        message: 'User already exists',
        enrolled: false
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate a temporary password for the new user
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    // Create the user in auth.users using admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || email.split('@')[0],
        auto_enrolled: true,
        enrolled_for_contract: contract_id || null
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw new Error('Failed to create user account: ' + authError.message);
    }

    console.log('Auth user created:', authUser.user?.id);

    // Create profile entry
    const { data: profile, error: profileInsertError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user!.id,
        email: email,
        full_name: full_name || email.split('@')[0],
        role: 'user'
      })
      .select()
      .single();

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);
      // Try to clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user!.id);
      throw new Error('Failed to create user profile: ' + profileInsertError.message);
    }

    console.log('Profile created successfully:', profile.id);

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: authUser.user!.id,
        action_type: 'user_auto_enrolled',
        resource_type: 'user',
        resource_id: authUser.user!.id,
        details: {
          email: email,
          full_name: full_name || email.split('@')[0],
          contract_id: contract_id,
          temp_password: tempPassword // Store for potential future reference
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: authUser.user!.id,
      profile: profile,
      temp_password: tempPassword,
      message: 'User auto-enrolled successfully',
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
