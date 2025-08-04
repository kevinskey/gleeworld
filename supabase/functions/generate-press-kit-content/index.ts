import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { templateType, eventDetails, bandInfo } = await req.json();

    const prompts = {
      biography: `Write a compelling professional biography for ${bandInfo.name}. Include their musical style, achievements, and what makes them unique. Keep it engaging and suitable for media outlets. Length: 150-250 words.`,
      
      fact_sheet: `Create a concise fact sheet for ${bandInfo.name}. Include key facts like formation date, members, genre, notable performances, awards, and contact information. Format as bullet points.`,
      
      press_release: `Write a professional press release for ${eventDetails.eventName || 'upcoming performance'} featuring ${bandInfo.name}. Include who, what, when, where, why. Make it newsworthy and include quotes. Follow standard press release format.`,
      
      social_media: `Create engaging social media content for ${bandInfo.name}. Generate 3 different post variations: one for Instagram (with hashtags), one for Facebook (longer form), and one for Twitter/X (concise). Make them shareable and engaging.`,
      
      interview_questions: `Generate 10 thoughtful interview questions that journalists might ask ${bandInfo.name}. Include questions about their music, creative process, upcoming projects, and background. Make them engaging for both interviewer and audience.`
    };

    const prompt = prompts[templateType] || prompts.biography;

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
            content: 'You are a professional music publicist and press kit writer. Generate high-quality, professional content suitable for media outlets and press kits. Focus on the Spelman College Glee Club context - a prestigious collegiate ensemble with over 100 years of musical excellence.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error ${response.status}:`, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. Please check your OpenAI API key permissions.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ content: generatedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-press-kit-content function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});