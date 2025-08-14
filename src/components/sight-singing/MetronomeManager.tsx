import { useRef, useCallback } from 'react';
import { MetronomePlayer } from './MetronomePlayer';

export interface MetronomeManagerProps {
  tempo: number;
  volume: number;
  enabled: boolean;
  timeSignature: string;
  onBeatChange?: (beatPosition: number) => void;
}

export const useMetronomeManager = ({
  tempo,
  volume,
  enabled,
  timeSignature,
  onBeatChange
}: MetronomeManagerProps) => {
  const metronomeRef = useRef<MetronomePlayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  const initializeAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      metronomeRef.current = new MetronomePlayer(audioContextRef.current);
      console.log('🎯 Audio system initialized for metronome');
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return;
    
    await initializeAudio();
    
    if (metronomeRef.current && !isPlayingRef.current) {
      const [beatsPerMeasure] = timeSignature.split('/').map(Number);
      
      // Stop any existing metronome
      metronomeRef.current.stop();
      
      // Set parameters and start
      metronomeRef.current.setTempo(tempo);
      metronomeRef.current.setVolume(volume);
      metronomeRef.current.start(tempo, beatsPerMeasure);
      
      isPlayingRef.current = true;
      console.log(`🎯 Metronome started: ${tempo} BPM, ${beatsPerMeasure}/4`);
    }
  }, [enabled, tempo, volume, timeSignature, initializeAudio]);

  const stop = useCallback(() => {
    if (metronomeRef.current && isPlayingRef.current) {
      metronomeRef.current.stop();
      isPlayingRef.current = false;
      console.log('🎯 Metronome stopped');
    }
  }, []);

  const updateTempo = useCallback((newTempo: number) => {
    if (metronomeRef.current && isPlayingRef.current) {
      metronomeRef.current.setTempo(newTempo);
      console.log(`🎯 Metronome tempo updated to ${newTempo} BPM`);
    }
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    if (metronomeRef.current) {
      metronomeRef.current.setVolume(newVolume);
    }
  }, []);

  const getBeatPosition = useCallback(() => {
    return metronomeRef.current?.getBeatPosition() || 0;
  }, []);

  const isPlaying = useCallback(() => {
    return isPlayingRef.current;
  }, []);

  const cleanup = useCallback(() => {
    stop();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    metronomeRef.current = null;
  }, [stop]);

  return {
    start,
    stop,
    updateTempo,
    updateVolume,
    getBeatPosition,
    isPlaying,
    cleanup,
    metronomeRef: metronomeRef.current
  };
};