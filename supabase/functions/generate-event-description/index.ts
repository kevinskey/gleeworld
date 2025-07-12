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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if OpenAI API key is available
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, eventType, venue, maxAttendees } = await req.json();

    console.log('Generating description for event:', { title, eventType, venue, maxAttendees });
    console.log('OpenAI API key available:', !!openAIApiKey);

    const prompt = `Generate a compelling and informative event description for a ${eventType} event titled "${title}"${venue ? ` at ${venue}` : ''}${maxAttendees ? ` for up to ${maxAttendees} attendees` : ''}. 

The description should be:
- Engaging and professional
- 2-3 sentences long
- Include relevant details about what attendees can expect
- Be appropriate for a music/performance organization called Glee World
- Sound inviting and exciting

Just return the description text, nothing else.`;

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
            content: 'You are a creative writer specializing in event descriptions for music and performance organizations. Generate engaging, professional descriptions that capture the essence of events and encourage attendance.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedDescription = data.choices[0].message.content.trim();

    console.log('Generated description:', generatedDescription);

    return new Response(JSON.stringify({ description: generatedDescription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-event-description function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});