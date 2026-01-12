import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GLEEWORLD_API_URL = "https://readmusic.gleeworld.org/api/students";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[FETCH-STUDENTS-GLEEWORLD] Starting student sync from readmusic.gleeworld.org');

  try {
    const webhookSecret = Deno.env.get('GLEEWORLD_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[FETCH-STUDENTS-GLEEWORLD] Missing GLEEWORLD_WEBHOOK_SECRET');
      return new Response(
        JSON.stringify({ error: 'Missing webhook secret configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for optional course filter
    let courseCode: string | undefined;
    try {
      const body = await req.json();
      courseCode = body.courseCode;
      console.log(`[FETCH-STUDENTS-GLEEWORLD] Course filter: ${courseCode || 'all courses'}`);
    } catch {
      // No body or invalid JSON, fetch all students
    }

    // Fetch students from GleeWorld API
    const apiUrl = courseCode 
      ? `${GLEEWORLD_API_URL}?courseCode=${encodeURIComponent(courseCode)}`
      : GLEEWORLD_API_URL;

    console.log(`[FETCH-STUDENTS-GLEEWORLD] Fetching from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${webhookSecret}`,
        'Content-Type': 'application/json',
        'X-Source': 'gleeworld-org',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FETCH-STUDENTS-GLEEWORLD] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch students from GleeWorld', 
          details: errorText,
          status: response.status 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const students = data.students || data.data || data || [];
    
    console.log(`[FETCH-STUDENTS-GLEEWORLD] Received ${students.length} students from API`);

    if (!Array.isArray(students) || students.length === 0) {
      console.log('[FETCH-STUDENTS-GLEEWORLD] No students to sync');
      return new Response(
        JSON.stringify({ message: 'No students found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      created: 0,
      updated: 0,
      enrolled: 0,
      errors: [] as string[],
    };

    // Find or create course if courseCode provided
    let courseId: string | null = null;
    if (courseCode) {
      const { data: course } = await supabase
        .from('gw_courses')
        .select('id')
        .or(`course_code.eq.${courseCode},course_number.eq.${courseCode}`)
        .limit(1)
        .maybeSingle();
      
      courseId = course?.id || null;
      console.log(`[FETCH-STUDENTS-GLEEWORLD] Course ID for ${courseCode}: ${courseId || 'not found'}`);
    }

    // Process each student
    for (const student of students) {
      try {
        const email = student.email?.toLowerCase()?.trim();
        const fullName = student.fullName || student.full_name || student.name || '';
        const studentId = student.studentId || student.student_id || null;
        const studentCourse = student.courseCode || student.course_code || courseCode;

        if (!email && !fullName) {
          console.log('[FETCH-STUDENTS-GLEEWORLD] Skipping student with no email or name');
          continue;
        }

        console.log(`[FETCH-STUDENTS-GLEEWORLD] Processing: ${fullName} (${email})`);

        // Parse name
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Check if student exists in gw_profiles (by email or student ID)
        let existingProfile = null;
        
        if (email) {
          const { data: profileByEmail } = await supabase
            .from('gw_profiles')
            .select('user_id, id')
            .ilike('email', email)
            .maybeSingle();
          existingProfile = profileByEmail;
        }
        
        if (!existingProfile && studentId) {
          const { data: profileById } = await supabase
            .from('gw_profiles')
            .select('user_id, id')
            .eq('student_id', studentId)
            .maybeSingle();
          existingProfile = profileById;
        }

        let userId: string | null = existingProfile?.user_id || null;
        let studentProfileId: string | null = null;

        if (!existingProfile) {
          // Check gw_student_profiles (for non-member students)
          let existingStudentProfile = null;
          
          if (email) {
            const { data: spByEmail } = await supabase
              .from('gw_student_profiles')
              .select('id, user_id')
              .ilike('email', email)
              .maybeSingle();
            existingStudentProfile = spByEmail;
          }
          
          if (!existingStudentProfile && studentId) {
            const { data: spById } = await supabase
              .from('gw_student_profiles')
              .select('id, user_id')
              .eq('student_id', studentId)
              .maybeSingle();
            existingStudentProfile = spById;
          }

          if (existingStudentProfile) {
            console.log(`[FETCH-STUDENTS-GLEEWORLD] Found existing student profile: ${existingStudentProfile.id}`);
            studentProfileId = existingStudentProfile.id;
            userId = existingStudentProfile.user_id;
            
            // Update the profile
            await supabase
              .from('gw_student_profiles')
              .update({
                full_name: fullName,
                first_name: firstName,
                last_name: lastName,
                student_id: studentId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingStudentProfile.id);
            results.updated++;
          } else {
            // Create new student profile
            console.log(`[FETCH-STUDENTS-GLEEWORLD] Creating new student profile for: ${fullName}`);
            const { data: newProfile, error: createError } = await supabase
              .from('gw_student_profiles')
              .insert({
                full_name: fullName,
                first_name: firstName,
                last_name: lastName,
                email: email,
                student_id: studentId,
                status: 'active',
              })
              .select('id')
              .single();

            if (createError) {
              console.error(`[FETCH-STUDENTS-GLEEWORLD] Error creating profile: ${createError.message}`);
              results.errors.push(`Failed to create profile for ${fullName}: ${createError.message}`);
              continue;
            }

            studentProfileId = newProfile.id;
            results.created++;
          }
        } else {
          console.log(`[FETCH-STUDENTS-GLEEWORLD] Found existing gw_profile: ${existingProfile.id}`);
          userId = existingProfile.user_id;
          results.updated++;
        }

        // Enroll student in course if courseId exists
        if (courseId && (userId || studentProfileId)) {
          // Check if already enrolled
          const enrollmentQuery = supabase
            .from('gw_course_enrollments')
            .select('id')
            .eq('course_id', courseId);
          
          if (userId) {
            enrollmentQuery.eq('user_id', userId);
          } else if (studentProfileId) {
            enrollmentQuery.eq('student_profile_id', studentProfileId);
          }

          const { data: existingEnrollment } = await enrollmentQuery.maybeSingle();

          if (!existingEnrollment) {
            const { error: enrollError } = await supabase
              .from('gw_course_enrollments')
              .insert({
                course_id: courseId,
                user_id: userId,
                student_profile_id: studentProfileId,
                role: 'student',
                enrollment_status: 'enrolled',
                enrolled_at: new Date().toISOString(),
              });

            if (enrollError) {
              console.error(`[FETCH-STUDENTS-GLEEWORLD] Enrollment error: ${enrollError.message}`);
              results.errors.push(`Failed to enroll ${fullName}: ${enrollError.message}`);
            } else {
              console.log(`[FETCH-STUDENTS-GLEEWORLD] Enrolled ${fullName} in course`);
              results.enrolled++;
            }
          } else {
            console.log(`[FETCH-STUDENTS-GLEEWORLD] ${fullName} already enrolled`);
          }
        }
      } catch (studentError) {
        console.error(`[FETCH-STUDENTS-GLEEWORLD] Error processing student:`, studentError);
        results.errors.push(`Error processing student: ${studentError.message}`);
      }
    }

    console.log(`[FETCH-STUDENTS-GLEEWORLD] Sync complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Student sync completed',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[FETCH-STUDENTS-GLEEWORLD] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
