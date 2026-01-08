import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = req.headers.get("X-Webhook-Secret");
  const expected = Deno.env.get("GLEEWORLD_WEBHOOK_SECRET");

  if (!expected) {
    console.error("[PUBLIC-STUDENTS-API] GLEEWORLD_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "API not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (secret !== expected) {
    console.error("[PUBLIC-STUDENTS-API] Invalid secret provided");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[PUBLIC-STUDENTS-API] Secret validated, fetching students");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch enrolled students with their course info
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("gw_course_enrollments")
    .select(`
      user_id,
      student_profile_id,
      gw_courses (
        course_code,
        title
      )
    `)
    .eq("enrollment_status", "enrolled")
    .eq("role", "student");

  if (enrollmentError) {
    console.error("[PUBLIC-STUDENTS-API] Error fetching enrollments:", enrollmentError);
    return new Response(JSON.stringify({ error: enrollmentError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get unique user IDs to fetch profiles
  const userIds = [...new Set(enrollments?.filter(e => e.user_id).map(e => e.user_id) || [])];
  const studentProfileIds = [...new Set(enrollments?.filter(e => e.student_profile_id).map(e => e.student_profile_id) || [])];

  // Fetch user profiles
  let profiles: Record<string, { email: string; full_name: string }> = {};
  
  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from("gw_profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);
    
    profileData?.forEach(p => {
      profiles[p.user_id] = { email: p.email || "", full_name: p.full_name || "" };
    });
  }

  // Fetch external student profiles if any
  let studentProfiles: Record<string, { email: string; full_name: string }> = {};
  
  if (studentProfileIds.length > 0) {
    const { data: studentProfileData } = await supabase
      .from("gw_student_profiles")
      .select("id, email, full_name")
      .in("id", studentProfileIds);
    
    studentProfileData?.forEach(p => {
      studentProfiles[p.id] = { email: p.email || "", full_name: p.full_name || "" };
    });
  }

  // Build the response
  const students = enrollments?.map(enrollment => {
    const course = enrollment.gw_courses as { course_code: string; title: string } | null;
    let studentInfo = { email: "", full_name: "" };
    
    if (enrollment.user_id && profiles[enrollment.user_id]) {
      studentInfo = profiles[enrollment.user_id];
    } else if (enrollment.student_profile_id && studentProfiles[enrollment.student_profile_id]) {
      studentInfo = studentProfiles[enrollment.student_profile_id];
    }

    return {
      email: studentInfo.email,
      fullName: studentInfo.full_name,
      class: course?.course_code || course?.title || null
    };
  }).filter(s => s.email) || [];

  console.log(`[PUBLIC-STUDENTS-API] Returning ${students.length} enrolled students`);

  return new Response(
    JSON.stringify({ students }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
