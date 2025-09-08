import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, user-agent, accept, accept-encoding, accept-language, connection, host, referer, sec-fetch-dest, sec-fetch-mode, sec-fetch-site, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

interface GradingRequest {
  assignment_id: string;
  journal_content: string;
  student_id: string;
  journal_id?: string;
}

interface RubricScore {
  criterion: string;
  score: number;
  max_score: number;
  feedback: string;
}

interface GradingResult {
  overall_points_without_peer: number;
  max_points_overall: number;
  overall_score_percent_without_peer: number;
  overall_score: number; // For compatibility
  letter_grade: string;
  rubric_scores: RubricScore[];
  overall_feedback: string;
  metadata: {
    word_count: number;
    word_range_ok: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== STARTING JOURNAL GRADING FUNCTION ===');
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI API key configured:', openAIApiKey ? 'Yes' : 'No');
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

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
    
    const { assignment_id, journal_content, student_id, journal_id, stub_test }: GradingRequest & { stub_test?: boolean } = requestBody;

    console.log('Extracted values:');
    console.log('- assignment_id:', assignment_id);
    console.log('- student_id:', student_id); 
    console.log('- journal_id:', journal_id);
    console.log('- journal_content length:', journal_content?.length);

    if (!student_id) {
      console.error('student_id is missing or null:', student_id);
      throw new Error('Missing required field: student_id');
    }
    
    if (!assignment_id) {
      throw new Error('Missing required field: assignment_id');
    }
    
    if (!journal_content) {
      throw new Error('Missing required field: journal_content');
    }

    // Count words
    const words = journal_content.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const wordRangeOk = wordCount >= 250 && wordCount <= 300;
    
    console.log('Word count:', wordCount, 'Word range OK:', wordRangeOk);

    // MUS240 Rubric (20 points total, excluding Peer Comments)
    const rubricCriteria = [
      {
        name: 'Musical Analysis',
        description: 'Identifies genre, style traits, and musical features',
        max_points: 7
      },
      {
        name: 'Historical Context',
        description: 'Connects musical features to historical and cultural significance',
        max_points: 5
      },
      {
        name: 'Terminology Usage',
        description: 'Uses correct musical terminology appropriately',
        max_points: 3
      },
      {
        name: 'Writing Quality',
        description: 'Clear, organized writing with proper grammar and 250-300 words',
        max_points: 2
      }
    ];

    let gradingResult: GradingResult;

    // Check if this is a stub test (skip AI call)
    if (stub_test) {
      console.log('=== STUB TEST MODE - SKIPPING AI CALL ===');
      
      const rubricScores = rubricCriteria.map(criterion => {
        let score = Math.round(criterion.max_points * 0.85); // Default 85%
        let feedback = `Good work on ${criterion.name.toLowerCase()}. Shows understanding of the material.`;
        
        // Apply word count penalty to Writing Quality
        if (criterion.name === 'Writing Quality' && !wordRangeOk) {
          score = 0;
          feedback = wordCount < 250 
            ? `Writing too short (${wordCount} words). Must be 250-300 words.`
            : `Writing too long (${wordCount} words). Must be 250-300 words.`;
        }
        
        return {
          criterion: criterion.name,
          score,
          max_score: criterion.max_points,
          feedback
        };
      });
      
      const totalPoints = rubricScores.reduce((sum, score) => sum + score.score, 0);
      const maxPointsWithoutPeer = 17; // 7+5+3+2
      const maxPointsOverall = 20; // Including peer comments
      const percentWithoutPeer = (totalPoints / maxPointsOverall) * 100;
      
      gradingResult = {
        overall_points_without_peer: totalPoints,
        max_points_overall: maxPointsOverall,
        overall_score_percent_without_peer: percentWithoutPeer,
        overall_score: percentWithoutPeer, // For compatibility
        letter_grade: getLetterGrade(percentWithoutPeer),
        rubric_scores: rubricScores,
        overall_feedback: 'This is a stub test grade. The journal demonstrates good listening skills and analysis.',
        metadata: {
          word_count: wordCount,
          word_range_ok: wordRangeOk
        }
      };
    } else {
      // Real AI grading
      const rubricPrompt = `
You are an expert music instructor grading a listening journal entry for MUS240. Grade this journal based on the following rubric:

${rubricCriteria.map(c => `
${c.name} (${c.max_points} points): ${c.description}
`).join('')}

IMPORTANT GRADING INSTRUCTIONS:
- The journal should be 250-300 words. Word count: ${wordCount}
- If word count is outside 250-300 range, give Writing Quality 0 points with clear feedback about length
- Focus on musical analysis, historical context, and terminology usage
- Be specific and constructive in feedback

Journal Content:
"${journal_content}"

Grade each criterion and provide specific feedback. Return your response as a JSON object with this exact structure:
{
  "rubric_scores": [
    {
      "criterion": "Musical Analysis", 
      "score": [number 0-7],
      "max_score": 7,
      "feedback": "[specific feedback for this criterion]"
    },
    {
      "criterion": "Historical Context",
      "score": [number 0-5], 
      "max_score": 5,
      "feedback": "[specific feedback for this criterion]"
    },
    {
      "criterion": "Terminology Usage",
      "score": [number 0-3],
      "max_score": 3, 
      "feedback": "[specific feedback for this criterion]"
    },
    {
      "criterion": "Writing Quality",
      "score": [${wordRangeOk ? 'number 0-2' : '0'}],
      "max_score": 2,
      "feedback": "[${wordRangeOk ? 'feedback about writing quality' : `Word count ${wordCount} is outside required 250-300 range`}]"
    }
  ],
  "overall_feedback": "[overall constructive feedback about the journal, addressing musical analysis and writing quality]"
}

Be constructive, specific, and encouraging in your feedback. Focus on musical elements and analysis skills.
`;

      console.log('=== CALLING OPENAI API ===');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are a professional music instructor with expertise in grading listening assignments. Always respond with valid JSON only. Follow the word count rules strictly.'
            },
            { role: 'user', content: rubricPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error details:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
      }

      const aiResponse = await response.json();
      console.log('=== OPENAI RESPONSE RECEIVED ===');
      console.log('OpenAI status:', response.status);
      console.log('Full AI response:', JSON.stringify(aiResponse, null, 2));
      
      try {
        const aiContent = aiResponse.choices[0].message.content;
        console.log('AI content to parse:', aiContent);
        
        if (!aiContent || aiContent.trim() === '') {
          throw new Error('Empty AI response content');
        }
        
        const parsed = JSON.parse(aiContent);
        
        // Enforce word count penalty manually
        if (!wordRangeOk) {
          const writingQualityIndex = parsed.rubric_scores.findIndex((score: any) => score.criterion === 'Writing Quality');
          if (writingQualityIndex !== -1) {
            parsed.rubric_scores[writingQualityIndex].score = 0;
            parsed.rubric_scores[writingQualityIndex].feedback = wordCount < 250 
              ? `Word count too short (${wordCount} words). Must be 250-300 words.`
              : `Word count too long (${wordCount} words). Must be 250-300 words.`;
          }
        }
        
        // Calculate totals
        const totalPoints = parsed.rubric_scores.reduce((sum: number, score: RubricScore) => sum + score.score, 0);
        const maxPointsWithoutPeer = 17; // 7+5+3+2
        const maxPointsOverall = 20; // Including peer comments
        const percentWithoutPeer = (totalPoints / maxPointsOverall) * 100;
        
        gradingResult = {
          overall_points_without_peer: totalPoints,
          max_points_overall: maxPointsOverall,
          overall_score_percent_without_peer: percentWithoutPeer,
          overall_score: percentWithoutPeer, // For compatibility
          letter_grade: getLetterGrade(percentWithoutPeer),
          rubric_scores: parsed.rubric_scores,
          overall_feedback: parsed.overall_feedback,
          metadata: {
            word_count: wordCount,
            word_range_ok: wordRangeOk
          }
        };
        
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        
        // Fallback grading with word count enforcement
        const rubricScores = rubricCriteria.map(criterion => {
          let score = Math.round(criterion.max_points * 0.75); // Default 75%
          let feedback = 'AI grading encountered a parsing error. Please have your instructor review manually.';
          
          // Apply word count penalty to Writing Quality
          if (criterion.name === 'Writing Quality' && !wordRangeOk) {
            score = 0;
            feedback = wordCount < 250 
              ? `Writing too short (${wordCount} words). Must be 250-300 words.`
              : `Writing too long (${wordCount} words). Must be 250-300 words.`;
          }
          
          return {
            criterion: criterion.name,
            score,
            max_score: criterion.max_points,
            feedback
          };
        });
        
        const totalPoints = rubricScores.reduce((sum, score) => sum + score.score, 0);
        const maxPointsWithoutPeer = 17;
        const maxPointsOverall = 20;
        const percentWithoutPeer = (totalPoints / maxPointsOverall) * 100;
        
        gradingResult = {
          overall_points_without_peer: totalPoints,
          max_points_overall: maxPointsOverall,
          overall_score_percent_without_peer: percentWithoutPeer,
          overall_score: percentWithoutPeer,
          letter_grade: getLetterGrade(percentWithoutPeer),
          rubric_scores: rubricScores,
          overall_feedback: 'Good listening journal entry. The AI grading system encountered a technical issue, so this is a default grade. Please have your instructor review manually.',
          metadata: {
            word_count: wordCount,
            word_range_ok: wordRangeOk
          }
        };
      }
    }

