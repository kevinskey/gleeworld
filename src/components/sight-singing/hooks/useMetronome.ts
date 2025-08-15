import { useState, useCallback, useRef, useEffect } from 'react';

export const useMetronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [tempo, setTempo] = useState(120);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playClick = useCallback((isDownbeat: boolean = false) => {
    const audioContext = initAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Higher pitch for downbeat, lower for other beats
    oscillator.frequency.setValueAtTime(isDownbeat ? 1000 : 800, audioContext.currentTime);
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }, [volume, initAudioContext]);

  const startMetronome = useCallback((bpm: number = tempo) => {
    if (intervalRef.current) return;
    
    setIsPlaying(true);
    setTempo(bpm);
    
    const interval = 60000 / bpm; // milliseconds per beat
    let beatCount = 0;

    // Play first click immediately
    playClick(true);
    beatCount++;

    intervalRef.current = setInterval(() => {
      const isDownbeat = beatCount % 4 === 0;
      playClick(isDownbeat);
      beatCount++;
    }, interval);
  }, [tempo, playClick]);

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMetronome();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopMetronome]);

  return {
    isPlaying,
    startMetronome,
    stopMetronome,
    volume,
    setVolume,
    tempo,
    setTempo
  };
};