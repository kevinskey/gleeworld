import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface GradePayload {
  studentEmail: string;
  exerciseTitle: string;
  pitchScore?: number;
  rhythmScore?: number;
  completedAt?: string;
  attemptId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('GRADE_WEBHOOK_SECRET');

    if (!expectedSecret) {
      console.error('GRADE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: GradePayload = await req.json();
    console.log('Received grade webhook:', JSON.stringify(payload));

    // Validate required fields
    if (!payload.studentEmail || !payload.exerciseTitle || !payload.attemptId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          required: ['studentEmail', 'exerciseTitle', 'attemptId'] 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for insert
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert grade (update if attemptId exists, insert if new)
    const { data, error } = await supabase
      .from('external_grades')
      .upsert({
        student_email: payload.studentEmail.toLowerCase().trim(),
        exercise_title: payload.exerciseTitle,
        pitch_score: payload.pitchScore ?? null,
        rhythm_score: payload.rhythmScore ?? null,
        completed_at: payload.completedAt ?? new Date().toISOString(),
        external_attempt_id: payload.attemptId,
        source: 'sight-singing-studio'
      }, {
        onConflict: 'external_attempt_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store grade', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Grade stored successfully:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Grade recorded',
        gradeId: data.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
