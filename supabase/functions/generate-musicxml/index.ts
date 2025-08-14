import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  keySignature: string;
  timeSignature: string;
  tempo: number;
  measures: number;
  register: string;
  pitchRangeMin: string;
  pitchRangeMax: string;
  motionTypes: string[];
  noteLengths: string[];
  difficultyLevel: number;
  title?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      keySignature,
      timeSignature,
      tempo,
      measures,
      register,
      pitchRangeMin,
      pitchRangeMax,
      motionTypes,
      noteLengths,
      difficultyLevel,
      title = 'Sight-Singing Exercise'
    }: GenerateRequest = await req.json();

    console.log('Generating MusicXML with parameters:', {
      keySignature,
      timeSignature,
      tempo,
      measures,
      register,
      pitchRangeMin,
      pitchRangeMax,
      motionTypes,
      noteLengths,
      difficultyLevel
    });

    const systemPrompt = `You are a sight-singing exercise generator. Output only valid MusicXML 3.0+ wrapped in <score-partwise> tags.

Requirements:
- Use exactly ${measures} measures
- Key signature: ${keySignature}
- Time signature: ${timeSignature}
- Tempo: ${tempo} BPM
- Register: ${register}
- Pitch range: ${pitchRangeMin} to ${pitchRangeMax}
- Motion types: ${motionTypes.join(', ')}
- Note lengths: ${noteLengths.join(', ')}
- Difficulty level: ${difficultyLevel}/5

Rules:
1. Include proper <divisions> (use 480 divisions per quarter note)
2. Ensure beats per measure match time signature
3. Create a monophonic melody only
4. Use diatonic notes unless leaps are specified
5. Make musically coherent phrases
6. Include proper measure numbers
7. No missing beats per measure
8. Valid pitch spellings only

Example structure:
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<score-partwise version="3.0">
  <work><work-title>${title}</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <sound tempo="${tempo}"/>
      <!-- Notes here -->
    </measure>
    <!-- More measures -->
  </part>
</score-partwise>`;

    console.log('Making OpenAI API request...');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a sight-singing exercise with the specified parameters.` }
        ],
        max_tokens: 2000,
      }),
    });

    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        error: errorText
      });
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const result = await openAIResponse.json();
    const musicXML = result.choices[0].message.content;

    console.log('Generated MusicXML:', musicXML.substring(0, 200) + '...');

    // Store in database if user is authenticated
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const supabaseUrl = 'https://oopmlreysjzuxzylyheb.supabase.co';
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { error } = await supabase
            .from('sight_singing_exercises')
            .insert({
              user_id: user.id,
              title,
              key_signature: keySignature,
              time_signature: timeSignature,
              tempo,
              measures,
              register,
              pitch_range_min: pitchRangeMin,
              pitch_range_max: pitchRangeMax,
              motion_types: motionTypes,
              note_lengths: noteLengths,
              difficulty_level: difficultyLevel,
              musicxml_content: musicXML
            });

          if (error) {
            console.error('Error saving exercise:', error);
          } else {
            console.log('Exercise saved successfully');
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      musicXML,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-musicxml function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});