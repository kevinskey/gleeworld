import { useState, useCallback, useRef, useEffect } from 'react';
import { unlockAudioContext, setupMobileAudioUnlock, forceUnlockAudio, getSharedAudioContext } from '@/utils/mobileAudioUnlock';

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

  const getAudioContext = useCallback((): AudioContext | null => {
    try {
      // Force unlock synchronously (critical for iOS)
      forceUnlockAudio();
      
      // Get shared audio context
      const ctx = getSharedAudioContext();
      audioContextRef.current = ctx;
      
      // Resume if suspended (fire and forget)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      return ctx;
    } catch (error) {
      console.error('Failed to get audio context:', error);
      return null;
    }
  }, []);

  const playClick = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      console.warn('🎵 Metronome: No audio context available');
      return;
    }
    
    // On mobile, context might go back to suspended - resume inline
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore, try to play anyway
      }
    }
    
    if (ctx.state !== 'running') {
      return;
    }
    
    try {
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
    } catch (e) {
      console.warn('🎵 Metronome: Failed to play click:', e);
    }
  }, [volume, soundType]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startMetronome = useCallback((bpm: number = tempo) => {
    if (intervalRef.current) {
      stopMetronome();
    }
    
    // Force unlock audio on iOS - synchronous call within user gesture
    forceUnlockAudio();
    
    const ctx = getAudioContext();
    if (!ctx) {
      console.warn('🎵 Metronome: Failed to get audio context');
      return;
    }
    
    // Store reference for playClick to use
    audioContextRef.current = ctx;
    
    // Resume if needed (fire and forget)
    if (ctx.state !== 'running') {
      ctx.resume();
    }
    
    setIsPlaying(true);
    setTempo(bpm);
    
    const intervalMs = 60000 / bpm;
    
    // Play first click immediately
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
