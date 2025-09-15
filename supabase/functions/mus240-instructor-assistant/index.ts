import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    console.log('OpenAI API key configured successfully');
    const { task, prompt } = await req.json();
    console.log('Received request:', { task, prompt });

    if (task === 'test') {
      // Simple connectivity test
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Edge function is reachable' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    if (task === 'poll_creation') {
      // Generate a structured poll response using OpenAI
      const pollResponse = await generateMusicTheoryPoll(prompt);
      
      return new Response(
        JSON.stringify({ response: pollResponse }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unsupported task type' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  } catch (error) {
    console.error('Error in mus240-instructor-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

async function generateMusicTheoryPoll(prompt: string) {
  console.log('Generating poll with OpenAI for prompt:', prompt);
  
  const systemPrompt = `You are a music theory instructor creating educational polls for MUS 240 (African American Music). 

Create a structured quiz based on the user's prompt. Return your response as a valid JSON object with the following structure:

{
  "title": "Quiz Title",
  "description": "Brief description of the quiz content",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Rules:
- Create 3-10 questions based on the prompt
- Each question should have 4 multiple choice options
- Include detailed explanations for correct answers
- Focus on African American music history, theory, and cultural context
- Make questions educationally valuable and appropriately challenging
- Ensure all JSON is properly formatted and escaped

Respond ONLY with the JSON object, no additional text.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const generatedContent = data.choices[0].message.content.trim();
    console.log('Generated content:', generatedContent);
    
    // Try to parse the JSON response
    try {
      const pollData = JSON.parse(generatedContent);
      return JSON.stringify(pollData);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw content:', generatedContent);
      
      // Fallback: create a simple poll if AI response can't be parsed
      const fallbackPoll = {
        title: "Music Theory Quiz",
        description: `Quiz based on: ${prompt}`,
        questions: [
          {
            question: "Which element is fundamental to African American musical traditions?",
            options: ["Call and response", "Written notation", "European harmony", "Complex time signatures"],
            correct_answer: 0,
            explanation: "Call and response is a foundational element in African American music, rooted in African musical traditions."
          }
        ]
      };
      return JSON.stringify(fallbackPoll);
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error(`Failed to generate poll: ${error.message}`);
  }
}