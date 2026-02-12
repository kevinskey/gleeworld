import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assignmentId } = await req.json();
    
    if (!assignmentId) {
      throw new Error('Assignment ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check assignment type from gw_course_assignments first
    const { data: courseAssignment } = await supabase
      .from('gw_course_assignments')
      .select('id, title, assignment_type')
      .eq('id', assignmentId)
      .maybeSingle();

    // Also check gw_assignments for legacy MUS240 journals
    const { data: gwAssignment } = await supabase
      .from('gw_assignments')
      .select('legacy_source, legacy_id, assignment_type, title')
      .eq('id', assignmentId)
      .maybeSingle();

    const isMus240Journal = gwAssignment?.legacy_source === 'mus240_assignments' || gwAssignment?.assignment_type === 'listening_journal';
    
    let submissions: any[] = [];
    let fetchError: any = null;
    let submissionTable = '';

    if (isMus240Journal) {
      // Get legacy ID for MUS240 journals
      let legacyIdToUse = gwAssignment?.legacy_id;
      if (gwAssignment?.legacy_source !== 'mus240_assignments') {
        const match = (gwAssignment?.title || '').match(/Listening\s*Journal\s*(\d+)/i);
        if (match?.[1]) {
          legacyIdToUse = `lj${match[1]}`;
        }
      }

      const { data, error } = await supabase
        .from('mus240_journal_entries')
        .select('id, student_id')
        .eq('assignment_id', legacyIdToUse)
        .eq('is_published', true);
      
      submissions = data || [];
      fetchError = error;
      submissionTable = 'mus240_journal_entries';
    } else {
      // Try gw_course_submissions first (essay submissions)
      const { data: courseSubmissions, error: courseError } = await supabase
        .from('gw_course_submissions')
        .select('id, student_id')
        .eq('assignment_id', assignmentId)
        .in('status', ['submitted', 'ai_graded', 'flagged', 'pending']);
      
      if (courseSubmissions && courseSubmissions.length > 0) {
        submissions = courseSubmissions;
        fetchError = courseError;
        submissionTable = 'gw_course_submissions';
      } else {
        // Try gw_assignment_submissions (recording/video submissions)
        const { data: assignmentSubmissions, error: assignmentError } = await supabase
          .from('gw_assignment_submissions')
          .select('id, user_id')
          .eq('assignment_id', assignmentId)
          .in('status', ['submitted', 'ai_graded', 'flagged', 'pending']);
        
        submissions = assignmentSubmissions || [];
        fetchError = assignmentError;
        submissionTable = 'gw_assignment_submissions';

        // If still empty, also check the legacy assignment_submissions table
        if (submissions.length === 0) {
          const { data: legacySubmissions, error: legacyError } = await supabase
            .from('assignment_submissions')
            .select('id, student_id')
            .eq('assignment_id', assignmentId)
            .in('status', ['submitted', 'ai_graded', 'flagged']);
          
          submissions = legacySubmissions || [];
          fetchError = legacyError;
          submissionTable = 'assignment_submissions';
        }
      }
    }

    if (fetchError) throw fetchError;

    console.log(`Found ${submissions.length} submissions in ${submissionTable} for assignment ${assignmentId}`);

    if (!submissions || submissions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No submissions to grade', gradedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Grading ${submissions.length} submissions for assignment ${assignmentId}`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process submissions in parallel batches
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
      const batch = submissions.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(submissions.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} submissions)`);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (submission) => {
          try {
            let gradeData: any;
            let gradeError: any;

            if (isMus240Journal) {
              const result = await supabase.functions.invoke(
                'grade-mus240-journal',
                { body: { journalId: submission.id } }
              );
              gradeData = result.data;
              gradeError = result.error;
            } else {
              // Pass submissionTable so the grading function knows where to look
              const result = await supabase.functions.invoke(
                'grade-submission-ai',
                { body: { submissionId: submission.id, submissionTable } }
              );
              gradeData = result.data;
              gradeError = result.error;
            }

            if (gradeError) {
              throw new Error(gradeError.message || 'Grading function error');
            } else if (gradeData?.error) {
              throw new Error(gradeData.error);
            }
            
            return { success: true, id: submission.id };
          } catch (error) {
            return { 
              success: false, 
              id: submission.id, 
              error: error.message 
            };
          }
        })
      );

      batchResults.forEach((result, index) => {
        const submission = batch[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          results.success++;
          console.log(`✓ Successfully graded submission ${submission.id}`);
        } else {
          results.failed++;
          const errorMsg = result.status === 'fulfilled' 
            ? result.value.error 
            : result.reason?.message || 'Unknown error';
          results.errors.push(`Submission ${submission.id}: ${errorMsg}`);
          console.error(`✗ Failed to grade ${submission.id}:`, errorMsg);
        }
      });

      // Small delay between batches
      if (i + BATCH_SIZE < submissions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Grading complete: ${results.success} succeeded, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        gradedCount: results.success,
        failedCount: results.failed,
        totalSubmissions: submissions.length,
        errors: results.errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk grading error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
