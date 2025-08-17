import { useState, useCallback, useEffect, useRef } from 'react';
import { MusicXMLPlayer } from '../utils/audioPlayback';
import { parseMusicXML } from '../utils/musicXMLParser';

export const useTonePlayback = (soundSettings?: { notes: string; click: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'click-only' | 'click-and-score'>('click-only');
  const playerRef = useRef<MusicXMLPlayer | null>(null);

  useEffect(() => {
    // Initialize player
    playerRef.current = new MusicXMLPlayer();
    
    return () => {
      // Cleanup on unmount
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  const startPlayback = useCallback(async (musicXML: string, tempo: number) => {
    if (!playerRef.current) return;
    
    try {
      console.log('Starting playback...', { mode, tempo, soundSettings });
      setIsPlaying(true);
      
      // Parse the MusicXML
      const parsedScore = parseMusicXML(musicXML, tempo);
      console.log('Parsed score:', parsedScore);
      
      // Play the score with sound settings
      await playerRef.current.playScore(parsedScore, mode, soundSettings);
      
      // Set up auto-stop timer
      const totalDuration = parsedScore.totalDuration + (60 / tempo * parsedScore.timeSignature.beats) + 1;
      setTimeout(() => {
        setIsPlaying(false);
      }, totalDuration * 1000);
      
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
  }, [mode, soundSettings]);

  const stopPlayback = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
    }
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