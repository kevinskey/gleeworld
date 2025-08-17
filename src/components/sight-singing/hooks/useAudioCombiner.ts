import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ParsedScore } from '../utils/musicXMLParser';
import { useToast } from '@/hooks/use-toast';

export interface CombinedAudioResult {
  audioBlob: Blob;
  downloadUrl: string;
  title: string;
}

export const useAudioCombiner = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const generateMelodyAudio = useCallback(async (score: ParsedScore): Promise<string> => {
    console.log('🎵 Generating melody audio from score...');
    
    // Create a Web Audio context to generate the melody
    const audioContext = new AudioContext({ sampleRate: 24000 });
    const duration = score.totalDuration + 2; // Add 2 seconds buffer
    const buffer = audioContext.createBuffer(1, duration * audioContext.sampleRate, audioContext.sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate melody audio data
    let currentTime = 0;
    for (const measure of score.measures) {
      for (const note of measure.notes) {
        const startSample = Math.floor((currentTime + note.startTime) * audioContext.sampleRate);
        const durationSamples = Math.floor(note.duration * audioContext.sampleRate);
        
        // Generate sine wave for the note
        for (let i = 0; i < durationSamples && startSample + i < channelData.length; i++) {
          const t = i / audioContext.sampleRate;
          const frequency = note.frequency;
          const amplitude = 0.3 * Math.exp(-t * 2); // Simple envelope
          channelData[startSample + i] += amplitude * Math.sin(2 * Math.PI * frequency * t);
        }
      }
    }
    
    // Convert to base64
    const int16Array = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    await audioContext.close();
    return btoa(binary);
  }, []);

  const combineAudio = useCallback(async (
    recordedAudioBlob: Blob,
    score: ParsedScore,
    title: string = 'Sight-Reading Exercise'
  ): Promise<CombinedAudioResult | null> => {
    if (isProcessing) return null;
    
    setIsProcessing(true);
    
    try {
      console.log('🎯 Starting audio combination process...');
      
      // Convert recorded audio blob to base64
      const recordedArrayBuffer = await recordedAudioBlob.arrayBuffer();
      const recordedUint8Array = new Uint8Array(recordedArrayBuffer);
      
      let recordedBinary = '';
      const chunkSize = 8192;
      for (let i = 0; i < recordedUint8Array.length; i += chunkSize) {
        const chunk = recordedUint8Array.subarray(i, Math.min(i + chunkSize, recordedUint8Array.length));
        recordedBinary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const recordedBase64 = btoa(recordedBinary);
      
      // Generate melody audio
      const melodyBase64 = await generateMelodyAudio(score);
      
      console.log('📊 Calling combine-audio edge function...');
      
      // Call the edge function to combine audio
      const { data, error } = await supabase.functions.invoke('combine-audio', {
        body: {
          recordedAudio: recordedBase64,
          melodyAudio: melodyBase64,
          bpm: score.tempo,
          title: title
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Failed to combine audio: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to combine audio');
      }

      console.log('✅ Audio combination successful');

      // Convert the combined audio back to a blob
      const combinedBinary = atob(data.combinedAudio);
      const combinedBytes = new Uint8Array(combinedBinary.length);
      for (let i = 0; i < combinedBinary.length; i++) {
        combinedBytes[i] = combinedBinary.charCodeAt(i);
      }
      
      const combinedBlob = new Blob([combinedBytes], { type: 'audio/webm' });
      const downloadUrl = URL.createObjectURL(combinedBlob);

      toast({
        title: "Audio Combined Successfully",
        description: "Your recorded audio has been combined with the melody.",
      });

      return {
        audioBlob: combinedBlob,
        downloadUrl,
        title: data.title || title
      };

    } catch (error) {
      console.error('❌ Error combining audio:', error);
      toast({
        title: "Audio Combination Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, generateMelodyAudio, toast]);

  return {
    combineAudio,
    isProcessing
  };
};