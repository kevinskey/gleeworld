import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Fetch all submissions for this assignment
    const { data: submissions, error: fetchError } = await supabase
      .from('assignment_submissions')
      .select('id, content, text, student_id')
      .eq('assignment_id', assignmentId)
      .in('status', ['submitted', 'ai_graded', 'flagged']);

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

    // Grade submissions sequentially to avoid rate limits
    for (const submission of submissions) {
      try {
        // Call the grade-submission-ai function
        const { data: gradeData, error: gradeError } = await supabase.functions.invoke(
          'grade-submission-ai',
          { body: { submissionId: submission.id } }
        );

        if (gradeError) {
          console.error(`Failed to grade submission ${submission.id}:`, gradeError);
          results.failed++;
          results.errors.push(`Submission ${submission.id}: ${gradeError.message}`);
        } else if (gradeData?.error) {
          console.error(`AI grading error for ${submission.id}:`, gradeData.error);
          results.failed++;
          results.errors.push(`Submission ${submission.id}: ${gradeData.error}`);
        } else {
          results.success++;
          console.log(`Successfully graded submission ${submission.id}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error grading submission ${submission.id}:`, error);
        results.failed++;
        results.errors.push(`Submission ${submission.id}: ${error.message}`);
      }
    }

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
