import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateCaller, unauthorizedResponse } from "../_shared/auth.ts";

// DeepSeek's chat API is OpenAI-compatible, so the request shape below is
// unchanged from the previous OpenAI integration — only the base URL,
// model, and key differ.
const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!deepseekApiKey) {
    return new Response(JSON.stringify({ error: 'DeepSeek API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const caller = await authenticateCaller(req);
    if (!caller) return unauthorizedResponse(corsHeaders);

    const { title, eventType, venue, maxAttendees } = await req.json();

    console.log('Generating description for event:', { title, eventType, venue, maxAttendees });

    const prompt = `Generate a compelling and informative event description for a ${eventType} event titled "${title}"${venue ? ` at ${venue}` : ''}${maxAttendees ? ` for up to ${maxAttendees} attendees` : ''}. 

The description should be:
- Engaging and professional
- 2-3 sentences long
- Include relevant details about what attendees can expect
- Be appropriate for a performing-arts organization
- Sound inviting and exciting

Just return the description text, nothing else.`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
      console.error('DeepSeek API error:', errorData);
      throw new Error(`DeepSeek API error: ${response.status}`);
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