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

  // Parse query parameters for course filter
  const url = new URL(req.url);
  const courseCode = url.searchParams.get("courseCode") || url.searchParams.get("course");
  
  console.log(`[PUBLIC-STUDENTS-API] Course filter: ${courseCode || 'all'}`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Build enrollment query
  let enrollmentQuery = supabase
    .from("gw_course_enrollments")
    .select(`
      user_id,
      student_profile_id,
      course_id,
      gw_courses (
        id,
        course_code,
        title
      )
    `)
    .eq("enrollment_status", "enrolled")
    .eq("role", "student");

  const { data: enrollments, error: enrollmentError } = await enrollmentQuery;

  if (enrollmentError) {
    console.error("[PUBLIC-STUDENTS-API] Error fetching enrollments:", enrollmentError);
    return new Response(JSON.stringify({ error: enrollmentError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter by course code if provided
  let filteredEnrollments = enrollments || [];
  if (courseCode) {
    const normalizedCode = courseCode.replace(/[\s-]/g, '').toLowerCase();
    filteredEnrollments = filteredEnrollments.filter(e => {
      const course = e.gw_courses as { course_code: string; title: string } | null;
      if (!course) return false;
      const code = (course.course_code || '').replace(/[\s-]/g, '').toLowerCase();
      const title = (course.title || '').toLowerCase();
      return code.includes(normalizedCode) || normalizedCode.includes(code) || 
             title.includes(normalizedCode);
    });
    console.log(`[PUBLIC-STUDENTS-API] Filtered to ${filteredEnrollments.length} enrollments for course ${courseCode}`);
  }

  // Get unique user IDs and student profile IDs
  const userIds = [...new Set(filteredEnrollments.filter(e => e.user_id).map(e => e.user_id))];
  const studentProfileIds = [...new Set(filteredEnrollments.filter(e => e.student_profile_id).map(e => e.student_profile_id))];

  console.log(`[PUBLIC-STUDENTS-API] Found ${userIds.length} user_ids, ${studentProfileIds.length} student_profile_ids`);

  // Fetch gw_profiles
  let profiles: Record<string, { email: string; full_name: string; student_id: string | null }> = {};
  
  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from("gw_profiles")
      .select("user_id, email, full_name, student_id")
      .in("user_id", userIds);
    
    profileData?.forEach(p => {
      profiles[p.user_id] = { 
        email: p.email || "", 
        full_name: p.full_name || "",
        student_id: p.student_id || null
      };
    });
  }

  // Fetch gw_student_profiles
  let studentProfiles: Record<string, { email: string; full_name: string; student_id: string | null }> = {};
  
  if (studentProfileIds.length > 0) {
    const { data: studentProfileData } = await supabase
      .from("gw_student_profiles")
      .select("id, email, full_name, student_id")
      .in("id", studentProfileIds);
    
    studentProfileData?.forEach(p => {
      studentProfiles[p.id] = { 
        email: p.email || "", 
        full_name: p.full_name || "",
        student_id: p.student_id || null
      };
    });
  }

  // Build the response - include students even without email if they have a name
  const students = filteredEnrollments.map(enrollment => {
    const course = enrollment.gw_courses as { course_code: string; title: string } | null;
    let studentInfo = { email: "", full_name: "", student_id: null as string | null };
    
    if (enrollment.user_id && profiles[enrollment.user_id]) {
      studentInfo = profiles[enrollment.user_id];
    } else if (enrollment.student_profile_id && studentProfiles[enrollment.student_profile_id]) {
      studentInfo = studentProfiles[enrollment.student_profile_id];
    }

    return {
      email: studentInfo.email,
      fullName: studentInfo.full_name,
      studentId: studentInfo.student_id,
      courseCode: course?.course_code || null,
      class: course?.course_code || course?.title || null
    };
  }).filter(s => s.email || s.fullName); // Include if has email OR name

  console.log(`[PUBLIC-STUDENTS-API] Returning ${students.length} enrolled students`);

  return new Response(
    JSON.stringify({ 
      students,
      count: students.length,
      courseFilter: courseCode || null
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
