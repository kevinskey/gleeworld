import { useState, useCallback } from 'react';

export const useMetronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const startMetronome = useCallback(() => {
    setIsPlaying(true);
    // Mock metronome implementation
  }, []);

  const stopMetronome = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    startMetronome,
    stopMetronome,
    volume,
    setVolume
  };
};