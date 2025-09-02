import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluateRequest {
  text: string;
  prompt?: string;
  rubric?: string;
  maxPoints?: number;
}

interface EvaluationResult {
  score: number;
  feedback: string;
  letterGrade: string;
  breakdown: {
    contentQuality: number;
    organizationStructure: number;
    grammarMechanics: number;
    criticalThinking: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, prompt, rubric, maxPoints = 100 }: EvaluateRequest = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for evaluation');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build evaluation prompt
    const evaluationPrompt = `You are an expert writing instructor. Please evaluate the following piece of writing and provide detailed feedback.

Assignment Prompt: ${prompt || 'General writing evaluation'}

Rubric: ${rubric || 'Standard academic writing rubric focusing on content quality, organization/structure, grammar/mechanics, and critical thinking'}

Maximum Points: ${maxPoints}

TEXT TO EVALUATE:
"""
${text}
"""

Please provide your evaluation in the following JSON format:
{
  "score": <numeric score out of ${maxPoints}>,
  "letterGrade": "<letter grade A-F>",
  "feedback": "<detailed constructive feedback paragraph>",
  "breakdown": {
    "contentQuality": <score out of 25>,
    "organizationStructure": <score out of 25>,
    "grammarMechanics": <score out of 25>,
    "criticalThinking": <score out of 25>
  }
}

Focus on providing constructive, actionable feedback that helps the student improve their writing. Be specific about strengths and areas for improvement.`;

    console.log('Sending evaluation request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert writing instructor who provides detailed, constructive feedback on student writing. Always respond with valid JSON in the exact format requested.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    let evaluation: EvaluationResult;
    try {
      evaluation = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // Fallback evaluation
      evaluation = {
        score: Math.floor(maxPoints * 0.75), // Default to 75%
        letterGrade: 'B',
        feedback: 'Unable to provide detailed feedback due to parsing error. Please try again.',
        breakdown: {
          contentQuality: Math.floor(maxPoints * 0.25 * 0.75),
          organizationStructure: Math.floor(maxPoints * 0.25 * 0.75),
          grammarMechanics: Math.floor(maxPoints * 0.25 * 0.75),
          criticalThinking: Math.floor(maxPoints * 0.25 * 0.75)
        }
      };
    }

    // Ensure scores are within valid ranges
    evaluation.score = Math.min(Math.max(evaluation.score, 0), maxPoints);
    
    return new Response(JSON.stringify({
      success: true,
      evaluation
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evaluate-writing function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});