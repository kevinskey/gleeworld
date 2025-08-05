import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Function started, API key exists:', !!openAIApiKey);
    console.log('API key length:', openAIApiKey?.length || 0);
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
    const { 
      difficulty = 'beginner',
      keySignature = 'C major',
      timeSignature = '4/4',
      measures = 8,
      noteRange = 'C4-C5'
    } = requestBody;

    console.log('Generating MusicXML:', { difficulty, keySignature, timeSignature, measures, noteRange });

    const systemPrompt = `You are a music theory expert that generates valid MusicXML 3.1 for sight-reading exercises. 

CRITICAL REQUIREMENTS:
1. Always start with <?xml version="1.0" encoding="UTF-8"?>
2. Use <score-partwise version="3.1"> as root element
3. Include proper <part-list> with <score-part id="P1">
4. Each <measure> MUST have <attributes> with divisions, key, time, clef
5. Each <note> MUST have <pitch>, <duration>, and <type>
6. Duration values must be integers based on divisions
7. Generate melodic, singable patterns suitable for sight-reading

OUTPUT ONLY VALID MUSICXML - NO EXPLANATIONS OR MARKDOWN.`;

    const userPrompt = `Generate a ${difficulty} sight-reading exercise with:
- Key: ${keySignature}
- Time signature: ${timeSignature}
- ${measures} measures
- Note range: ${noteRange}
- Divisions: 4 (quarter note = 4)
- Mix of quarter and eighth notes
- Stepwise motion with occasional small leaps

Return ONLY valid MusicXML 3.1 format.`;

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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to generate MusicXML');
    }

    const data = await response.json();
    const musicXML = data.choices[0].message.content;

    console.log('Generated MusicXML length:', musicXML.length);

    return new Response(JSON.stringify({ musicXML }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-musicxml function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});