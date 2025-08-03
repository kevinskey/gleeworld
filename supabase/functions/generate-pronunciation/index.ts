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
    const { title, composer, language } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Generate a detailed pronunciation guide for the musical piece "${title}"${composer ? ` by ${composer}` : ''}${language ? ` in ${language}` : ''}. 

Please provide:
1. IPA (International Phonetic Alphabet) pronunciation for the title
2. If available, pronunciation for key lyrics or text in the piece
3. Common pronunciation challenges for English speakers
4. Tips for choral directors

Format your response as a clear, educational guide that would be helpful for choir members and directors. Include specific IPA symbols in brackets like [ˈɡlɔː.ri.a] for pronunciation.`;

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
            content: 'You are an expert in choral music, linguistics, and pronunciation. You specialize in helping choir members properly pronounce musical pieces in various languages, with particular expertise in Latin, Italian, German, French, and English art songs. Provide clear, accurate IPA transcriptions and practical pronunciation advice.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pronunciationGuide = data.choices[0].message.content;

    return new Response(JSON.stringify({ pronunciationGuide }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-pronunciation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});