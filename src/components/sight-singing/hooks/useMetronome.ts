import { useState, useCallback, useRef, useEffect } from 'react';
import { unlockAudioContext, setupMobileAudioUnlock, forceUnlockAudio } from '@/utils/mobileAudioUnlock';

export type MetronomeSoundType = 'pitch' | 'click';

export const useMetronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [tempo, setTempo] = useState(120);
  const [soundType, setSoundType] = useState<MetronomeSoundType>('click');
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isUnlockingRef = useRef(false);

  // Setup mobile audio unlock on mount
  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  const getAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    try {
      // Prevent multiple simultaneous unlock attempts
      if (isUnlockingRef.current) {
        // Wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 100));
        return audioContextRef.current;
      }
      
      isUnlockingRef.current = true;
      
      // Use the shared unlock utility for iOS compatibility
      const ctx = await unlockAudioContext();
      audioContextRef.current = ctx;
      
      // Extra check for mobile - ensure it's really running
      if (ctx.state !== 'running') {
        console.log('🎵 Metronome: Context not running, attempting resume...');
        await ctx.resume();
        // Give iOS a moment
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      isUnlockingRef.current = false;
      return ctx;
    } catch (error) {
      console.error('Failed to get audio context:', error);
      isUnlockingRef.current = false;
      return null;
    }
  }, []);

  const playClick = useCallback(async () => {
    const ctx = await getAudioContext();
    if (!ctx) {
      console.warn('🎵 Metronome: No audio context available');
      return;
    }
    
    // On mobile, context might go back to suspended
    if (ctx.state === 'suspended') {
      console.log('🎵 Metronome: Context suspended, resuming...');
      await ctx.resume();
    }
    
    if (ctx.state !== 'running') {
      console.warn('🎵 Metronome: Context not in running state:', ctx.state);
      return;
    }
    
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
    
    // Force unlock audio on iOS - must happen during user gesture
    await forceUnlockAudio();
    
    const ctx = await getAudioContext();
    if (!ctx) {
      console.warn('🎵 Metronome: Failed to get audio context');
      return;
    }
    
    // Extra iOS workaround: ensure context is running
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
        // Give iOS time to actually start the context
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (e) {
        console.warn('🎵 Metronome: Failed to resume context', e);
      }
    }
    
    if (ctx.state !== 'running') {
      console.warn('🎵 Metronome: Context still not running after resume:', ctx.state);
      return;
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
