import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationRequest {
  course_code?: string;
  semester?: string;
  dry_run?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { course_code = 'MUS240', semester = 'Fall 2024', dry_run = false } = 
      await req.json() as MigrationRequest;

    console.log(`Starting MUS240 data migration (dry_run: ${dry_run})...`);

    // Step 1: Create or find the course in gw_courses
    let courseId: string;
    const { data: existingCourse } = await supabase
      .from('gw_courses')
      .select('id')
      .eq('code', course_code)
      .eq('term', semester)
      .maybeSingle();

    if (existingCourse) {
      courseId = existingCourse.id;
      console.log(`Found existing course: ${courseId}`);
    } else {
      if (!dry_run) {
        const { data: newCourse, error: courseError } = await supabase
          .from('gw_courses')
          .insert({
            code: course_code,
            title: 'Introduction to African American Music',
            description: 'A comprehensive study of African American music from traditional African roots to contemporary hip-hop.',
            term: semester,
          })
          .select()
          .single();

        if (courseError) throw courseError;
        courseId = newCourse.id;
        console.log(`Created new course: ${courseId}`);
      } else {
        courseId = 'DRY-RUN-COURSE-ID';
        console.log(`[DRY RUN] Would create new course`);
      }
    }

    // Step 2: Fetch all unique assignment IDs from journal entries
    const { data: usedAssignmentIds, error: usedIdsError } = await supabase
      .from('mus240_journal_entries')
      .select('assignment_id')
      .eq('is_published', true);

    if (usedIdsError) throw usedIdsError;

    const uniqueAssignmentIds = [...new Set(usedAssignmentIds.map(j => j.assignment_id))];
    console.log(`Found ${uniqueAssignmentIds.length} unique assignment IDs in journal entries`);

    // Fetch all MUS240 assignments
    const { data: mus240Assignments, error: assignmentsError } = await supabase
      .from('mus240_assignments')
      .select('*')
      .order('due_date');

    if (assignmentsError) throw assignmentsError;

    // Fetch assignment code mappings (lj1, lj2, etc -> UUID)
    const { data: assignmentCodes, error: codesError } = await supabase
      .from('mus240_assignment_codes')
      .select('code, assignment_id');

    if (codesError) throw codesError;

    // Create maps
    const codeToUuid: Record<string, string> = {};
    const uuidToCode: Record<string, string> = {};
    assignmentCodes?.forEach(ac => {
      codeToUuid[ac.code] = ac.assignment_id;
      uuidToCode[ac.assignment_id] = ac.code;
    });

    const uuidToAssignment: Record<string, any> = {};
    mus240Assignments.forEach(a => {
      uuidToAssignment[a.id] = a;
    });

    console.log(`Found ${mus240Assignments.length} MUS240 assignments`);

    const assignmentMap: Record<string, string> = {}; // old code/UUID -> new_id

    // Step 3: Migrate all assignments that have journal entries
    for (const assignmentId of uniqueAssignmentIds) {
      let assignment;
      let legacyId = assignmentId;
      let title = '';
      
      // Check if it's a UUID or a code
      if (assignmentId.startsWith('lj')) {
        // It's a code like "lj4"
        const uuid = codeToUuid[assignmentId];
        assignment = uuid ? uuidToAssignment[uuid] : null;
        title = assignment?.title || `Listening Journal ${assignmentId.replace('lj', '')}`;
      } else {
        // It's a UUID
        assignment = uuidToAssignment[assignmentId];
        const code = uuidToCode[assignmentId];
        if (code) legacyId = code;
        title = assignment?.title || 'Unknown Assignment';
      }
      
      const { data: existingAssignment } = await supabase
        .from('gw_assignments')
        .select('id')
        .eq('course_id', courseId)
        .eq('legacy_source', 'mus240')
        .eq('legacy_id', legacyId)
        .maybeSingle();

      if (existingAssignment) {
        assignmentMap[assignmentId] = existingAssignment.id;
        console.log(`Assignment already migrated: ${title} (${legacyId})`);
      } else {
        if (!dry_run) {
          const { data: newAssignment, error: insertError } = await supabase
            .from('gw_assignments')
            .insert({
              course_id: courseId,
              legacy_source: 'mus240',
              legacy_id: legacyId,
              title: title,
              description: assignment?.description || `Listening journal assignment for MUS240`,
              assignment_type: assignment?.assignment_type || 'listening_journal',
              category: 'writing',
              points: assignment?.points || 100,
              due_at: assignment?.due_date || null,
              is_active: assignment?.is_active ?? true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          assignmentMap[assignmentId] = newAssignment.id;
          console.log(`Migrated assignment: ${title} (${legacyId})`);
        } else {
          assignmentMap[assignmentId] = `DRY-RUN-${assignmentId}`;
          console.log(`[DRY RUN] Would migrate assignment: ${title} (${legacyId})`);
        }
      }
    }

    // Step 4: Fetch all journal entries (published submissions only)
    const { data: journalEntries, error: journalsError } = await supabase
      .from('mus240_journal_entries')
      .select('*')
      .eq('is_published', true)
      .order('submitted_at');

    if (journalsError) throw journalsError;

    console.log(`Found ${journalEntries.length} published journal entries`);

    let migratedSubmissions = 0;
    let skippedSubmissions = 0;

    // Step 5: Migrate journal entries to assignment_submissions (WITHOUT AI grades)
    for (const entry of journalEntries) {
      const newAssignmentId = assignmentMap[entry.assignment_id];
      
      if (!newAssignmentId) {
        console.log(`Skipping entry: no assignment mapping for ${entry.assignment_id}`);
        skippedSubmissions++;
        continue;
      }

      // Check if submission already exists
      const { data: existingSubmission } = await supabase
        .from('assignment_submissions')
        .select('id')
        .eq('student_id', entry.student_id)
        .eq('assignment_id', newAssignmentId)
        .maybeSingle();

      if (existingSubmission) {
        console.log(`Submission already exists for student ${entry.student_id}`);
        skippedSubmissions++;
        continue;
      }

      if (!dry_run) {
        // Create a text file with the journal content
        const fileName = `journal_${entry.id}.txt`;
        const fileContent = entry.content || '';
        
        // Store the content as feedback for now (we'll use file_url if needed later)
        const { error: submissionError } = await supabase
          .from('assignment_submissions')
          .insert({
            student_id: entry.student_id,
            assignment_id: newAssignmentId,
            submission_date: entry.submitted_at || entry.created_at,
            submitted_at: entry.submitted_at || entry.created_at,
            status: 'submitted', // NOT graded
            file_name: fileName,
            feedback: fileContent, // Store content in feedback field temporarily
            // NO grade, NO graded_at - ready for fresh AI grading
          });

        if (submissionError) {
          console.error(`Error migrating submission: ${submissionError.message}`);
          skippedSubmissions++;
        } else {
          migratedSubmissions++;
        }
      } else {
        console.log(`[DRY RUN] Would migrate submission for student ${entry.student_id}`);
        migratedSubmissions++;
      }
    }

    // Step 6: Fetch peer comments data for reporting
    const { data: commentsData, error: commentsError } = await supabase
      .from('mus240_journal_comments')
      .select('id, journal_id, commenter_id, content')
      .order('created_at');

    if (commentsError) throw commentsError;

    const report = {
      success: true,
      dry_run,
      course_id: courseId,
      course_code,
      semester,
      stats: {
        assignments_migrated: Object.keys(assignmentMap).length,
        submissions_migrated: migratedSubmissions,
        submissions_skipped: skippedSubmissions,
        peer_comments_preserved: commentsData.length,
      },
      note: 'All AI grades have been removed. Submissions are ready for fresh AI grading when you are ready.',
    };

    console.log('Migration complete:', report);

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
