import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, accept, accept-language, content-language',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

interface RubricCriterion {
  name: string;
  description: string;
  maxScore: number;
}

interface GradingRubric {
  criteria: RubricCriterion[];
  totalPoints: number;
}

const MUS240_RUBRIC: GradingRubric = {
  criteria: [
    {
      name: "Content Understanding",
      description: "Demonstrates understanding of musical concepts, historical context, and theoretical elements discussed",
      maxScore: 25
    },
    {
      name: "Critical Analysis",
      description: "Shows analytical thinking, makes connections between concepts, and provides thoughtful interpretation",
      maxScore: 25
    },
    {
      name: "Use of Evidence",
      description: "References specific musical examples, uses course materials, and supports arguments with evidence",
      maxScore: 20
    },
    {
      name: "Writing Quality",
      description: "Clear organization, proper grammar, appropriate vocabulary, and meets length requirements",
      maxScore: 20
    },
    {
      name: "Engagement & Reflection",
      description: "Shows personal engagement with material, thoughtful reflection, and original insights",
      maxScore: 10
    }
  ],
  totalPoints: 100
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AI Journal Grading function started');
    
    // Test basic functionality first
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('Environment check - OpenAI key exists:', !!openAIApiKey);
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Log API key format (first few characters only for security)
    console.log('API key format check:', openAIApiKey.substring(0, 3) + '...');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request received successfully');
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { journalId, journalContent, assignmentId } = requestBody;
    
    if (!journalId || !journalContent) {
      console.error('Missing required parameters:', { journalId: !!journalId, journalContent: !!journalContent });
      return new Response(JSON.stringify({ 
        error: 'Journal ID and content are required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Grading journal ${journalId} for assignment ${assignmentId}`);
    console.log('Journal content length:', journalContent.length);

    // Create Supabase client with error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ 
        error: 'Supabase configuration missing',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build the grading prompt
    const prompt = `
You are an expert music education professor grading a student's listening journal for MUS 240 (Introduction to African American Music). 

ASSIGNMENT: ${assignmentId?.toUpperCase() || 'Listening Journal Entry'}

STUDENT SUBMISSION:
${journalContent}

GRADING RUBRIC (Total: ${MUS240_RUBRIC.totalPoints} points):
${MUS240_RUBRIC.criteria.map(criterion => 
  `- ${criterion.name} (${criterion.maxScore} points): ${criterion.description}`
).join('\n')}

Please evaluate this journal entry and provide:

1. A score for each rubric criterion (out of the maximum points)
2. Specific feedback for each criterion explaining the score
3. An overall letter grade (A+ to F)
4. Constructive feedback highlighting strengths and areas for improvement
5. Suggestions for future journal entries

Return your response in the following JSON format:
{
  "overallScore": [total points out of 100],
  "letterGrade": "[A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F]",
  "rubricScores": [
    {
      "criterion": "Content Understanding",
      "score": [points],
      "maxScore": 25,
      "feedback": "Detailed feedback here"
    },
    // ... for each criterion
  ],
  "overallFeedback": "Comprehensive feedback about the journal entry",
  "suggestions": "Specific suggestions for improvement"
}

Be fair but thorough in your evaluation. Consider the level appropriate for an introductory college course.`;

    console.log('Calling OpenAI API for grading...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using legacy model for compatibility
        messages: [
          {
            role: 'system',
            content: 'You are an expert music education professor with extensive knowledge of African American music history and theory. You provide detailed, constructive feedback on student work.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Failed to parse error response' } }));
      console.error('OpenAI API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText || 'Unknown error'}`);
    }

    const data = await response.json();
    const gradingResult = data.choices[0].message.content;

    console.log('AI grading response received');

    // Parse the AI response
    let parsedGrading;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = gradingResult.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }
      parsedGrading = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', gradingResult);
      throw new Error('Failed to parse AI grading response');
    }

    // Save the grade to the database
    console.log('Saving grade to database...');
    
    const { data: gradeData, error: gradeError } = await supabase
      .from('mus240_journal_grades')
      .insert({
        journal_id: journalId,
        overall_score: parsedGrading.overallScore,
        letter_grade: parsedGrading.letterGrade,
        rubric: parsedGrading.rubricScores,
        feedback: parsedGrading.overallFeedback + '\n\nSuggestions: ' + parsedGrading.suggestions,
        ai_model: 'gpt-4o-mini',
        graded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (gradeError) {
      console.error('Database error:', gradeError);
      throw new Error(`Failed to save grade: ${gradeError.message}`);
    }

    console.log('Grade saved successfully:', gradeData.id);

    return new Response(JSON.stringify({
      success: true,
      gradeId: gradeData.id,
      grading: parsedGrading,
      message: 'Journal graded successfully by AI'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in grade-journal-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});