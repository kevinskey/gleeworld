import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactData {
  Email: string;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  GraduationYear?: string;
  VoicePart?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using admin client
    const { data: profile } = await supabaseAdmin
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
      console.log('Access denied for user:', user.id, 'Profile:', profile);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { contacts } = await req.json() as { contacts: ContactData[] };

    const results = {
      created: [] as string[],
      updated: [] as string[],
      errors: [] as { email: string; error: string }[],
    };

    for (const contact of contacts) {
      try {
        if (!contact.Email) {
          results.errors.push({ email: 'unknown', error: 'Email is required' });
          continue;
        }

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser?.users?.find(u => u.email === contact.Email);

        let userId: string;

        if (userExists) {
          userId = userExists.id;
          results.updated.push(contact.Email);
        } else {
          // Create auth user with temporary password
          const tempPassword = crypto.randomUUID();
          const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: contact.Email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: contact.FullName || `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
              first_name: contact.FirstName,
              last_name: contact.LastName,
            },
          });

          if (authError || !newUser.user) {
            results.errors.push({ email: contact.Email, error: authError?.message || 'Failed to create user' });
            continue;
          }

          userId = newUser.user.id;
          results.created.push(contact.Email);
        }

        // Create or update profile
        const { error: profileError } = await supabaseAdmin
          .from('gw_profiles')
          .upsert({
            id: userId,
            email: contact.Email,
            full_name: contact.FullName || `${contact.FirstName || ''} ${contact.LastName || ''}`.trim(),
            role: 'alumna',
            voice_part: contact.VoicePart,
            graduation_year: contact.GraduationYear,
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile error for', contact.Email, profileError);
        }

        // Assign alumna role in user_roles table
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'alumna',
            assigned_by: user.id,
          }, { onConflict: 'user_id,role' });

        if (roleError) {
          console.error('Role assignment error for', contact.Email, roleError);
        }

      } catch (error: any) {
        results.errors.push({ 
          email: contact.Email, 
          error: error.message || 'Unknown error' 
        });
      }
    }

    console.log('Alumna users creation results:', results);

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating alumna users:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
