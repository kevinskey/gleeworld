import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GLEEWORLD_API_URL = "https://readmusic.gleeworld.org/api/assignments";

interface AssignmentPayload {
  assignmentId: string;
  title: string;
  description?: string;
  dueDate: string;
  pointsPossible: number;
  courseCode: string;
  targetType: 'all' | 'section' | 'individual';
  targetValue?: string;
  exercises?: Array<{
    type: string;
    difficulty: string;
    parameters?: Record<string, unknown>;
  }>;
  students?: Array<{
    email: string;
    fullName: string;
    voicePart?: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('GLEEWORLD_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[SYNC-TO-GLEEWORLD] GLEEWORLD_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('authorization');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { assignmentId, includeStudents = true } = body;

    if (!assignmentId) {
      return new Response(
        JSON.stringify({ error: 'assignmentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SYNC-TO-GLEEWORLD] Syncing assignment ${assignmentId}`);

    // Fetch the assignment details
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: assignment, error: assignmentError } = await serviceClient
      .from('gw_sight_reading_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      console.error('[SYNC-TO-GLEEWORLD] Assignment not found:', assignmentError);
      return new Response(
        JSON.stringify({ error: 'Assignment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch enrolled students if requested
    let students: Array<{ email: string; fullName: string; voicePart?: string }> = [];
    
    if (includeStudents) {
      // Get MUS 070 course ID
      const courseId = 'a0000000-0000-0000-0000-000000000070';
      
      if (assignment.target_type === 'all') {
        // Get all enrolled students
        const { data: profiles } = await serviceClient
          .from('gw_profiles')
          .select('email, full_name, voice_part')
          .eq('role', 'member');
        
        students = profiles?.map(p => ({
          email: p.email || '',
          fullName: p.full_name || '',
          voicePart: p.voice_part || undefined
        })).filter(s => s.email) || [];
      } else if (assignment.target_type === 'section' && assignment.target_value) {
        // Get students in specific voice part
        const { data: profiles } = await serviceClient
          .from('gw_profiles')
          .select('email, full_name, voice_part')
          .eq('role', 'member')
          .eq('voice_part', assignment.target_value);
        
        students = profiles?.map(p => ({
          email: p.email || '',
          fullName: p.full_name || '',
          voicePart: p.voice_part || undefined
        })).filter(s => s.email) || [];
      }
    }

    // Build the payload
    const payload: AssignmentPayload = {
      assignmentId: assignment.id,
      title: assignment.title,
      description: assignment.description || undefined,
      dueDate: assignment.due_date,
      pointsPossible: assignment.points_possible || 100,
      courseCode: 'MUS 070',
      targetType: assignment.target_type as 'all' | 'section' | 'individual',
      targetValue: assignment.target_value || undefined,
      exercises: [], // Could be populated from sheet_music or exercise data
      students
    };

    console.log(`[SYNC-TO-GLEEWORLD] Sending payload with ${students.length} students`);

    // Send to GleeWorld API
    const response = await fetch(GLEEWORLD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error('[SYNC-TO-GLEEWORLD] API error:', response.status, responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to sync to GleeWorld',
          status: response.status,
          details: responseData
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update assignment with sync timestamp
    await serviceClient
      .from('gw_sight_reading_assignments')
      .update({ 
        updated_at: new Date().toISOString(),
        notes: `Synced to GleeWorld at ${new Date().toISOString()}`
      })
      .eq('id', assignmentId);

    console.log('[SYNC-TO-GLEEWORLD] Successfully synced assignment');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Assignment synced to GleeWorld',
        assignmentId,
        studentsNotified: students.length,
        gleeWorldResponse: responseData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SYNC-TO-GLEEWORLD] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
