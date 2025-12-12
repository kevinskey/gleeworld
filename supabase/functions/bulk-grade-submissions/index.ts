import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Check if this is a MUS240 journal assignment
    const { data: assignment } = await supabase
      .from('gw_assignments')
      .select('legacy_source, legacy_id, assignment_type, title')
      .eq('id', assignmentId)
      .single();

    const isMus240Journal = assignment?.legacy_source === 'mus240_assignments' || assignment?.assignment_type === 'listening_journal';
    
    let submissions: any[] = [];
    let fetchError: any = null;

    if (isMus240Journal) {
      // Get legacy ID for MUS240 journals
      let legacyIdToUse = assignment?.legacy_id;
      if (assignment?.legacy_source !== 'mus240_assignments') {
        // Derive from title like "Listening Journal 1" -> "lj1"
        const match = (assignment?.title || '').match(/Listening\s*Journal\s*(\d+)/i);
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
    } else {
      // Standard assignment submissions
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('id, student_id')
        .eq('assignment_id', assignmentId)
        .in('status', ['submitted', 'ai_graded', 'flagged']);
      
      submissions = data || [];
      fetchError = error;
    }

    if (fetchError) throw fetchError;

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

    // Process submissions in parallel batches to speed up grading
    const BATCH_SIZE = 5; // Process 5 submissions at a time
    
    for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
      const batch = submissions.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(submissions.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} submissions)`);
      
      // Process all submissions in this batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (submission) => {
          try {
            let gradeData: any;
            let gradeError: any;

            if (isMus240Journal) {
              // Call the MUS240 journal grading function
              const result = await supabase.functions.invoke(
                'grade-mus240-journal',
                { body: { journalId: submission.id } }
              );
              gradeData = result.data;
              gradeError = result.error;
            } else {
              // Call the standard assignment grading function
              const result = await supabase.functions.invoke(
                'grade-submission-ai',
                { body: { submissionId: submission.id } }
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

      // Process results from this batch
      batchResults.forEach((result, index) => {
        const submission = batch[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          results.success++;
          console.log(`✓ Successfully graded ${isMus240Journal ? 'journal' : 'submission'} ${submission.id}`);
        } else {
          results.failed++;
          const errorMsg = result.status === 'fulfilled' 
            ? result.value.error 
            : result.reason?.message || 'Unknown error';
          results.errors.push(`${isMus240Journal ? 'Journal' : 'Submission'} ${submission.id}: ${errorMsg}`);
          console.error(`✗ Failed to grade ${submission.id}:`, errorMsg);
        }
      });

      // Small delay between batches to avoid overwhelming the system
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
