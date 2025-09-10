import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive Zod schema matching the exact data contract
const ScoreParametersSchema = z.object({
  key: z.enum(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Db', 'Eb', 'Gb', 'Ab', 'Bb']),
  mode: z.enum(['Major', 'Minor', 'Natural Minor', 'Harmonic Minor', 'Melodic Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian']),
  timeSignature: z.enum(['2/4', '3/4', '4/4', '6/8', '9/8']),
  measures: z.number().refine(val => [4, 8, 16, 32].includes(val)),
  voiceParts: z.enum(['S', 'A', 'SA']),
  bpm: z.number().refine(val => [60, 72, 84, 96, 108, 120, 132, 144, 160, 180].includes(val)),
  noteValues: z.array(z.enum(['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond'])).min(1),
  restValues: z.array(z.enum(['WR', 'HR', 'QR', '8R', '16R', '32R'])).min(1),
  dottedNotes: z.boolean(),
  cadenceFrequency: z.number().refine(val => [2, 4, 8].includes(val)),
  cadenceTypes: z.array(z.enum(['Authentic', 'Half', 'Plagal', 'Deceptive'])).min(1),
  motionTypes: z.array(z.enum(['Step', 'Skip', 'Leap', 'Repeat'])).min(1),
  voiceLeading: z.boolean(),
  resolveTendencies: z.boolean(),
  strongBeatCadence: z.boolean(),
  maxInterval: z.number().min(1).max(12),
  stepwiseMotionPercent: z.number().min(0).max(100),
  forceRefresh: z.boolean(),
  debugEcho: z.boolean().optional()
});

type ScoreParameters = z.infer<typeof ScoreParametersSchema>;

// OpenAI Response Schema
const OpenAIResponseSchema = z.object({
  echo: ScoreParametersSchema,
  musicxml: z.string()
});

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

function constructSystemPrompt(params: ScoreParameters): string {
  const voiceRanges = {
    'S': 'C4 to G5',
    'A': 'G3 to C5',
    'SA': 'Soprano (C4-G5) and Alto (G3-C5)'
  };

  const tempoUnit = ['6/8', '9/8'].includes(params.timeSignature) ? 'dotted-quarter' : 'quarter';
  
  return `You output ONLY JSON with two keys: echo, musicxml.

echo must be a verbatim copy of these user parameters: ${JSON.stringify(params)}

musicxml must be valid MusicXML <score-partwise> format that OpenSheetMusicDisplay can render with these exact constraints:

- Key: ${params.key} ${params.mode}
- Time Signature: ${params.timeSignature}
- Tempo: ${params.bpm} BPM (${tempoUnit} note gets the beat)
- Measures: Exactly ${params.measures} complete measures
- Voice Parts: ${params.voiceParts} with ranges ${voiceRanges[params.voiceParts]}
- Note Values: Only use ${params.noteValues.join(', ')}
- Rest Values: Only use ${params.restValues.join(', ')}
- Dotted Notes: ${params.dottedNotes ? 'Allowed' : 'Not allowed'}
- Cadences: Every ${params.cadenceFrequency} bars using ${params.cadenceTypes.join(', ')} types
- Motion Types: Use ${params.motionTypes.join(', ')} with ${params.stepwiseMotionPercent}% stepwise motion
- Max Interval: ${params.maxInterval} semitones
- Voice Leading: ${params.voiceLeading ? 'Enforce proper voice leading' : 'No voice leading constraints'}
- Resolve Tendencies: ${params.resolveTendencies ? 'Resolve leading tones and tendency tones' : 'No tendency resolution required'}
- Strong Beat Cadence: ${params.strongBeatCadence ? 'Cadences must land on strong beats' : 'Cadences can land on any beat'}

Requirements:
- No pickup measures
- Complete final bar
- No ties across final barline
- Valid MusicXML that OSMD can parse and display
- All notes within specified voice ranges
- Proper time signature grouping and beaming

Output ONLY the JSON. No explanation, no markdown formatting.`;
}

serve(async (req) => {
  console.log('Score generation function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Processing score generation request');
    
    // Parse and validate request body
    const body = await req.json();
    console.log('Received parameters:', JSON.stringify(body, null, 2));
    
    const validatedParams = ScoreParametersSchema.parse(body);
    console.log('Parameters validated successfully');

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Construct system prompt with validated parameters
    const systemPrompt = constructSystemPrompt(validatedParams);
    console.log('System prompt constructed');

    // Call OpenAI API
    const temperature = validatedParams.forceRefresh ? 0.8 : 0.3;
    console.log(`Calling OpenAI with temperature: ${temperature}`);
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the sight-reading exercise with the specified parameters.' }
        ],
        max_tokens: 4000,
        temperature: temperature
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', openAIResponse.status, openAIResponse.statusText);
      const errorText = await openAIResponse.text();
      console.error('OpenAI error details:', errorText);
      return new Response(JSON.stringify({ error: 'OpenAI API error', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received');

    const content = openAIData.choices[0].message.content;
    console.log('Raw OpenAI content length:', content.length);

    // Parse the JSON response from OpenAI
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
      console.log('OpenAI JSON parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      console.error('Raw content:', content);
      return new Response(JSON.stringify({ error: 'Invalid JSON response from OpenAI', details: content }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate the OpenAI response structure
    const validatedResponse = OpenAIResponseSchema.parse(parsedResponse);
    console.log('OpenAI response structure validated');

    // Perform echo verification - deep equality check
    const echoMatches = deepEqual(validatedParams, validatedResponse.echo);
    console.log('Echo verification result:', echoMatches);
    
    if (!echoMatches) {
      console.error('Echo mismatch detected');
      console.error('Expected:', JSON.stringify(validatedParams, null, 2));
      console.error('Received:', JSON.stringify(validatedResponse.echo, null, 2));
      return new Response(JSON.stringify({ 
        error: 'echo mismatch',
        expected: validatedParams,
        received: validatedResponse.echo
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Score generation completed successfully');
    
    // Return successful response with MusicXML
    return new Response(JSON.stringify({
      success: true,
      musicxml: validatedResponse.musicxml,
      echo: validatedResponse.echo,
      parameters: validatedParams
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in score generation:', error);
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return new Response(JSON.stringify({ 
        error: 'Validation failed',
        details: error.errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});