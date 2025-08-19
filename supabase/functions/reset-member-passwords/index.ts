import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body to get password and optional role filter
    const { newPassword = 'Spelman', targetRole = 'member' } = await req.json();

    console.log(`Starting password reset for role: ${targetRole}`);

    // Get all user IDs with the target role from gw_profiles table
    const { data: profiles, error } = await supabase
      .from('gw_profiles')
      .select('user_id, email, full_name')
      .eq('role', targetRole);

    if (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users found with role:', targetRole);
      return new Response(
        JSON.stringify({
          success: true,
          message: `No users found with role: ${targetRole}`,
          resetCount: 0,
          failedCount: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found ${profiles.length} users. Resetting passwords...`);

    // Reset each user's password via Admin API
    let successCount = 0;
    let failedCount = 0;
    const results = [];

    for (const profile of profiles) {
      try {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          profile.user_id, 
          { password: newPassword }
        );

        if (updateError) {
          failedCount++;
          const errorMsg = `Failed to reset password for ${profile.email}: ${updateError.message}`;
          console.error(errorMsg);
          results.push({
            user_id: profile.user_id,
            email: profile.email,
            success: false,
            error: updateError.message
          });
        } else {
          successCount++;
          console.log(`Successfully reset password for: ${profile.email}`);
          results.push({
            user_id: profile.user_id,
            email: profile.email,
            success: true
          });
        }
      } catch (e: any) {
        failedCount++;
        const errorMsg = `Exception resetting password for ${profile.email}: ${e?.message ?? e}`;
        console.error(errorMsg);
        results.push({
          user_id: profile.user_id,
          email: profile.email,
          success: false,
          error: e?.message ?? 'Unknown error'
        });
      }
    }

    console.log(`Password reset complete. Success: ${successCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password reset complete for role: ${targetRole}`,
        resetCount: successCount,
        failedCount: failedCount,
        totalUsers: profiles.length,
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in reset-member-passwords function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});