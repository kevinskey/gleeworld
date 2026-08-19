import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // DeepSeek is the house provider and its API is OpenAI-compatible, so the
  // same request shape serves both. OpenAI stays as a fallback for anyone
  // running this without a DeepSeek key.
  const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const apiKey = DEEPSEEK_API_KEY || OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No AI provider key configured (DEEPSEEK_API_KEY or OPENAI_API_KEY)" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const useDeepSeek = Boolean(DEEPSEEK_API_KEY);

  try {
    console.log(`AI provider: ${useDeepSeek ? 'deepseek' : 'openai'}`);
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
      const pollResponse = await generateMusicTheoryPoll(prompt, apiKey, useDeepSeek);
      
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
    console.error('Error in instructor-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

async function generateMusicTheoryPoll(prompt: string, apiKey: string, useDeepSeek: boolean) {
  console.log('Generating poll for prompt:', prompt);
  
  const systemPrompt = `You are a music instructor creating educational polls for a college course. The prompt names the course and topic.

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
- Draw the subject matter from the course and topic named in the prompt
- Make questions educationally valuable and appropriately challenging
- Ensure all JSON is properly formatted and escaped

Respond ONLY with the JSON object, no additional text.`;

  try {
    const endpoint = useDeepSeek
      ? 'https://api.deepseek.com/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: useDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        // Both providers honor this and it removes the prose-around-the-JSON
        // failure mode the manual parse below was written to survive.
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('AI API error:', response.status, errorData);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const generatedContent = data.choices[0].message.content.trim();
    console.log('Generated content:', generatedContent);
    
    // Try to parse the JSON response
    try {
      const pollData = JSON.parse(generatedContent);
      return JSON.stringify(pollData);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', generatedContent);
      
      throw new Error('The model did not return valid JSON for this poll.');
    }
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw new Error(`Failed to generate poll: ${error.message}`);
  }
}