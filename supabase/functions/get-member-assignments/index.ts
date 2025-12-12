import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = 'https://oopmlreysjzuxzylyheb.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const authHeader = req.headers.get('authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Get user profile to check voice part and role
    const { data: profile, error: profileError } = await supabase
      .from('gw_profiles')
      .select('voice_part, role')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      throw new Error('Profile not found');
    }

    console.log('Fetching assignments for user:', {
      userId: user.id,
      voicePart: profile.voice_part,
      role: profile.role
    });

    // Get assignments targeted to this user
    const { data: assignments, error: assignmentsError } = await supabase
      .from('gw_sight_reading_assignments')
      .select(`
        *,
        gw_sheet_music!sheet_music_id (
          id,
          title,
          xml_content,
          composer,
          difficulty_level,
          key_signature,
          time_signature
        )
      `)
      .eq('is_active', true)
      .or(`target_type.eq.all_members,and(target_type.eq.voice_part,target_value.eq.${profile.voice_part})`)
      .order('due_date', { ascending: true });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
    }

    // Get existing submissions for these assignments
    const assignmentIds = assignments.map(a => a.id);
    let submissions = [];
    
    if (assignmentIds.length > 0) {
      const { data: submissionData, error: submissionError } = await supabase
        .from('gw_assignment_submissions')
        .select('*')
        .eq('user_id', user.id)
        .in('assignment_id', assignmentIds);

      if (submissionError) {
        console.error('Error fetching submissions:', submissionError);
      } else {
        submissions = submissionData || [];
      }
    }

    // Combine assignments with submission status
    const assignmentsWithStatus = assignments.map(assignment => {
      const submission = submissions.find(s => s.assignment_id === assignment.id);
      
      return {
        ...assignment,
        submission_status: submission?.status || 'not_submitted',
        submission_id: submission?.id,
        submitted_at: submission?.submitted_at,
        score: submission?.score_value,
        feedback: submission?.feedback,
        pitch_accuracy: submission?.pitch_accuracy,
        rhythm_accuracy: submission?.rhythm_accuracy,
        graded_at: submission?.graded_at
      };
    });

    // Categorize assignments
    const now = new Date();
    const upcoming = assignmentsWithStatus.filter(a => new Date(a.due_date) > now && a.submission_status === 'not_submitted');
    const overdue = assignmentsWithStatus.filter(a => new Date(a.due_date) <= now && a.submission_status === 'not_submitted');
    const completed = assignmentsWithStatus.filter(a => a.submission_status === 'submitted');

    console.log('Assignments categorized:', {
      upcoming: upcoming.length,
      overdue: overdue.length,
      completed: completed.length
    });

    return new Response(JSON.stringify({
      success: true,
      assignments: {
        upcoming,
        overdue,
        completed,
        all: assignmentsWithStatus
      },
      total_count: assignmentsWithStatus.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-member-assignments function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});