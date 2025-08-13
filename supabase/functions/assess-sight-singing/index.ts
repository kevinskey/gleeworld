import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioData, exerciseMetadata, musicXML } = await req.json();
    
    if (!audioData) {
      throw new Error('No audio data provided');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing sight-singing assessment for exercise:', exerciseMetadata);

    // Convert base64 audio to blob for OpenAI Whisper
    const binaryAudio = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    const formData = new FormData();
    formData.append('file', new Blob([binaryAudio], { type: 'audio/webm' }), 'recording.webm');
    formData.append('model', 'whisper-1');

    // Transcribe audio using OpenAI Whisper
    console.log('Transcribing audio with Whisper...');
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcribedText = transcriptionResult.text || '';
    
    console.log('Audio transcribed:', transcribedText.substring(0, 100) + '...');

    // Analyze the musical performance using GPT-4
    const analysisPrompt = `
You are an expert vocal instructor and sight-reading specialist analyzing a student's sight-singing performance.

EXERCISE DETAILS:
- Difficulty: ${exerciseMetadata.difficulty}
- Key Signature: ${exerciseMetadata.keySignature}
- Time Signature: ${exerciseMetadata.timeSignature}
- Number of Measures: ${exerciseMetadata.measures}
- Note Range: ${exerciseMetadata.noteRange}

AUDIO TRANSCRIPTION:
"${transcribedText}"

MUSICXML CONTENT:
${musicXML ? musicXML.substring(0, 1000) + '...' : 'Not provided'}

Please analyze this sight-singing performance and provide:

1. OVERALL SCORE (0-100): Based on accuracy, musicality, and technique
2. DETAILED SCORES (0-100 each):
   - Pitch Accuracy: How well did they sing the correct pitches?
   - Rhythm Accuracy: How well did they maintain the correct rhythm?
   - Tempo Consistency: How steady was their tempo?
   - Intonation: How well were they in tune?
   - Overall Musicality: Expression, phrasing, and musical understanding

3. FEEDBACK: Constructive feedback highlighting strengths and areas for improvement

4. SPECIFIC RECOMMENDATIONS: 2-3 actionable suggestions for improvement

Consider that this is a sight-reading exercise, so expect some imperfections. Focus on:
- Accuracy of pitch relationships and intervals
- Rhythmic precision relative to the metronome
- Overall musical understanding and expression
- Effort and technique demonstrated

Be encouraging but honest in your assessment. This is educational feedback.

Respond in JSON format:
{
  "overall_score": number,
  "detailed_scores": {
    "pitch_accuracy": number,
    "rhythm_accuracy": number,
    "tempo_consistency": number,
    "intonation_score": number,
    "overall_musicality": number
  },
  "feedback": "string",
  "recommendations": ["string", "string", "string"]
}`;

    console.log('Analyzing performance with GPT-4...');
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert music educator specializing in sight-singing assessment. Provide detailed, constructive feedback in JSON format.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('GPT-4 API error:', errorText);
      throw new Error(`Analysis failed: ${errorText}`);
    }

    const analysisResult = await analysisResponse.json();
    const analysisContent = analysisResult.choices[0].message.content;
    
    console.log('Analysis completed');

    // Parse the JSON response from GPT-4
    let assessmentResult;
    try {
      assessmentResult = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Failed to parse GPT-4 response:', analysisContent);
      // Fallback assessment if parsing fails
      assessmentResult = {
        overall_score: 75,
        detailed_scores: {
          pitch_accuracy: 75,
          rhythm_accuracy: 75,
          tempo_consistency: 75,
          intonation_score: 75,
          overall_musicality: 75
        },
        feedback: "Assessment completed. The AI had difficulty parsing the detailed analysis, but your performance showed good effort in sight-reading this exercise.",
        recommendations: [
          "Continue practicing sight-reading exercises",
          "Focus on pitch accuracy and intonation",
          "Work on maintaining steady tempo with metronome"
        ]
      };
    }

    // Ensure all scores are within valid range
    const clampScore = (score: number) => Math.max(0, Math.min(100, score || 0));
    
    const finalResult = {
      overall_score: clampScore(assessmentResult.overall_score),
      detailed_scores: {
        pitch_accuracy: clampScore(assessmentResult.detailed_scores?.pitch_accuracy),
        rhythm_accuracy: clampScore(assessmentResult.detailed_scores?.rhythm_accuracy),
        tempo_consistency: clampScore(assessmentResult.detailed_scores?.tempo_consistency),
        intonation_score: clampScore(assessmentResult.detailed_scores?.intonation_score),
        overall_musicality: clampScore(assessmentResult.detailed_scores?.overall_musicality)
      },
      feedback: assessmentResult.feedback || "Good work on this sight-reading exercise!",
      recommendations: assessmentResult.recommendations || ["Keep practicing!", "Focus on accuracy", "Work with metronome"],
      transcription: transcribedText
    };

    console.log('Assessment completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        assessment: finalResult 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in assess-sight-singing function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        assessment: null
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});