    console.log('=== PREPARING DATABASE INSERT ===');
    const gradeData = {
      student_id,
      assignment_id: assignment_id,
      journal_id,
      overall_score: gradingResult.overall_score,
      rubric: {
        criteria: rubricCriteria,
        scores: gradingResult.rubric_scores,
        metadata: gradingResult.metadata
      },
      feedback: gradingResult.overall_feedback,
      ai_model: stub_test ? 'gpt-5-2025-08-07' : 'gpt-4o-mini',
      graded_by: null, // AI grading
      graded_at: new Date().toISOString()
    };

    console.log('=== ATTEMPTING DATABASE INSERT ===');
    console.log('About to insert grade data:', JSON.stringify(gradeData, null, 2));

    const { data: grade, error: gradeError } = await supabase
      .from('mus240_journal_grades')
      .insert(gradeData)
      .select()
      .single();

    if (gradeError) {
      console.error('=== DATABASE INSERT FAILED ===');
      console.error('Error saving grade:', gradeError);
      console.error('Grade data that failed:', JSON.stringify(gradeData, null, 2));
      throw new Error(`Failed to save grade: ${gradeError.message}`);
    }

    console.log('=== DATABASE INSERT SUCCESSFUL ===');
    console.log('Grade saved successfully:', grade.id);

    return new Response(
      JSON.stringify({
        success: true,
        grade: {
          id: grade.id,
          assignment_id,
          student_id,
          journal_id,
          overall_score: gradingResult.overall_score,
          letter_grade: grade.letter_grade,
          rubric_scores: gradingResult.rubric_scores,
          overall_feedback: gradingResult.overall_feedback,
          overall_points_without_peer: gradingResult.overall_points_without_peer,
          max_points_overall: gradingResult.max_points_overall,
          overall_score_percent_without_peer: gradingResult.overall_score_percent_without_peer,
          metadata: gradingResult.metadata,
          created_at: grade.created_at
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in grade-journal function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function getLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}