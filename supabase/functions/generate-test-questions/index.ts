import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, courseContext, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating test questions for topic:', topic);

    const systemPrompt = `You are an expert test creator for music education courses. Generate exactly 20 high-quality test questions based on the provided topic and context. Each question should be educationally sound and assess different aspects of understanding.`;

    const userPrompt = `Create 20 test questions about: ${topic}

Course Context: ${courseContext || 'General music course'}
Difficulty Level: ${difficulty || 'medium'}

Generate a diverse mix of question types:
- Multiple choice questions (10-12 questions)
- True/False questions (3-4 questions)
- Short answer questions (3-4 questions)
- Essay questions (1-2 questions)

Each question should test different aspects: factual knowledge, comprehension, analysis, and application.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_test_questions',
              description: 'Generate 20 test questions with answers',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    minItems: 20,
                    maxItems: 20,
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        type: { 
                          type: 'string', 
                          enum: ['multiple-choice', 'true-false', 'short-answer', 'essay'] 
                        },
                        points: { type: 'number' },
                        options: { 
                          type: 'array',
                          items: { type: 'string' }
                        },
                        correctAnswer: { type: 'string' },
                        explanation: { type: 'string' }
                      },
                      required: ['question', 'type', 'points']
                    }
                  }
                },
                required: ['questions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_test_questions' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        questions: result.questions 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating test questions:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate questions' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
