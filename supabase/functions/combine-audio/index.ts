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
    const requestBody = await req.text();
    console.log('📝 Request body received, length:', requestBody.length);
    
    const data = JSON.parse(requestBody) as CombineAudioRequest;
    const { recordedAudio, melodyAudio, bpm, title = 'Sight-Reading Exercise' } = data;

    if (!recordedAudio || !melodyAudio) {
      console.error('❌ Missing audio data:', { 
        hasRecorded: !!recordedAudio, 
        hasMelody: !!melodyAudio 
      });
      throw new Error('Both recorded audio and melody audio are required');
    }

    console.log('🎯 Processing audio combination with BPM:', bpm);
    console.log('📊 Input data sizes:', {
      recordedLength: recordedAudio.length,
      melodyLength: melodyAudio.length
    });

    // Validate base64 data
    if (!isValidBase64(recordedAudio)) {
      throw new Error('Invalid recorded audio data format');
    }
    if (!isValidBase64(melodyAudio)) {
      throw new Error('Invalid melody audio data format');
    }

    // Convert base64 audio to binary with error handling
    let recordedBinary: string, melodyBinary: string;
    
    try {
      recordedBinary = atob(recordedAudio);
      melodyBinary = atob(melodyAudio);
    } catch (error) {
      console.error('❌ Base64 decode error:', error);
      throw new Error('Failed to decode audio data');
    }
    
    // Create Uint8Arrays from binary strings
    const recordedBytes = new Uint8Array(recordedBinary.length);
    for (let i = 0; i < recordedBinary.length; i++) {
      recordedBytes[i] = recordedBinary.charCodeAt(i);
    }
    
    const melodyBytes = new Uint8Array(melodyBinary.length);
    for (let i = 0; i < melodyBinary.length; i++) {
      melodyBytes[i] = melodyBinary.charCodeAt(i);
    }

    console.log('📊 Audio data sizes after conversion:', {
      recorded: recordedBytes.length,
      melody: melodyBytes.length
    });

    // Create a proper WAV file with both audio tracks layered
    const combinedAudio = await createCombinedWAV(recordedBytes, melodyBytes, bpm);
    
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
      format: 'wav',
      title: title,
      bpm: bpm,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error combining audio:', error);
    console.error('❌ Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Validates if a string is valid base64
 */
function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

/**
 * Creates a proper WAV file with both audio tracks mixed together
 */
async function createCombinedWAV(recordedBytes: Uint8Array, melodyBytes: Uint8Array, bpm: number): Promise<Uint8Array> {
  console.log('🔄 Creating combined WAV file...');
  
  // WAV file format constants
  const sampleRate = 44100;
  const channels = 2; // Stereo
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  
  // Calculate duration based on the longer audio clip
  const recordedDuration = estimateAudioDuration(recordedBytes, sampleRate);
  const melodyDuration = estimateAudioDuration(melodyBytes, sampleRate);
  const maxDuration = Math.max(recordedDuration, melodyDuration);
  const totalSamples = Math.floor(maxDuration * sampleRate) * channels;
  
  console.log('📊 Audio durations:', {
    recorded: recordedDuration.toFixed(2) + 's',
    melody: melodyDuration.toFixed(2) + 's',
    final: maxDuration.toFixed(2) + 's'
  });
  
  // Create WAV header
  const dataSize = totalSamples * bytesPerSample;
  const fileSize = 36 + dataSize;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  // WAV header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, fileSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // PCM format size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);
  
  // Create audio data buffer
  const audioData = new Int16Array(totalSamples);
  
  // Mix the audio by layering recorded and melody with simple amplitude adjustment
  const recordedSamples = extractPCMSamples(recordedBytes, sampleRate);
  const melodySamples = extractPCMSamples(melodyBytes, sampleRate);
  
  // Layer the audio with volume balancing
  for (let i = 0; i < totalSamples; i += 2) {
    const sampleIndex = Math.floor(i / 2);
    
    // Get samples from both sources (with bounds checking)
    const recordedSample = sampleIndex < recordedSamples.length ? recordedSamples[sampleIndex] : 0;
    const melodySample = sampleIndex < melodySamples.length ? melodySamples[sampleIndex] : 0;
    
    // Mix with 70% recorded voice, 30% melody to ensure voice is prominent
    const mixedSample = Math.round((recordedSample * 0.7) + (melodySample * 0.3));
    
    // Clamp to 16-bit range to prevent distortion
    const clampedSample = Math.max(-32768, Math.min(32767, mixedSample));
    
    // Set left and right channels (stereo)
    audioData[i] = clampedSample;     // Left channel
    audioData[i + 1] = clampedSample; // Right channel
  }
  
  // Combine header and audio data
  const combinedBuffer = new Uint8Array(44 + audioData.byteLength);
  combinedBuffer.set(new Uint8Array(header), 0);
  combinedBuffer.set(new Uint8Array(audioData.buffer), 44);
  
  console.log('🎯 Created WAV file, total size:', combinedBuffer.length);
  
  return combinedBuffer;
}

/**
 * Estimates audio duration from raw audio bytes
 */
function estimateAudioDuration(audioBytes: Uint8Array, sampleRate: number): number {
  // This is a rough estimation - assumes 16-bit PCM at given sample rate
  const bytesPerSecond = sampleRate * 2; // 16-bit = 2 bytes per sample
  return audioBytes.length / bytesPerSecond;
}

/**
 * Extracts PCM samples from raw audio bytes
 */
function extractPCMSamples(audioBytes: Uint8Array, targetSampleRate: number): Int16Array {
  // For simplicity, assume the input is already PCM data
  // In a real implementation, you'd parse the actual audio format
  
  const samples = new Int16Array(audioBytes.length / 2);
  const view = new DataView(audioBytes.buffer);
  
  for (let i = 0; i < samples.length; i++) {
    const byteIndex = i * 2;
    if (byteIndex + 1 < audioBytes.length) {
      samples[i] = view.getInt16(byteIndex, true); // Little-endian
    }
  }
  
  return samples;
}