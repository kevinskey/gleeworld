import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Exercise {
  id: string;
  type: string;
  difficulty: string;
  parameters?: Record<string, unknown>;
  title?: string;
}

interface Student {
  email: string;
  fullName?: string;
  externalId?: string;
}

interface AssignmentWebhookPayload {
  assignmentId: string;
  externalId?: string;
  title: string;
  description?: string;
  dueDate: string;
  pointsPossible?: number;
  courseCode?: string;
  exercises?: Exercise[];
  students?: Student[];
  createdAt?: string;
  action?: 'create' | 'update' | 'delete' | 'grade_update';
  gradeData?: {
    studentEmail: string;
    score: number;
    completedAt: string;
    attemptId: string;
    exerciseResults?: Array<{
      exerciseId: string;
      pitchScore: number;
      rhythmScore: number;
    }>;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate webhook secret
    const webhookSecret = req.headers.get('X-Webhook-Secret') || req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('GLEEWORLD_WEBHOOK_SECRET');

    if (!expectedSecret) {
      console.error('[RECEIVE-ASSIGNMENT] GLEEWORLD_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (webhookSecret !== expectedSecret) {
      console.error('[RECEIVE-ASSIGNMENT] Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: AssignmentWebhookPayload = await req.json();
    console.log('[RECEIVE-ASSIGNMENT] Received:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.assignmentId && !payload.externalId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: assignmentId or externalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const action = payload.action || 'create';
    const externalId = payload.externalId || payload.assignmentId;

    // Handle different actions
    if (action === 'delete') {
      // Delete assignment by external ID
      const { error } = await supabase
        .from('gw_sight_reading_assignments')
        .delete()
        .eq('notes', `external_id:${externalId}`);

      if (error) {
        console.error('[RECEIVE-ASSIGNMENT] Delete error:', error);
      }

      return new Response(
        JSON.stringify({ success: true, action: 'deleted', externalId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'grade_update' && payload.gradeData) {
      // Handle grade update from external system
      const { studentEmail, score, completedAt, attemptId, exerciseResults } = payload.gradeData;

      // Find user by email
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('email', studentEmail.toLowerCase())
        .single();

      if (profile) {
        // Store the grade in external_grades table
        const { error: gradeError } = await supabase
          .from('external_grades')
          .upsert({
            student_email: studentEmail.toLowerCase(),
            exercise_title: payload.title,
            pitch_score: exerciseResults?.[0]?.pitchScore ?? null,
            rhythm_score: exerciseResults?.[0]?.rhythmScore ?? null,
            overall_score: score,
            completed_at: completedAt,
            external_attempt_id: attemptId,
            source: 'readmusic-gleeworld',
            assignment_external_id: externalId
          }, {
            onConflict: 'external_attempt_id'
          });

        if (gradeError) {
          console.error('[RECEIVE-ASSIGNMENT] Grade storage error:', gradeError);
        }
      }

      console.log(`[RECEIVE-ASSIGNMENT] Grade update for ${studentEmail}: ${score}`);

      return new Response(
        JSON.stringify({ success: true, action: 'grade_updated', studentEmail, score }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update assignment
    // First, get a system user ID for assigned_by (or use a default admin)
    const { data: adminProfile } = await supabase
      .from('gw_profiles')
      .select('user_id')
      .eq('is_super_admin', true)
      .limit(1)
      .single();

    const assignedBy = adminProfile?.user_id || '00000000-0000-0000-0000-000000000000';

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('gw_sight_reading_assignments')
      .select('id')
      .ilike('notes', `%external_id:${externalId}%`)
      .single();

    const assignmentData = {
      title: payload.title,
      description: payload.description || null,
      due_date: payload.dueDate,
      points_possible: payload.pointsPossible || 100,
      assignment_type: 'sight_reading' as const,
      grading_period: 'week_1' as const,
      target_type: 'all',
      is_active: true,
      assigned_by: assignedBy,
      notes: `external_id:${externalId}${payload.exercises ? ` | exercises:${payload.exercises.length}` : ''}`,
      updated_at: new Date().toISOString()
    };

    let resultAssignment;

    if (existingAssignment) {
      // Update existing
      const { data, error } = await supabase
        .from('gw_sight_reading_assignments')
        .update(assignmentData)
        .eq('id', existingAssignment.id)
        .select()
        .single();

      if (error) {
        console.error('[RECEIVE-ASSIGNMENT] Update error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update assignment', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resultAssignment = data;
      console.log(`[RECEIVE-ASSIGNMENT] Updated assignment: ${data.id}`);
    } else {
      // Create new
      const { data, error } = await supabase
        .from('gw_sight_reading_assignments')
        .insert(assignmentData)
        .select()
        .single();

      if (error) {
        console.error('[RECEIVE-ASSIGNMENT] Insert error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create assignment', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resultAssignment = data;
      console.log(`[RECEIVE-ASSIGNMENT] Created assignment: ${data.id}`);
    }

    // Log exercise and student counts
    const exerciseCount = payload.exercises?.length || 0;
    const studentCount = payload.students?.length || 0;
    console.log(`[RECEIVE-ASSIGNMENT] Exercises: ${exerciseCount}, Students: ${studentCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        action: existingAssignment ? 'updated' : 'created',
        assignment: {
          id: resultAssignment.id,
          title: resultAssignment.title,
          dueDate: resultAssignment.due_date,
          externalId
        },
        exercisesReceived: exerciseCount,
        studentsReceived: studentCount,
        receivedAt: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RECEIVE-ASSIGNMENT] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
