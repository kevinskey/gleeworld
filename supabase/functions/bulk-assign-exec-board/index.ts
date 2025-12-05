import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    // CRITICAL SECURITY FIX: Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Authentication required',
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Invalid authentication',
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Check if user has admin privileges
    const { data: profile, error: profileError } = await supabaseClient
      .from('gw_profiles')
      .select('role, is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || (!profile.is_admin && !profile.is_super_admin && !['admin', 'super-admin'].includes(profile.role))) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Admin privileges required',
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Log the admin operation for audit trail
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'bulk_executive_board_assignment',
        resource_type: 'users',
        details: { 
          source: req.headers.get('source') || 'bulk-assign-exec-board',
          assignment_count: Array.isArray(req.body?.assignments) ? req.body.assignments.length : 0 
        }
      })

    const { assignments } = await req.json() as { assignments: AssignmentRequest[] };
    
    console.log('Processing bulk executive board assignments:', assignments);

    const results = [];

    for (const assignment of assignments) {
      try {
        console.log(`Processing assignment for ${assignment.email} -> ${assignment.role}`);

        // First, check if auth user exists
        const { data: allUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
        if (listError) {
          throw new Error(`Failed to list users: ${listError.message}`);
        }

        let authUser = allUsers.users.find(u => u.email === assignment.email);
        
        // If auth user doesn't exist, create them first
        if (!authUser) {
          console.log(`Auth user ${assignment.email} not found, creating new auth user...`);
          
          // Generate secure temporary password
          const tempPassword = crypto.getRandomValues(new Uint8Array(12))
            .reduce((acc, byte) => acc + String.fromCharCode(33 + (byte % 94)), '');
          
          const { data: newUserData, error: createAuthError } = await supabaseClient.auth.admin.createUser({
            email: assignment.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              force_password_change: true,
              temp_password: true,
              full_name: assignment.full_name
            }
          });
          
          if (createAuthError) {
            console.error(`Error creating auth user for ${assignment.email}:`, createAuthError);
            results.push({
              email: assignment.email,
              success: false,
              error: `Failed to create auth user: ${createAuthError.message}`
            });
            continue;
          }
          
          authUser = newUserData.user;
          console.log(`Created new auth user for ${assignment.email} with ID: ${authUser.id}`);
        } else {
          // Generate secure temporary password for existing user
          const tempPassword = crypto.getRandomValues(new Uint8Array(12))
            .reduce((acc, byte) => acc + String.fromCharCode(33 + (byte % 94)), '');
          
          console.log(`Resetting password for existing auth user: ${assignment.email}`);
          const { error: resetError } = await supabaseClient.auth.admin.updateUserById(authUser.id, {
            password: tempPassword,
            user_metadata: {
              force_password_change: true,
              temp_password: true,
              full_name: assignment.full_name
            }
          });
          
          if (resetError) {
            console.warn(`Failed to reset password for ${assignment.email}:`, resetError);
          }
        }

        const userId = authUser.id;

        // Now check if profile exists
        let { data: existingProfile } = await supabaseClient
          .from('gw_profiles')
          .select('user_id, email, full_name')
          .eq('user_id', userId)
          .single();

        if (!existingProfile) {
          console.log(`Profile for ${assignment.email} not found, creating new profile...`);
          
          // Create user profile linked to auth user
          const { data: newProfile, error: createError } = await supabaseClient
            .from('gw_profiles')
            .insert({
              user_id: userId,
              email: assignment.email,
              full_name: assignment.full_name,
              role: 'member',
              exec_board_role: assignment.role,
              is_exec_board: true,
              is_admin: assignment.role === 'president',
              verified: true, // Set as verified since they're being assigned by admin
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
        
        // Map assignment roles to database enum values
        const roleMapping: Record<string, string> = {
          'president': 'president',
          'secretary': 'secretary', 
          'treasurer': 'treasurer',
          'tour_manager': 'tour_manager',
          'wardrobe_manager': 'wardrobe_manager',
          'librarian': 'librarian',
          'historian': 'historian',
          'pr_coordinator': 'pr_coordinator',
          'chaplain': 'chaplain',
          'data_analyst': 'data_analyst',
          'assistant_chaplain': 'assistant_chaplain',
          'student_conductor': 'student_conductor',
          'section_leader_s1': 'section_leader_s1',
          'section_leader_s2': 'section_leader_s2',
          'section_leader_a1': 'section_leader_a1',
          'section_leader_a2': 'section_leader_a2'
        };
        
        const dbRoleName = roleMapping[assignment.role] || assignment.role.replace(/-/g, '_');
        
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
          user_id: userId,
          password_reset_required: true
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