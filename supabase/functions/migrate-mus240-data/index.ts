import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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

    // Step 2: Fetch all MUS240 assignments
    const { data: mus240Assignments, error: assignmentsError } = await supabase
      .from('mus240_assignments')
      .select('*')
      .order('due_date');

    if (assignmentsError) throw assignmentsError;

    console.log(`Found ${mus240Assignments.length} MUS240 assignments`);

    const assignmentMap: Record<string, string> = {}; // old_id -> new_id

    // Step 3: Migrate assignments to gw_assignments
    for (const assignment of mus240Assignments) {
      const { data: existingAssignment } = await supabase
        .from('gw_assignments')
        .select('id')
        .eq('course_id', courseId)
        .eq('legacy_source', 'mus240')
        .eq('legacy_id', assignment.id)
        .maybeSingle();

      if (existingAssignment) {
        assignmentMap[assignment.id] = existingAssignment.id;
        console.log(`Assignment already migrated: ${assignment.title}`);
      } else {
        if (!dry_run) {
          const { data: newAssignment, error: insertError } = await supabase
            .from('gw_assignments')
            .insert({
              course_id: courseId,
              legacy_source: 'mus240',
              legacy_id: assignment.id,
              title: assignment.title,
              description: assignment.description,
              assignment_type: assignment.assignment_type || 'listening_journal',
              category: 'writing',
              points: assignment.points || 100,
              due_at: assignment.due_date,
              is_active: assignment.is_active ?? true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          assignmentMap[assignment.id] = newAssignment.id;
          console.log(`Migrated assignment: ${assignment.title}`);
        } else {
          assignmentMap[assignment.id] = `DRY-RUN-${assignment.id}`;
          console.log(`[DRY RUN] Would migrate assignment: ${assignment.title}`);
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
