import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CombineAudioRequest {
  recordedAudio: string; // Base64 encoded audio
  melodyAudio: string;   // Base64 encoded audio  
  bpm: number;
  title?: string;
}

serve(async (req) => {
  console.log('🎵 Audio combination request received:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordedAudio, melodyAudio, bpm, title = 'Sight-Reading Exercise' }: CombineAudioRequest = await req.json();

    if (!recordedAudio || !melodyAudio) {
      throw new Error('Both recorded audio and melody audio are required');
    }

    console.log('🎯 Processing audio combination with BPM:', bpm);

    // Convert base64 audio to binary
    const recordedBinary = atob(recordedAudio);
    const melodyBinary = atob(melodyAudio);
    
    // Create Uint8Arrays from binary strings
    const recordedBytes = new Uint8Array(recordedBinary.length);
    for (let i = 0; i < recordedBinary.length; i++) {
      recordedBytes[i] = recordedBinary.charCodeAt(i);
    }
    
    const melodyBytes = new Uint8Array(melodyBinary.length);
    for (let i = 0; i < melodyBinary.length; i++) {
      melodyBytes[i] = melodyBinary.charCodeAt(i);
    }

    console.log('📊 Audio data sizes:', {
      recorded: recordedBytes.length,
      melody: melodyBytes.length
    });

    // For now, we'll use a simple approach to mix the audio
    // In production, you might want to use FFmpeg for more sophisticated mixing
    const combinedAudio = await mixAudioStreams(recordedBytes, melodyBytes);
    
    console.log('✅ Audio combination complete, size:', combinedAudio.length);

    // Convert combined audio back to base64
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < combinedAudio.length; i += chunkSize) {
      const chunk = combinedAudio.subarray(i, Math.min(i + chunkSize, combinedAudio.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const combinedBase64 = btoa(binary);

    return new Response(JSON.stringify({
      success: true,
      combinedAudio: combinedBase64,
      format: 'webm',
      title: title,
      bpm: bpm
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error combining audio:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Simple audio mixing function that combines two audio streams
 * This is a basic implementation - in production you might want to use FFmpeg
 */
async function mixAudioStreams(audio1: Uint8Array, audio2: Uint8Array): Promise<Uint8Array> {
  console.log('🔄 Mixing audio streams...');
  
  // For now, we'll concatenate the streams rather than truly mixing them
  // This puts the melody first, then the recorded audio
  // In a real implementation, you'd want to synchronously mix the audio samples
  
  const totalLength = audio1.length + audio2.length;
  const combined = new Uint8Array(totalLength);
  
  // Copy melody audio first
  combined.set(audio2, 0);
  
  // Then append recorded audio
  combined.set(audio1, audio2.length);
  
  console.log('🎯 Mixed audio streams, total length:', totalLength);
  
  return combined;
}