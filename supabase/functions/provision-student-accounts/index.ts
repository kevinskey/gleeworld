import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StudentData {
  email: string;
  full_name: string;
  enrollment_id: string;
  student_profile_id: string;
}

interface ProvisionRequest {
  students: StudentData[];
  default_password?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { students, default_password = "GleeWorld2026!" }: ProvisionRequest = await req.json();

    if (!students || !Array.isArray(students)) {
      throw new Error("Students array is required");
    }

    const results: { email: string; success: boolean; error?: string; user_id?: string }[] = [];

    for (const student of students) {
      try {
        // Create the user account
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: student.email,
          password: default_password,
          email_confirm: true, // Auto-confirm so they can login immediately
          user_metadata: {
            full_name: student.full_name,
            student_profile_id: student.student_profile_id
          }
        });

        if (createError) {
          // If user already exists, try to get their ID
          if (createError.message.includes("already been registered")) {
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === student.email);
            
            if (existingUser) {
              // Link the existing user to the enrollment
              await supabaseAdmin
                .from("gw_course_enrollments")
                .update({ user_id: existingUser.id })
                .eq("id", student.enrollment_id);

              results.push({ 
                email: student.email, 
                success: true, 
                user_id: existingUser.id,
                error: "Already registered - linked to enrollment"
              });
            } else {
              results.push({ email: student.email, success: false, error: createError.message });
            }
            continue;
          }
          
          results.push({ email: student.email, success: false, error: createError.message });
          continue;
        }

        if (userData?.user) {
          // Link the new user to their enrollment
          await supabaseAdmin
            .from("gw_course_enrollments")
            .update({ user_id: userData.user.id })
            .eq("id", student.enrollment_id);

          // Create their gw_profiles entry
          await supabaseAdmin
            .from("gw_profiles")
            .upsert({
              user_id: userData.user.id,
              full_name: student.full_name,
              email: student.email,
              role: "student"
            }, { onConflict: "user_id" });

          results.push({ 
            email: student.email, 
            success: true, 
            user_id: userData.user.id 
          });
        }
      } catch (err) {
        results.push({ 
          email: student.email, 
          success: false, 
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        message: `Provisioned ${successCount} accounts, ${failedCount} failed`,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error provisioning accounts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
