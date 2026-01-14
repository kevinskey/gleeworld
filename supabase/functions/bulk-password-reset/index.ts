import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkPasswordResetRequest {
  newPassword: string;
  semester?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is from an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is an admin
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("app_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (rolesError) {
      console.error("Failed to check roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = roles?.some(r => r.role === "super_admin" || r.role === "admin");
    if (!isAdmin) {
      console.error("User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { newPassword, semester = "Spring 2026" }: BulkPasswordResetRequest = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting bulk password reset for MUS 240 students (${semester})`);

    // Get all enrolled MUS 240 students for the semester
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from("mus240_enrollments")
      .select("student_id")
      .eq("semester", semester)
      .eq("enrollment_status", "enrolled");

    if (enrollError) {
      console.error("Failed to fetch enrollments:", enrollError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch enrolled students" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No enrolled students found for this semester",
          updated: 0,
          failed: 0,
          details: []
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${enrollments.length} enrolled students`);

    // Get student details
    const studentIds = enrollments.map(e => e.student_id);
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("gw_profiles")
      .select("user_id, full_name, email")
      .in("user_id", studentIds);

    if (profilesError) {
      console.error("Failed to fetch profiles:", profilesError);
    }

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Update passwords for each student
    const results: { email: string; name: string; success: boolean; error?: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const enrollment of enrollments) {
      const profile = profileMap.get(enrollment.student_id);
      const email = profile?.email || "unknown";
      const name = profile?.full_name || "Unknown Student";

      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          enrollment.student_id,
          { password: newPassword }
        );

        if (updateError) {
          console.error(`Failed to update password for ${email}:`, updateError);
          results.push({ email, name, success: false, error: updateError.message });
          failCount++;
        } else {
          console.log(`Successfully updated password for ${email}`);
          results.push({ email, name, success: true });
          successCount++;
        }
      } catch (err) {
        console.error(`Exception updating password for ${email}:`, err);
        results.push({ email, name, success: false, error: String(err) });
        failCount++;
      }
    }

    console.log(`Bulk password reset complete: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password reset complete for ${successCount} students`,
        updated: successCount,
        failed: failCount,
        details: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in bulk-password-reset:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
