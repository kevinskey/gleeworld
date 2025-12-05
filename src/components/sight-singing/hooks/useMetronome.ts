import { useState, useCallback, useRef, useEffect } from 'react';
import { unlockAudioContext, setupMobileAudioUnlock } from '@/utils/mobileAudioUnlock';

export type MetronomeSoundType = 'pitch' | 'click';

export const useMetronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [tempo, setTempo] = useState(120);
  const [soundType, setSoundType] = useState<MetronomeSoundType>('click');
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Setup mobile audio unlock on mount
  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  const getAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    try {
      // Use the shared unlock utility for iOS compatibility
      const ctx = await unlockAudioContext();
      audioContextRef.current = ctx;
      return ctx;
    } catch (error) {
      console.error('Failed to get audio context:', error);
      return null;
    }
  }, []);

  const playClick = useCallback(async () => {
    const ctx = await getAudioContext();
    if (!ctx || ctx.state !== 'running') return;
    
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Same sound every time - just different waveform based on type
    osc.frequency.value = soundType === 'click' ? 1000 : 800;
    osc.type = soundType === 'click' ? 'square' : 'sine';
    
    // Quick attack and decay - same every beat
    gain.gain.setValueAtTime(volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.03);
  }, [volume, soundType, getAudioContext]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startMetronome = useCallback(async (bpm: number = tempo) => {
    if (intervalRef.current) {
      stopMetronome();
    }
    
    const ctx = await getAudioContext();
    if (!ctx) return;
    
    setIsPlaying(true);
    setTempo(bpm);
    
    const intervalMs = 60000 / bpm;
    
    playClick();
    
    intervalRef.current = window.setInterval(() => {
      playClick();
    }, intervalMs);
  }, [tempo, playClick, stopMetronome, getAudioContext]);

  const updateTempo = useCallback((newTempo: number) => {
    setTempo(newTempo);
    if (isPlaying) {
      startMetronome(newTempo);
    }
  }, [isPlaying, startMetronome]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Don't close the shared audio context
    };
  }, []);

  return {
    isPlaying,
    startMetronome,
    stopMetronome,
    volume,
    setVolume,
    tempo,
    setTempo,
    updateTempo,
    soundType,
    setSoundType,
  };
};
