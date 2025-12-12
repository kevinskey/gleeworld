import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { submissionId, assignmentType } = await req.json();
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  try {
    // Create enhanced transparent grading prompt
    const transparentGradingPrompt = `You are an expert music professor providing TRANSPARENT, DEFENSIBLE grading. 

CRITICAL REQUIREMENTS:
1. Show your mathematical reasoning for each score
2. Reference specific evidence from the student response
3. Explain how each rubric criterion was weighted
4. Provide percentage breakdowns that add up to 100%

ASSIGNMENT EVALUATION PROCESS:
For each rubric criterion, you must:
- Quote specific text/examples from student work
- Apply a 0-4 scale (0=No Evidence, 1=Minimal, 2=Developing, 3=Proficient, 4=Exemplary)
- Show the mathematical conversion to final points
- Explain your reasoning in 1-2 sentences with evidence

RUBRIC CRITERIA & WEIGHTS:
1. Content Accuracy (40% of grade)
   - Historical facts correct: __/4 points
   - Musical concepts understood: __/4 points  
   - Cultural context addressed: __/4 points

2. Analysis Quality (35% of grade)
   - Depth of analysis: __/4 points
   - Evidence and examples: __/4 points
   - Connections made: __/4 points

3. Communication (25% of grade)
   - Writing clarity: __/4 points
   - Organization: __/4 points
   - Grammar/mechanics: __/4 points

RESPONSE FORMAT:
{
  "detailed_breakdown": {
    "content_accuracy": {
      "historical_facts": {
        "score": 3,
        "evidence": "Student correctly identified Mozart's birth year...",
        "reasoning": "Accurate dates and biographical details demonstrate research",
        "percentage": 13.3
      },
      "musical_concepts": {...},
      "cultural_context": {...}
    },
    "analysis_quality": {...},
    "communication": {...}
  },
  "mathematical_calculation": {
    "raw_total": 85,
    "percentage": 85.0,
    "letter_grade": "B",
    "calculation_steps": [
      "Content Accuracy: 34/40 points (85%)",
      "Analysis Quality: 30/35 points (86%)", 
      "Communication: 21/25 points (84%)",
      "Total: 85/100 points"
    ]
  },
  "ai_confidence": {
    "overall_confidence": 87,
    "reasoning": "Clear rubric application with specific evidence",
    "potential_variance": "+/- 3 points"
  },
  "student_explanation": "Your grade of 85% was calculated by...[clear explanation for student]"
}

STUDENT WORK TO EVALUATE:
[Include actual student response here]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are a transparent, fair music professor who shows all mathematical reasoning and evidence for grades. Students and parents should be able to understand exactly how you arrived at each score.' 
          },
          { role: 'user', content: transparentGradingPrompt }
        ],
        max_completion_tokens: 1500,
      }),
    });

    const data = await response.json();
    const gradingResult = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify({
      success: true,
      transparent_grading: gradingResult,
      explanation: "This grading system provides mathematical transparency, specific evidence, and defensible reasoning for all scores."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});