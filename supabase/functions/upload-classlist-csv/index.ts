import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

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

    const { csvData, fileBase64, fileName, courseId, courseInfo } = await req.json();

    const hasCsv = typeof csvData === 'string' && csvData.trim().length > 0;
    const hasFile = typeof fileBase64 === 'string' && fileBase64.trim().length > 0;

    if (!hasCsv && !hasFile) {
      return new Response(
        JSON.stringify({ error: 'CSV data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let effectiveCsvData = hasCsv ? String(csvData) : '';

    if (!hasCsv && hasFile) {
      try {
        const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetName = workbook.SheetNames?.[0];

        if (!sheetName) {
          return new Response(
            JSON.stringify({ error: 'Excel file contained no sheets', hint: 'Export as CSV from Banner/Excel and try again.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const worksheet = workbook.Sheets[sheetName];
        // Convert to CSV; keep commas (we parse commas/semicolons/tabs below)
        effectiveCsvData = XLSX.utils.sheet_to_csv(worksheet, { FS: ',', RS: '\n' });
      } catch (e) {
        console.error('Failed to parse Excel file:', e);
        return new Response(
          JSON.stringify({
            error: 'Unable to read Excel file',
            hint: 'Please export the classlist as CSV (not XLS) or try downloading the CSV template and re-upload.',
            debug: { fileName },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Parse the CSV/TSV data (handles Banner-style exports with control chars)
    const normalized = String(effectiveCsvData)
      .replace(/\u0000/g, '')
      .replace(/^\uFEFF/, '') // strip BOM
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // remove most non-printable characters but keep tabs/newlines
      .replace(/[^\x09\x0A\x20-\x7E]/g, '');

    const lines = normalized
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const students: StudentRow[] = [];
    const errors: { row: number; error: string }[] = [];

    type Delimiter = ',' | '\t' | ';';

    const parseDelimitedLine = (line: string, delimiter: Delimiter): string[] => {
      // Quote-aware parser for CSV/semicolon; tabs are treated as plain separators.
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (delimiter !== '\t' && ch === '"') {
          // Toggle quotes; supports escaped quotes ""
          const next = line[i + 1];
          if (inQuotes && next === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (!inQuotes && ch === delimiter) {
          out.push(cur.trim().replace(/\*\*/g, ''));
          cur = '';
          continue;
        }

        cur += ch;
      }

      out.push(cur.trim().replace(/\*\*/g, ''));
      return out;
    };

    const detectDelimiter = (line: string): Delimiter => {
      const candidates: Delimiter[] = ['\t', ',', ';'];
      let best: Delimiter = ',';
      let bestCols = 0;

      for (const d of candidates) {
        const cols = parseDelimitedLine(line, d).length;
        if (cols > bestCols) {
          bestCols = cols;
          best = d;
        }
      }

      return best;
    };

    // Find the header row (flexible: Banner exports vary)
    let headerRowIndex = -1;
    let headers: string[] = [];
    let delimiter: Delimiter = ',';

    for (let i = 0; i < lines.length; i++) {
      const d = detectDelimiter(lines[i]);
      const cols = parseDelimitedLine(lines[i], d).map((h) => h.toLowerCase().trim());

      const hasName = cols.some((h) => h === 'student name' || h.includes('student name') || h === 'name' || h.includes('full name'));
      const hasId = cols.some((h) => h === 'id' || h === 'id#' || h === 'sid' || h.includes('student id') || h.includes('banner id') || h.includes('spelman id') || h.endsWith(' id'));

      if (hasName && hasId) {
        headerRowIndex = i;
        delimiter = d;
        headers = cols;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Fallback: assume first row is headers
      headerRowIndex = 0;
      delimiter = detectDelimiter(lines[0] ?? '');
      headers = parseDelimitedLine(lines[0] ?? '', delimiter).map((h) => h.toLowerCase().trim());
    }

    // Find column indices - flexible matching
    const nameIndex = headers.findIndex((h) =>
      h.includes('student name') || h.includes('student_name') || h === 'name' || h.includes('full name') || h.includes('full_name')
    );
    const idIndex = headers.findIndex((h) =>
      h === 'id' || h === 'id#' || h === 'sid' || h.includes('student id') || h.includes('student_id') ||
      h.includes('banner id') || h.includes('banner_id') || h.includes('spelman id') || h.includes('student number')
    );
    const statusIndex = headers.findIndex((h) =>
      h.includes('registration status') || h.includes('registration_status') ||
      h.includes('reg status') || h === 'status'
    );
    const levelIndex = headers.findIndex((h) => h.includes('level') || h === 'class level' || h === 'academic level');
    const creditIndex = headers.findIndex((h) => h.includes('credit') || h.includes('hours') || h === 'cr hrs');
    const classIndex = headers.findIndex((h) =>
      (h.includes('class') && !h.includes('classlist') && !h.includes('class level')) ||
      h === 'year' || h.includes('class year')
    );

    const delimiterLabel = delimiter === '\t' ? 'TAB' : delimiter === ';' ? 'SEMICOLON' : 'COMMA';
    console.log('Detected delimiter:', delimiterLabel);
    console.log('Raw headers:', headers);
    console.log('Headers found:', { nameIndex, idIndex, statusIndex, levelIndex, creditIndex, classIndex });

    // Process student rows
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const lower = line.toLowerCase();

      if (!line || line.startsWith(delimiter) || lower.includes('enrollment') || lower.includes('wait list')) {
        continue;
      }

      const values = parseDelimitedLine(line, delimiter);

      const name = nameIndex !== -1 ? values[nameIndex] : null;
      const studentId = idIndex !== -1 ? values[idIndex] : null;

      if (!name || !studentId || studentId.length < 5) {
        continue;
      }

      students.push({
        name,
        studentId,
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
          hint: 'Make sure your CSV has columns: Student Name, ID, Registration Status, Level, Credit Hours, Class',
          debug: {
            delimiter: delimiterLabel,
            headerRowIndex,
            headers,
            indices: { nameIndex, idIndex, statusIndex, levelIndex, creditIndex, classIndex },
            sampleLines: lines.slice(0, Math.min(5, lines.length)),
          },
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
      skipped: 0,
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
              role: 'student',
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
          // Skip duplicate - student already enrolled
          enrollmentResults.skipped++;
          continue;
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
        message: `Processed ${students.length} students: ${enrollmentResults.enrolled} enrolled, ${enrollmentResults.skipped} skipped (already enrolled), ${enrollmentResults.profilesCreated} profiles created`,
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
