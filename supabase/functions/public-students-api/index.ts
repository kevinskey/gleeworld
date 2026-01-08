import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  secret: string;
}

interface StudentRecord {
  id: string;
  email: string;
  full_name: string;
  class?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`[PUBLIC-STUDENTS-API] Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[PUBLIC-STUDENTS-API] Function started');

    // Parse request body
    const body: RequestBody = await req.json();
    console.log('[PUBLIC-STUDENTS-API] Request received', { hasSecret: !!body.secret });

    // Validate secret
    const webhookSecret = Deno.env.get('GLEEWORLD_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[PUBLIC-STUDENTS-API] GLEEWORLD_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.secret || body.secret !== webhookSecret) {
      console.error('[PUBLIC-STUDENTS-API] Invalid secret provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PUBLIC-STUDENTS-API] Secret validated successfully');

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query enrolled students with their course info
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('gw_course_enrollments')
      .select(`
        user_id,
        student_profile_id,
        enrollment_status,
        gw_courses (
          course_code,
          title
        )
      `)
      .eq('enrollment_status', 'enrolled')
      .eq('role', 'student');

    if (enrollmentError) {
      console.error('[PUBLIC-STUDENTS-API] Error fetching enrollments:', enrollmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch enrollments', details: enrollmentError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs to fetch profiles
    const userIds = [...new Set(enrollments?.filter(e => e.user_id).map(e => e.user_id) || [])];
    const studentProfileIds = [...new Set(enrollments?.filter(e => e.student_profile_id).map(e => e.student_profile_id) || [])];

    // Fetch user profiles
    let profiles: Record<string, { email: string; full_name: string }> = {};
    
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('gw_profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);
      
      profileData?.forEach(p => {
        profiles[p.user_id] = { email: p.email || '', full_name: p.full_name || '' };
      });
    }

    // Fetch external student profiles if any
    let studentProfiles: Record<string, { email: string; full_name: string }> = {};
    
    if (studentProfileIds.length > 0) {
      const { data: studentProfileData } = await supabase
        .from('gw_student_profiles')
        .select('id, email, full_name')
        .in('id', studentProfileIds);
      
      studentProfileData?.forEach(p => {
        studentProfiles[p.id] = { email: p.email || '', full_name: p.full_name || '' };
      });
    }

    // Build the response with expected format
    const students: StudentRecord[] = enrollments?.map(enrollment => {
      const course = enrollment.gw_courses as { course_code: string; title: string } | null;
      let studentInfo = { email: '', full_name: '' };
      let id = '';
      
      if (enrollment.user_id && profiles[enrollment.user_id]) {
        studentInfo = profiles[enrollment.user_id];
        id = enrollment.user_id;
      } else if (enrollment.student_profile_id && studentProfiles[enrollment.student_profile_id]) {
        studentInfo = studentProfiles[enrollment.student_profile_id];
        id = enrollment.student_profile_id;
      }

      return {
        id,
        email: studentInfo.email,
        full_name: studentInfo.full_name,
        class: course?.course_code || course?.title || undefined
      };
    }).filter(s => s.email && s.id) || [];

    console.log(`[PUBLIC-STUDENTS-API] Returning ${students.length} enrolled students`);

    return new Response(
      JSON.stringify({ students }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PUBLIC-STUDENTS-API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
