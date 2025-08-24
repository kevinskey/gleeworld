import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAssignmentRequest {
  title: string;
  description?: string;
  due_date: string;
  points_possible?: number;
  sheet_music_id?: string;
  musicxml_content?: string;
  target_type: 'all_members' | 'voice_part' | 'specific_users';
  target_value?: string;
  grading_period: 'quarter1' | 'quarter2' | 'quarter3' | 'quarter4' | 'semester1' | 'semester2' | 'annual';
}

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

    // Verify user is admin/instructor
    const { data: profile, error: profileError } = await supabase
      .from('gw_profiles')
      .select('is_admin, is_super_admin, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || (!profile?.is_admin && !profile?.is_super_admin && profile?.role !== 'instructor')) {
      throw new Error('Admin privileges required to create assignments');
    }

    const request: CreateAssignmentRequest = await req.json();

    console.log('Creating sight-reading assignment:', {
      title: request.title,
      target_type: request.target_type,
      due_date: request.due_date,
      has_musicxml: !!request.musicxml_content,
      sheet_music_id: request.sheet_music_id
    });

    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('gw_sight_reading_assignments')
      .insert({
        title: request.title,
        description: request.description,
        assignment_type: 'sight_reading',
        due_date: request.due_date,
        grading_period: request.grading_period,
        points_possible: request.points_possible || 100,
        sheet_music_id: request.sheet_music_id,
        assigned_by: user.id,
        target_type: request.target_type,
        target_value: request.target_value,
        is_active: true
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      throw new Error(`Failed to create assignment: ${assignmentError.message}`);
    }

    // If MusicXML content is provided and no sheet_music_id, create a sheet music entry
    if (request.musicxml_content && !request.sheet_music_id) {
      console.log('Creating sheet music entry for assignment...');
      
      const { data: sheetMusic, error: sheetMusicError } = await supabase
        .from('gw_sheet_music')
        .insert({
          title: `Assignment: ${request.title}`,
          xml_content: request.musicxml_content,
          created_by: user.id,
          is_public: false,
          difficulty_level: 'intermediate'
        })
        .select()
        .single();

      if (sheetMusicError) {
        console.error('Error creating sheet music:', sheetMusicError);
        // Don't fail the assignment creation, just log the error
      } else {
        // Update assignment with sheet music ID
        const { error: updateError } = await supabase
          .from('gw_sight_reading_assignments')
          .update({ sheet_music_id: sheetMusic.id })
          .eq('id', assignment.id);

        if (updateError) {
          console.error('Error linking sheet music to assignment:', updateError);
        }
      }
    }

    // Get member count for the assignment target
    let targetMembers = 0;
    if (request.target_type === 'all_members') {
      const { count } = await supabase
        .from('gw_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'member');
      targetMembers = count || 0;
    } else if (request.target_type === 'voice_part' && request.target_value) {
      const { count } = await supabase
        .from('gw_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'member')
        .eq('voice_part', request.target_value);
      targetMembers = count || 0;
    }

    console.log('Assignment created successfully:', {
      id: assignment.id,
      title: assignment.title,
      targetMembers: targetMembers
    });

    return new Response(JSON.stringify({
      success: true,
      assignment: assignment,
      target_members: targetMembers,
      message: `Assignment "${request.title}" created successfully for ${targetMembers} members`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-sight-reading-assignment function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});