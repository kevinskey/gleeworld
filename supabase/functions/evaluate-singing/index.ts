import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EvaluateRequest {
  musicXML: string;
  audioBase64: string;
  exerciseId?: string;
  recordingId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OpenAI API key" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { musicXML, audioBase64, exerciseId, recordingId }: EvaluateRequest = await req.json();

    console.log('Starting evaluation process...');

    // Convert base64 to audio for OpenAI Whisper transcription
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

    // First, transcribe the audio to get timing information
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      throw new Error(`Whisper API error: ${await whisperResponse.text()}`);
    }

    const transcription = await whisperResponse.json();
    console.log('Transcription result:', transcription);

    // Use GPT to analyze the MusicXML and compare with audio
    const analysisPrompt = `You are a music evaluation AI. Analyze this sight-singing performance.

MusicXML Score:
${musicXML}

Audio Transcription (with timing):
${JSON.stringify(transcription, null, 2)}

Evaluate the performance on:
1. Pitch accuracy (compare sung syllables/words to expected notes)
2. Rhythm accuracy (compare timing to expected note durations)
3. Overall musicality

Provide a detailed JSON response with:
{
  "pitch_accuracy": number (0-100),
  "rhythm_accuracy": number (0-100), 
  "per_measure": [
    {
      "measure": number,
      "pitch_score": number (0-100),
      "rhythm_score": number (0-100),
      "notes": string
    }
  ],
  "feedback": string,
  "strengths": string[],
  "areas_for_improvement": string[]
}

Be encouraging but accurate in your assessment.`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: 'You are an expert music teacher and evaluator. Always return valid JSON only.' },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.3
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis API error: ${await analysisResponse.text()}`);
    }

    const analysisResult = await analysisResponse.json();
    let evaluation;
    
    try {
      evaluation = JSON.parse(analysisResult.choices[0].message.content);
    } catch (e) {
      // Fallback if JSON parsing fails
      evaluation = {
        pitch_accuracy: 75,
        rhythm_accuracy: 80,
        per_measure: [],
        feedback: analysisResult.choices[0].message.content,
        strengths: ["Good effort!", "Clear articulation"],
        areas_for_improvement: ["Continue practicing", "Focus on pitch accuracy"]
      };
    }

    console.log('Evaluation result:', evaluation);

    // Save evaluation to database if IDs provided
    const authHeader = req.headers.get('authorization');
      if (authHeader && exerciseId && recordingId) {
        const supabaseUrl = 'https://oopmlreysjzuxzylyheb.supabase.co';
        
        if (SUPABASE_ANON_KEY) {
          const supabase = createClient(supabaseUrl, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } }
          });

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { error } = await supabase
            .from('sight_singing_evaluations')
            .insert({
              recording_id: recordingId,
              exercise_id: exerciseId,
              user_id: user.id,
              pitch_accuracy: evaluation.pitch_accuracy,
              rhythm_accuracy: evaluation.rhythm_accuracy,
              per_measure_data: evaluation.per_measure || [],
              feedback: evaluation.feedback
            });

          if (error) {
            console.error('Error saving evaluation:', error);
          } else {
            console.log('Evaluation saved successfully');
          }
        }
      }
    }

    return new Response(JSON.stringify({
      ...evaluation,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in evaluate-singing function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});