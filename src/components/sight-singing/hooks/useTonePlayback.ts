import { useState, useCallback } from 'react';

export const useTonePlayback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'click-only' | 'click-and-score'>('click-only');

  const startPlayback = useCallback((musicXML: string, tempo: number) => {
    setIsPlaying(true);
    // Simple playback simulation - in a real implementation, 
    // you would parse the MusicXML and play the notes using Tone.js
    setTimeout(() => {
      setIsPlaying(false);
    }, 5000);
  }, []);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    mode,
    setMode,
    startPlayback,
    stopPlayback
  };
};