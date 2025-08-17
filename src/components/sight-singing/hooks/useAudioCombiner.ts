import { useState, useCallback } from 'react';
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

  const generateMelodyAudioBuffer = useCallback(async (score: ParsedScore, sampleRate: number = 44100, bpm: number = 120): Promise<AudioBuffer> => {
    console.log('🎵 Generating melody audio buffer from score...');
    console.log('📊 Timing params:', { scoreDuration: score.totalDuration, bpm, sampleRate });
    
    // Calculate metronome count-in duration (4 clicks = 1 full bar)
    const beatDuration = 60 / bpm; // seconds per beat
    const countInDuration = 4 * beatDuration; // 4 beats for count-in
    
    console.log('⏱️ Count-in timing:', { beatDuration, countInDuration });
    
    // Create a Web Audio context to generate the melody
    const audioContext = new AudioContext({ sampleRate });
    
    // Total duration: count-in + score + buffer
    const totalDuration = countInDuration + score.totalDuration + 2;
    const buffer = audioContext.createBuffer(1, totalDuration * sampleRate, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    console.log('🎯 Buffer details:', { 
      totalDuration, 
      bufferLength: buffer.length,
      countInSamples: countInDuration * sampleRate 
    });
    
    // Generate melody audio data starting AFTER the count-in
    let currentTime = countInDuration; // Start after count-in
    for (const measure of score.measures) {
      for (const note of measure.notes) {
        const startSample = Math.floor((currentTime + note.startTime) * sampleRate);
        const durationSamples = Math.floor(note.duration * sampleRate);
        
        console.log('🎵 Note timing:', {
          noteFreq: note.frequency,
          startTime: currentTime + note.startTime,
          startSample,
          durationSamples
        });
        
        // Generate sine wave for the note
        for (let i = 0; i < durationSamples && startSample + i < channelData.length; i++) {
          const t = i / sampleRate;
          const frequency = note.frequency;
          const amplitude = 0.3 * Math.exp(-t * 2); // Simple envelope
          channelData[startSample + i] += amplitude * Math.sin(2 * Math.PI * frequency * t);
        }
      }
    }
    
    // Optional: Add metronome clicks to the melody track for reference
    // This helps with synchronization verification
    for (let click = 0; click < 4; click++) {
      const clickTime = click * beatDuration;
      const clickSample = Math.floor(clickTime * sampleRate);
      const clickDuration = 0.1; // 100ms click
      const clickSamples = Math.floor(clickDuration * sampleRate);
      
      // Add a brief metronome click sound (higher frequency for count-in)
      for (let i = 0; i < clickSamples && clickSample + i < channelData.length; i++) {
        const t = i / sampleRate;
        const frequency = click === 0 ? 1000 : 800; // Downbeat is higher pitched
        const amplitude = 0.1 * Math.exp(-t * 10); // Quick decay
        channelData[clickSample + i] += amplitude * Math.sin(2 * Math.PI * frequency * t);
      }
    }
    
    console.log('✅ Melody audio buffer generated with proper timing offset');
    
    await audioContext.close();
    return buffer;
  }, []);

  const createWavBlob = useCallback((audioBuffer: AudioBuffer): Blob => {
    const length = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * channels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * channels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * channels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }, []);

  const combineAudio = useCallback(async (
    recordedAudioBlob: Blob,
    score: ParsedScore,
    title: string = 'Sight-Reading Exercise'
  ): Promise<CombinedAudioResult | null> => {
    if (isProcessing) return null;
    
    setIsProcessing(true);
    
    try {
      console.log('🎯 Starting client-side audio combination with sync...');
      console.log('📊 Input data:', {
        recordedBlobSize: recordedAudioBlob.size,
        recordedBlobType: recordedAudioBlob.type,
        scoreExists: !!score,
        scoreTempo: score.tempo,
        title: title
      });

      // Create offline audio context for processing
      const sampleRate = 44100;
      const audioContext = new AudioContext({ sampleRate });
      
      // Decode recorded audio
      console.log('🔄 Decoding recorded audio...');
      const recordedArrayBuffer = await recordedAudioBlob.arrayBuffer();
      const recordedAudioBuffer = await audioContext.decodeAudioData(recordedArrayBuffer);
      console.log('✅ Recorded audio decoded:', {
        duration: recordedAudioBuffer.duration,
        channels: recordedAudioBuffer.numberOfChannels,
        sampleRate: recordedAudioBuffer.sampleRate
      });
      
      // Generate melody audio buffer with proper timing (includes count-in offset)
      console.log('🎵 Generating melody audio buffer with BPM sync...');
      const melodyAudioBuffer = await generateMelodyAudioBuffer(score, sampleRate, score.tempo);
      console.log('✅ Melody audio generated with timing:', {
        duration: melodyAudioBuffer.duration,
        channels: melodyAudioBuffer.numberOfChannels,
        sampleRate: melodyAudioBuffer.sampleRate
      });
      
      // Calculate final duration (use recorded audio length as reference since it includes count-in)
      const finalDuration = Math.max(recordedAudioBuffer.duration, melodyAudioBuffer.duration);
      const finalLength = Math.floor(finalDuration * sampleRate);
      
      console.log('🔄 Creating synchronized combined audio buffer...');
      console.log('📊 Final timing:', { 
        recordedDuration: recordedAudioBuffer.duration,
        melodyDuration: melodyAudioBuffer.duration,
        finalDuration,
        finalLength 
      });
      
      const offlineContext = new OfflineAudioContext(2, finalLength, sampleRate);
      
      // Create sources for both audio buffers
      const recordedSource = offlineContext.createBufferSource();
      const melodySource = offlineContext.createBufferSource();
      
      // Create gain nodes for volume control
      const recordedGain = offlineContext.createGain();
      const melodyGain = offlineContext.createGain();
      
      // Set volumes: recorded audio at 70%, melody at 30%
      recordedGain.gain.value = 0.7;
      melodyGain.gain.value = 0.3;
      
      // Set up the audio graph
      recordedSource.buffer = recordedAudioBuffer;
      melodySource.buffer = melodyAudioBuffer;
      
      recordedSource.connect(recordedGain);
      melodySource.connect(melodyGain);
      
      recordedGain.connect(offlineContext.destination);
      melodyGain.connect(offlineContext.destination);
      
      // Start both sources at the same time (melody already has count-in offset built in)
      console.log('🎯 Starting synchronized playback...');
      recordedSource.start(0);
      melodySource.start(0);
      
      // Render the combined audio
      console.log('🎯 Rendering synchronized combined audio...');
      const combinedBuffer = await offlineContext.startRendering();
      console.log('✅ Audio combination complete with synchronization:', {
        duration: combinedBuffer.duration,
        channels: combinedBuffer.numberOfChannels,
        sampleRate: combinedBuffer.sampleRate
      });
      
      // Convert to WAV blob
      const combinedBlob = createWavBlob(combinedBuffer);
      
      // Convert blob to data URL to avoid CSP issues with blob URLs
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(combinedBlob);
      });
      
      console.log('✅ Combined audio converted to data URL');
      
      // Clean up
      await audioContext.close();

      toast({
        title: "Audio Combined Successfully",
        description: "Your recorded audio has been synchronized with the melody.",
      });

      return {
        audioBlob: combinedBlob,
        downloadUrl: dataUrl, // Use data URL instead of blob URL
        title
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
  }, [isProcessing, generateMelodyAudioBuffer, createWavBlob, toast]);

  return {
    combineAudio,
    isProcessing
  };
};