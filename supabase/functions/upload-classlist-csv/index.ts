import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StudentRow {
  name: string;
  studentId: string;
  registrationStatus: string;
  level: string;
  creditHours: number;
  classYear: string;
}

interface CourseInfo {
  title: string;
  term: string;
  crn: string;
  startDate: string;
  endDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin privileges
    const { data: profile } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin, role')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin && !profile?.is_super_admin && !['admin', 'super-admin'].includes(profile?.role || '')) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { csvData, courseId, courseInfo } = await req.json();

    if (!csvData) {
      return new Response(
        JSON.stringify({ error: 'CSV data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the CSV data
    const lines = csvData.trim().split('\n');
    const students: StudentRow[] = [];
    const errors: { row: number; error: string }[] = [];
    
    // Find the header row (contains "Student Name", "ID", etc.)
    let headerRowIndex = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('student name') && line.includes('id')) {
        headerRowIndex = i;
        headers = lines[i].split(',').map(h => h.trim().toLowerCase());
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Try alternate format - simple CSV with headers
      headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      headerRowIndex = 0;
    }

    // Find column indices
    const nameIndex = headers.findIndex(h => h.includes('student name') || h.includes('name'));
    const idIndex = headers.findIndex(h => h === 'id' || h.includes('student id') || h.includes('student_id'));
    const statusIndex = headers.findIndex(h => h.includes('registration status') || h.includes('status'));
    const levelIndex = headers.findIndex(h => h.includes('level'));
    const creditIndex = headers.findIndex(h => h.includes('credit'));
    const classIndex = headers.findIndex(h => h.includes('class') && !h.includes('classlist'));

    console.log('Headers found:', { nameIndex, idIndex, statusIndex, levelIndex, creditIndex, classIndex });

    // Process student rows
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith(',') || line.toLowerCase().includes('enrollment') || line.toLowerCase().includes('wait list')) {
        continue;
      }

      const values = line.split(',').map(v => v.trim().replace(/"/g, '').replace(/\*\*/g, ''));
      
      const name = nameIndex !== -1 ? values[nameIndex] : null;
      const studentId = idIndex !== -1 ? values[idIndex] : null;
      
      if (!name || !studentId || studentId.length < 5) {
        continue;
      }

      students.push({
        name: name,
        studentId: studentId,
        registrationStatus: statusIndex !== -1 ? values[statusIndex] || 'Registered' : 'Registered',
        level: levelIndex !== -1 ? values[levelIndex] || 'Undergraduate' : 'Undergraduate',
        creditHours: creditIndex !== -1 ? parseInt(values[creditIndex]) || 4 : 4,
        classYear: classIndex !== -1 ? values[classIndex] || '' : ''
      });
    }

    console.log(`Found ${students.length} students in CSV`);

    if (students.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No valid student records found in CSV',
          hint: 'Make sure your CSV has columns: Student Name, ID, Registration Status, Level, Credit Hours, Class'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update course info if provided
    if (courseId && courseInfo) {
      const { error: courseError } = await supabaseClient
        .from('gw_courses')
        .update({
          crn: courseInfo.crn,
          start_date: courseInfo.startDate,
          end_date: courseInfo.endDate,
          term: courseInfo.term
        })
        .eq('id', courseId);

      if (courseError) {
        console.error('Course update error:', courseError);
      }
    }

    const enrollmentResults = {
      enrolled: 0,
      updated: 0,
      profilesCreated: 0,
      errors: [] as string[]
    };

    // Process each student
    for (const student of students) {
      try {
        // Look up student by student_id
        let { data: existingProfile } = await supabaseClient
          .from('gw_profiles')
          .select('user_id, full_name')
          .eq('student_id', student.studentId)
          .single();

        let userId: string;

        if (!existingProfile) {
          // Create a placeholder profile for this student
          const { data: newProfile, error: createError } = await supabaseClient
            .from('gw_profiles')
            .insert({
              student_id: student.studentId,
              full_name: student.name,
              academic_year: student.classYear,
              role: 'member',
              status: 'active'
            })
            .select('user_id')
            .single();

          if (createError) {
            // Profile might exist without student_id - try to find by name
            const nameParts = student.name.split(',').map(p => p.trim());
            const lastName = nameParts[0];
            const firstName = nameParts[1]?.split(' ')[0];
            
            const { data: nameMatch } = await supabaseClient
              .from('gw_profiles')
              .select('user_id')
              .ilike('full_name', `%${firstName}%${lastName}%`)
              .limit(1)
              .single();

            if (nameMatch) {
              // Update existing profile with student_id
              await supabaseClient
                .from('gw_profiles')
                .update({ 
                  student_id: student.studentId,
                  academic_year: student.classYear 
                })
                .eq('user_id', nameMatch.user_id);
              
              userId = nameMatch.user_id;
            } else {
              errors.push({ row: students.indexOf(student) + 1, error: `Could not create profile for ${student.name}` });
              continue;
            }
          } else {
            userId = newProfile.user_id;
            enrollmentResults.profilesCreated++;
          }
        } else {
          userId = existingProfile.user_id;
        }

        if (!userId) {
          errors.push({ row: students.indexOf(student) + 1, error: `No user_id for ${student.name}` });
          continue;
        }

        // Check for existing enrollment
        const { data: existingEnrollment } = await supabaseClient
          .from('gw_course_enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', userId)
          .single();

        if (existingEnrollment) {
          // Update existing enrollment
          const { error: updateError } = await supabaseClient
            .from('gw_course_enrollments')
            .update({
              registration_status: student.registrationStatus,
              academic_level: student.level,
              credit_hours: student.creditHours,
              enrollment_status: 'enrolled',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEnrollment.id);

          if (updateError) {
            errors.push({ row: students.indexOf(student) + 1, error: updateError.message });
          } else {
            enrollmentResults.updated++;
          }
        } else {
          // Create new enrollment
          const { error: insertError } = await supabaseClient
            .from('gw_course_enrollments')
            .insert({
              course_id: courseId,
              user_id: userId,
              role: 'student',
              enrollment_status: 'enrolled',
              registration_status: student.registrationStatus,
              academic_level: student.level,
              credit_hours: student.creditHours,
              enrolled_at: new Date().toISOString()
            });

          if (insertError) {
            errors.push({ row: students.indexOf(student) + 1, error: insertError.message });
          } else {
            enrollmentResults.enrolled++;
          }
        }
      } catch (err) {
        errors.push({ row: students.indexOf(student) + 1, error: String(err) });
      }
    }

    console.log('Enrollment results:', enrollmentResults);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${students.length} students: ${enrollmentResults.enrolled} enrolled, ${enrollmentResults.updated} updated, ${enrollmentResults.profilesCreated} profiles created`,
        results: enrollmentResults,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing classlist:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
