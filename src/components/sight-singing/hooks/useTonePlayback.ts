import { useState, useCallback, useEffect, useRef } from 'react';
import { MusicXMLPlayer } from '../utils/audioPlayback';
import { parseMusicXML } from '../utils/musicXMLParser';

export const useTonePlayback = (soundSettings?: { notes: string; click: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'click-only' | 'click-and-score' | 'pitch-only'>('click-only');
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
    console.log('🎼 useTonePlayback.startPlayback called');
    console.log('🎼 playerRef.current exists:', !!playerRef.current);
    console.log('🎼 musicXML length:', musicXML.length);
    console.log('🎼 tempo:', tempo);
    console.log('🎼 mode:', mode);
    console.log('🎼 soundSettings:', soundSettings);
    
    if (!playerRef.current) {
      console.error('❌ No playerRef.current available');
      return;
    }
    
    try {
      console.log('🎼 Starting playback...', { mode, tempo, soundSettings });
      setIsPlaying(true);
      
      // Parse the MusicXML
      console.log('🎼 About to parse MusicXML...');
      const parsedScore = parseMusicXML(musicXML, tempo);
      console.log('🎼 Parsed score:', parsedScore);
      console.log('🎼 Number of measures:', parsedScore.measures.length);
      console.log('🎼 Total duration:', parsedScore.totalDuration);
      
      // Check if we have notes to play
      const totalNotes = parsedScore.measures.reduce((total, measure) => total + measure.notes.length, 0);
      console.log('🎼 Total notes to play:', totalNotes);
      
      if (totalNotes === 0) {
        console.warn('⚠️ No notes found in parsed score');
      }
      
      // Play the score with sound settings
      console.log('🎼 About to call playerRef.current.playScore...');
      await playerRef.current.playScore(parsedScore, mode, soundSettings);
      console.log('✅ playerRef.current.playScore completed');
      
      // Set up auto-stop timer
      const totalDuration = parsedScore.totalDuration + (60 / tempo * parsedScore.timeSignature.beats) + 1;
      console.log('🎼 Setting auto-stop timer for:', totalDuration, 'seconds');
      setTimeout(() => {
        console.log('⏰ Auto-stop timer triggered');
        setIsPlaying(false);
      }, totalDuration * 1000);
      
    } catch (error) {
      console.error('❌ Playback error in useTonePlayback:', error);
      setIsPlaying(false);
      throw error; // Re-throw so handleStartPlayback can catch it
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