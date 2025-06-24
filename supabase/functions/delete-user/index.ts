
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create client with the user's JWT token to maintain auth context
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          authorization: authHeader,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Deleting user:', userId);

    // Create admin client to get user information before deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user information before deletion
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Get user auth information
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authUserError) {
      console.error('Error fetching auth user:', authUserError);
    }

    const userEmail = userProfile?.email || authUser.user?.email;
    const userName = userProfile?.full_name || userEmail;

    // First delete all user data using our database function
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('delete_user_and_data', { target_user_id: userId });

    if (deleteError) {
      console.error('Error deleting user data:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Then delete from auth.users table
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting user from auth:', authDeleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user from auth: ${authDeleteError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User deleted successfully:', userId);

    // Send notification email to the user if we have their email
    if (userEmail) {
      console.log('Sending deletion notification to:', userEmail);
      
      try {
        // Here you could add email sending logic if needed
        // For now, we'll just log that we would send an email
        console.log(`Would send deletion notification to ${userName} (${userEmail})`);
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the deletion if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        deletedUser: {
          email: userEmail,
          name: userName
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
