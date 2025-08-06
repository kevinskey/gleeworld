import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { audioData, exerciseMetadata, musicXML } = await req.json();
    
    if (!audioData) {
      throw new Error('No audio data provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // For now, we'll simulate AI assessment with a realistic scoring algorithm
    // In production, this would involve audio analysis against the musicXML
    
    // Convert base64 audio to get duration estimate
    const binaryString = atob(audioData);
    const audioBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBytes[i] = binaryString.charCodeAt(i);
    }
    
    // Estimate duration (rough calculation)
    const estimatedDuration = audioBytes.length / (44100 * 2); // assuming 44.1kHz, 16-bit
    
    // Mock scoring based on exercise metadata and duration
    const difficultyMultiplier = exerciseMetadata.difficulty === 'beginner' ? 1.1 : 
                                 exerciseMetadata.difficulty === 'intermediate' ? 1.0 : 0.9;
    
    const measures = exerciseMetadata.measures || 8;
    const expectedDuration = measures * (60 / 120) * 4; // Assuming 120 BPM, 4/4 time
    
    // Duration score (closer to expected = better)
    const durationDiff = Math.abs(estimatedDuration - expectedDuration) / expectedDuration;
    const timingScore = Math.max(60, 100 - (durationDiff * 40));
    
    // Random variations for pitch and rhythm (in production, this would be AI analysis)
    const pitchAccuracy = Math.random() * 25 + 70; // 70-95
    const rhythmAccuracy = Math.random() * 20 + 75; // 75-95
    const intonationScore = Math.random() * 20 + 75; // 75-95
    const musicalityScore = Math.random() * 15 + 80; // 80-95
    
    // Calculate weighted overall score
    const overallScore = Math.round(
      (pitchAccuracy * 0.35 + 
       rhythmAccuracy * 0.25 + 
       timingScore * 0.20 + 
       intonationScore * 0.15 + 
       musicalityScore * 0.05) * difficultyMultiplier
    );
    
    // Generate feedback based on scores
    let feedback = '';
    const scores = {
      pitch: pitchAccuracy,
      rhythm: rhythmAccuracy,
      timing: timingScore,
      intonation: intonationScore,
      musicality: musicalityScore
    };
    
    const strengths = [];
    const improvements = [];
    
    if (scores.pitch >= 85) strengths.push('excellent pitch accuracy');
    else if (scores.pitch < 75) improvements.push('pitch accuracy');
    
    if (scores.rhythm >= 85) strengths.push('strong rhythmic precision');
    else if (scores.rhythm < 75) improvements.push('rhythmic consistency');
    
    if (scores.timing >= 85) strengths.push('good tempo control');
    else if (scores.timing < 75) improvements.push('tempo steadiness');
    
    if (scores.intonation >= 85) strengths.push('clear intonation');
    else if (scores.intonation < 75) improvements.push('intonation stability');
    
    if (strengths.length > 0) {
      feedback += `Strengths: ${strengths.join(', ')}. `;
    }
    
    if (improvements.length > 0) {
      feedback += `Areas for improvement: ${improvements.join(', ')}. `;
    }
    
    if (overallScore >= 90) {
      feedback += 'Outstanding sight singing performance!';
    } else if (overallScore >= 80) {
      feedback += 'Very good sight singing with minor areas to refine.';
    } else if (overallScore >= 70) {
      feedback += 'Good effort! Continue practicing for better consistency.';
    } else {
      feedback += 'Keep practicing! Focus on fundamental sight singing skills.';
    }

    const assessmentData = {
      score: overallScore,
      feedback: feedback,
      detailed_scores: {
        pitch_accuracy: Math.round(pitchAccuracy * 100) / 100,
        rhythm_accuracy: Math.round(rhythmAccuracy * 100) / 100,
        tempo_consistency: Math.round(timingScore * 100) / 100,
        intonation_score: Math.round(intonationScore * 100) / 100,
        overall_musicality: Math.round(musicalityScore * 100) / 100
      },
      audio_duration_seconds: Math.round(estimatedDuration),
      exercise_metadata: exerciseMetadata
    };

    return new Response(JSON.stringify(assessmentData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in assess-sight-singing function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      score: 0,
      feedback: 'Assessment failed. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});