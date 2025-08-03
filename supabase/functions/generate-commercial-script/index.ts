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
    const { businessName, businessType, keyMessage, targetAudience, duration, tone } = await req.json();

    console.log('Request received:', { businessName, businessType, keyMessage, targetAudience, duration, tone });
    console.log('OpenAI API Key exists:', !!openAIApiKey);
    console.log('OpenAI API Key length:', openAIApiKey?.length || 0);

    if (!businessName || !businessType || !keyMessage) {
      console.log('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Business name, type, and key message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a professional radio commercial scriptwriter. Create engaging, effective radio commercials that capture attention and drive action. Focus on clear messaging, compelling hooks, and strong calls-to-action.

Guidelines:
- Start with an attention-grabbing hook
- Clearly communicate the main message
- Include business name multiple times
- End with a memorable call-to-action
- Use conversational, radio-friendly language
- Consider pacing and flow for voice delivery
- Make every word count for the given duration`;

    const userPrompt = `Create a ${duration}-second radio commercial script for:

Business: ${businessName}
Type: ${businessType}
Key Message: ${keyMessage}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
Tone: ${tone}

Requirements:
- Exactly ${duration} seconds when read at normal speaking pace (about 3-4 words per second)
- ${tone} tone throughout
- Clear, memorable messaging
- Strong call-to-action
- Business name mentioned at least twice

Format the script with clear timing and delivery notes.`;

    console.log('Generating commercial script for:', businessName);

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to generate script');
    }

    const data = await response.json();
    const script = data.choices[0].message.content;

    console.log('Script generated successfully');

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-commercial-script function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});