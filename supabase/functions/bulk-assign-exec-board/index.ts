import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AssignmentRequest {
  email: string;
  full_name: string;
  role: string;
  is_admin?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { assignments } = await req.json() as { assignments: AssignmentRequest[] };
    
    console.log('Processing bulk executive board assignments:', assignments);

    const results = [];

    for (const assignment of assignments) {
      try {
        console.log(`Processing assignment for ${assignment.email} -> ${assignment.role}`);

        // First, check if user exists in gw_profiles
        let { data: existingProfile } = await supabaseClient
          .from('gw_profiles')
          .select('user_id, email, full_name')
          .eq('email', assignment.email)
          .single();

        let userId = existingProfile?.user_id;

        // If user doesn't exist, create them
        if (!existingProfile) {
          console.log(`User ${assignment.email} not found, creating new user...`);
          
          // Create user profile
          const { data: newProfile, error: createError } = await supabaseClient
            .from('gw_profiles')
            .insert({
              email: assignment.email,
              full_name: assignment.full_name,
              role: 'member',
              exec_board_role: assignment.role,
              is_exec_board: true,
              is_admin: assignment.is_admin || false,
              verified: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('user_id')
            .single();

          if (createError) {
            console.error(`Error creating profile for ${assignment.email}:`, createError);
            results.push({
              email: assignment.email,
              success: false,
              error: `Failed to create profile: ${createError.message}`
            });
            continue;
          }

          userId = newProfile.user_id;
          console.log(`Created new profile for ${assignment.email} with user_id: ${userId}`);
        } else {
          // Update existing profile
          const updateData: any = {
            exec_board_role: assignment.role,
            is_exec_board: true,
            updated_at: new Date().toISOString()
          };

          // President gets admin privileges
          if (assignment.role === 'president') {
            updateData.is_admin = true;
          }

          const { error: updateError } = await supabaseClient
            .from('gw_profiles')
            .update(updateData)
            .eq('user_id', userId);

          if (updateError) {
            console.error(`Error updating profile for ${assignment.email}:`, updateError);
            results.push({
              email: assignment.email,
              success: false,
              error: `Failed to update profile: ${updateError.message}`
            });
            continue;
          }

          console.log(`Updated existing profile for ${assignment.email}`);
        }

        // Convert role name to match database enum (replace dashes with underscores)
        const validEnumRoles = [
          'president', 'secretary', 'treasurer', 'tour_manager', 'wardrobe_manager', 
          'librarian', 'historian', 'pr_coordinator', 'chaplain', 'data_analyst', 
          'assistant_chaplain', 'student_conductor', 'section_leader_s1', 'section_leader_s2', 
          'section_leader_a1', 'section_leader_a2'
        ];
        
        const dbRoleName = assignment.role.replace(/-/g, '_');
        
        // Add/update in gw_executive_board_members table only if role exists in enum
        if (validEnumRoles.includes(dbRoleName)) {
          const { error: boardMemberError } = await supabaseClient
            .from('gw_executive_board_members')
            .upsert({
              user_id: userId,
              position: dbRoleName as any,
              is_active: true,
              academic_year: new Date().getFullYear().toString(),
              appointed_date: new Date().toISOString().split('T')[0],
            });

          if (boardMemberError) {
            console.warn(`Board member table update failed for ${assignment.email}:`, boardMemberError);
          } else {
            console.log(`Added ${assignment.email} to gw_executive_board_members as ${dbRoleName}`);
          }
        } else {
          console.warn(`Role ${assignment.role} (${dbRoleName}) not found in database enum, skipping board member table update`);
        }

        results.push({
          email: assignment.email,
          success: true,
          role: assignment.role,
          user_id: userId
        });

        console.log(`Successfully assigned ${assignment.role} to ${assignment.email}`);

      } catch (error) {
        console.error(`Error processing assignment for ${assignment.email}:`, error);
        results.push({
          email: assignment.email,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: assignments.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in bulk assignment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})