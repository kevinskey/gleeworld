import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * INSTRUCTOR GRADE APPROVAL
 * 
 * Converts AI draft grades into final, published grades.
 * Instructor is the FINAL AUTHORITY - all feedback appears as instructor-authored.
 * Students NEVER see AI mentions, confidence scores, or detection flags.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      draftId,
      instructorId,
      // Allow instructor modifications
      modifiedScores,        // Optional: override AI scores
      modifiedFeedback,      // Optional: override AI feedback
      instructorComment,     // Final instructor comment
      publish               // Whether to publish immediately
    } = await req.json();

    console.log('[approve-ai-grade] Processing approval for draft:', draftId);

    if (!draftId || !instructorId) {
      throw new Error('Missing required fields: draftId, instructorId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify instructor has proper role
    const { data: instructor, error: instructorError } = await supabase
      .from('gw_profiles')
      .select('role, full_name')
      .eq('user_id', instructorId)
      .single();

    if (instructorError || !instructor) {
      throw new Error('Instructor not found');
    }

    if (!['admin', 'super-admin', 'instructor'].includes(instructor.role)) {
      throw new Error('Only instructors can approve grades');
    }

    // Fetch the AI draft
    const { data: draft, error: draftError } = await supabase
      .from('gw_ai_draft_grades')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      throw new Error('Draft grade not found');
    }

    // Use instructor modifications or AI defaults
    const finalScores = modifiedScores || draft.ai_criteria_scores;
    const finalFeedback = modifiedFeedback || draft.ai_overall_feedback;
    
    // Recalculate totals if scores were modified
    let totalScore = draft.ai_total_score;
    let maxScore = draft.ai_max_score;
    let percentage = draft.ai_percentage;

    if (modifiedScores) {
      totalScore = modifiedScores.reduce(
        (sum: number, c: { points_earned: number }) => sum + c.points_earned, 
        0
      );
      maxScore = modifiedScores.reduce(
        (sum: number, c: { max_points: number }) => sum + c.max_points, 
        0
      );
      percentage = (totalScore / maxScore) * 100;
    }

    const letterGrade = percentage >= 97 ? 'A+' :
                       percentage >= 93 ? 'A' :
                       percentage >= 90 ? 'A-' :
                       percentage >= 87 ? 'B+' :
                       percentage >= 83 ? 'B' :
                       percentage >= 80 ? 'B-' :
                       percentage >= 77 ? 'C+' :
                       percentage >= 73 ? 'C' :
                       percentage >= 70 ? 'C-' :
                       percentage >= 67 ? 'D+' :
                       percentage >= 63 ? 'D' :
                       percentage >= 60 ? 'D-' : 'F';

    // Create the final grade (student-visible, NO AI references)
    const { data: finalGrade, error: finalError } = await supabase
      .from('gw_final_grades')
      .upsert({
        submission_id: draft.submission_id,
        assignment_id: draft.assignment_id,
        course_id: draft.course_id,
        student_id: draft.student_id,
        ai_draft_id: draft.id,
        total_score: totalScore,
        max_score: maxScore,
        percentage: Math.round(percentage * 10) / 10,
        letter_grade: letterGrade,
        criteria_scores: finalScores,
        overall_feedback: finalFeedback,
        instructor_comment: instructorComment,
        graded_by: instructorId,
        graded_at: new Date().toISOString(),
        is_published: publish === true,
        published_at: publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'submission_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (finalError) {
      console.error('[approve-ai-grade] Error creating final grade:', finalError);
      throw finalError;
    }

    // Mark the draft as approved
    const { error: updateError } = await supabase
      .from('gw_ai_draft_grades')
      .update({
        status: 'approved',
        instructor_reviewed_at: new Date().toISOString(),
        instructor_id: instructorId,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (updateError) {
      console.error('[approve-ai-grade] Error updating draft status:', updateError);
    }

    console.log('[approve-ai-grade] Final grade created:', finalGrade.id, 'Published:', publish);

    // ── LTI grade passback ─────────────────────────────────────────────
    // If this student arrived through a Canvas LTI launch we push the
    // score back to Canvas's gradebook so the LMS stays the source of
    // record for the instructor. Best-effort: failures here are logged
    // but never break the GleeWorld grade publish itself.
    const ltiPushResults: Array<{ ok: boolean; platform: string; context?: string; detail?: string }> = [];
    if (publish === true) {
      try {
        const courseTenantId = (await supabase
          .from('gw_courses')
          .select('tenant_id')
          .eq('id', draft.course_id)
          .maybeSingle()).data?.tenant_id;

        // Strategy:
        //   1. PREFERRED — find lti_context_links rows that are explicitly
        //      bound to this gw_course (gw_course_id = draft.course_id),
        //      then look up which of the student's user_links touch those
        //      contexts via lti_user_contexts. This is the proper match
        //      for multi-Canvas-course students.
        //   2. FALLBACK — student has launched at least once but no
        //      explicit binding exists yet; use their lti_user_links.
        //      last_context_id (works fine for single-course tenants).

        type Push = { userLinkId: string; contextLinkId: string; platformId: string; via: 'bound' | 'last' };
        const targets: Push[] = [];

        // ── Strategy 1: explicit course binding ─────────────────────────
        const { data: boundCtx } = await supabase
          .from('lti_context_links')
          .select('id, platform_id, lti_platforms!inner(tenant_id)')
          .eq('gw_course_id', draft.course_id);
        // deno-lint-ignore no-explicit-any
        for (const ctx of (boundCtx ?? []) as any[]) {
          if (courseTenantId && ctx.lti_platforms.tenant_id !== courseTenantId) continue;
          // Find user_link rows for this student on this platform.
          const { data: ulinks } = await supabase
            .from('lti_user_links')
            .select('id')
            .eq('user_id', draft.student_id)
            .eq('platform_id', ctx.platform_id);
          // deno-lint-ignore no-explicit-any
          for (const ul of (ulinks ?? []) as any[]) {
            // Confirm the student has actually launched from this context.
            const { data: hit } = await supabase
              .from('lti_user_contexts')
              .select('id')
              .eq('user_link_id', ul.id)
              .eq('context_link_id', ctx.id)
              .maybeSingle();
            if (hit) targets.push({ userLinkId: ul.id, contextLinkId: ctx.id, platformId: ctx.platform_id, via: 'bound' });
          }
        }

        // ── Strategy 2: fallback to last_context_id ─────────────────────
        if (targets.length === 0) {
          const { data: links } = await supabase
            .from('lti_user_links')
            .select('id, platform_id, last_context_id, lti_platforms!inner(tenant_id)')
            .eq('user_id', draft.student_id);
          // deno-lint-ignore no-explicit-any
          for (const link of (links ?? []) as any[]) {
            if (courseTenantId && link.lti_platforms.tenant_id !== courseTenantId) continue;
            if (!link.last_context_id) continue;
            const { data: ctx } = await supabase
              .from('lti_context_links')
              .select('id')
              .eq('platform_id', link.platform_id)
              .eq('context_id', link.last_context_id)
              .maybeSingle();
            if (ctx) targets.push({ userLinkId: link.id, contextLinkId: ctx.id, platformId: link.platform_id, via: 'last' });
          }
        }

        for (const t of targets) {
          const pushRes = await fetch(`${supabaseUrl}/functions/v1/lti-grade-push`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lti_user_link_id: t.userLinkId,
              context_link_id: t.contextLinkId,
              resource_type: 'assignment',
              resource_id: draft.assignment_id,
              score: totalScore,
              score_maximum: maxScore,
              comment: instructorComment || finalFeedback || undefined,
              label: `GleeWorld assignment ${String(draft.assignment_id).slice(0, 8)}`,
            }),
          });
          if (pushRes.ok) {
            ltiPushResults.push({ ok: true, platform: t.platformId, context: t.contextLinkId });
          } else {
            const txt = await pushRes.text().catch(() => '');
            console.warn('[approve-ai-grade] lti-grade-push failed:', pushRes.status, txt.slice(0, 200));
            ltiPushResults.push({ ok: false, platform: t.platformId, context: t.contextLinkId, detail: `${pushRes.status}: ${txt.slice(0, 120)}` });
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[approve-ai-grade] LTI passback skipped:', msg);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: publish
          ? 'Grade approved and published to student'
          : 'Grade approved - pending publication',
        finalGradeId: finalGrade.id,
        isPublished: publish === true,
        ltiPushed: ltiPushResults,
        grade: {
          totalScore,
          maxScore,
          percentage: Math.round(percentage * 10) / 10,
          letterGrade,
          instructorComment
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[approve-ai-grade] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
