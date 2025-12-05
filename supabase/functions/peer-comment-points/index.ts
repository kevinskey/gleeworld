import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PeerCommentRequest {
  assignment_id: string;
  student_id: string;
}

interface PeerCommentResponse {
  success: boolean;
  valid_count: number;
  points_awarded: number;
  qualifying_comment_ids: string[];
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== STARTING PEER COMMENT POINTS FUNCTION ===');
    
    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log('Supabase URL configured:', supabaseUrl ? 'Yes' : 'No');
    console.log('Supabase service key configured:', supabaseKey ? 'Yes' : 'No');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const requestBody = await req.json();
    console.log('Raw request body:', JSON.stringify(requestBody, null, 2));
    
    const { assignment_id, student_id }: PeerCommentRequest = requestBody;

    console.log('Extracted values:');
    console.log('- assignment_id:', assignment_id);
    console.log('- student_id:', student_id);

    if (!student_id) {
      throw new Error('Missing required field: student_id');
    }
    
    if (!assignment_id) {
      throw new Error('Missing required field: assignment_id');
    }

    console.log('=== QUERYING FOR QUALIFYING COMMENTS ===');
    
    // Query for qualifying comments:
    // 1. Comments created by the student (created_by = student_id)
    // 2. On journals for the same assignment
    // 3. NOT on the student's own journal
    // 4. Comment content >= 50 words
    const { data: comments, error: commentsError } = await supabase
      .from('mus240_journal_comments')
      .select(`
        id,
        content,
        commenter_id,
        journal_id,
        created_at,
        mus240_journal_entries!inner (
          id,
          assignment_id,
          student_id
        )
      `)
      .eq('commenter_id', student_id)
      .eq('mus240_journal_entries.assignment_id', assignment_id)
      .neq('mus240_journal_entries.student_id', student_id); // Exclude own journal

    if (commentsError) {
      console.error('Error querying comments:', commentsError);
      throw new Error(`Failed to query comments: ${commentsError.message}`);
    }

    console.log('=== FOUND COMMENTS ===');
    console.log(`Total comments by student on others' journals: ${comments?.length || 0}`);

    const qualifyingComments = (comments || []).filter(comment => {
      const words = comment.content.trim().split(/\s+/).filter((word: string) => word.length > 0);
      const wordCount = words.length;
      const qualifies = wordCount >= 50;
      
      console.log(`Comment ${comment.id}: ${wordCount} words, qualifies: ${qualifies}`);
      return qualifies;
    });

    const validCount = qualifyingComments.length;
    const qualifyingCommentIds = qualifyingComments.map(comment => comment.id);

    // Calculate points: 0 for 0 comments, 1.5 for 1 comment, 3 for 2+ comments
    let pointsAwarded = 0;
    if (validCount >= 2) {
      pointsAwarded = 3;
    } else if (validCount === 1) {
      pointsAwarded = 1.5;
    } else {
      pointsAwarded = 0;
    }

    console.log('=== PEER COMMENT CALCULATION COMPLETE ===');
    console.log(`Valid comments: ${validCount}`);
    console.log(`Points awarded: ${pointsAwarded}`);
    console.log(`Qualifying comment IDs: ${qualifyingCommentIds.join(', ')}`);

    const response: PeerCommentResponse = {
      success: true,
      valid_count: validCount,
      points_awarded: pointsAwarded,
      qualifying_comment_ids: qualifyingCommentIds
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in peer-comment-points function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        valid_count: 0,
        points_awarded: 0,
        qualifying_comment_ids: [],
        error: error.message || 'Internal server error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});