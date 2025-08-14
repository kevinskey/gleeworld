import { useState, useRef, useCallback } from 'react';

export const useMetronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playClick = useCallback((isDownbeat = false) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    
    oscillator.frequency.value = isDownbeat ? 1000 : 800;
    oscillator.type = 'square';
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [volume]);

  const startMetronome = useCallback((tempo = 120) => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    const interval = (60 / tempo) * 1000;
    let beatCount = 0;
    
    intervalRef.current = setInterval(() => {
      playClick(beatCount % 4 === 0);
      beatCount++;
    }, interval);
  }, [isPlaying, playClick]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    volume,
    setVolume,
    startMetronome,
    stopMetronome
  };
};