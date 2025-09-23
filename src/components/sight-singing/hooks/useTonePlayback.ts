import { useState, useCallback, useEffect, useRef } from 'react';
import { MusicXMLPlayer } from '../utils/audioPlayback';
import { parseMusicXML } from '../utils/musicXMLParser';

export const useTonePlayback = (soundSettings?: { notes: string; click: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'click-only' | 'click-and-score' | 'pitch-only' | 'record'>('click-only');
  const playerRef = useRef<MusicXMLPlayer | null>(null);
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const opIdRef = useRef(0);
  const transitioningRef = useRef(false);

  useEffect(() => {
    // Initialize player
    playerRef.current = new MusicXMLPlayer();
    
    return () => {
      // Cleanup on unmount
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  const startPlayback = useCallback(async (musicXML: string, tempo: number, overrideMode?: 'click-only' | 'click-and-score' | 'pitch-only' | 'record') => {
    console.log('🎼 useTonePlayback.startPlayback called');
    
    // Check if transitioning and wait briefly if needed
    if (transitioningRef.current) {
      console.log('⚠️ Already transitioning, waiting...');
      await new Promise(resolve => setTimeout(resolve, 50));
      if (transitioningRef.current) {
        console.log('⚠️ Still transitioning, aborting...');
        return;
      }
    }
    
    transitioningRef.current = true;
    const currentOpId = ++opIdRef.current;
    console.log('🎼 Operation ID:', currentOpId);
    
    // Clear any existing auto-stop timer
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
      console.log('🎼 Cleared existing auto-stop timer');
    }
    
    const activeMode = overrideMode || mode;
    console.log('🎼 Input validation:', {
      playerExists: !!playerRef.current,
      musicXMLLength: musicXML.length,
      tempo,
      activeMode,
      soundSettings,
      opId: currentOpId
    });
    
    if (!playerRef.current) {
      console.error('❌ No playerRef.current available');
      transitioningRef.current = false;
      return;
    }
    
    try {
      console.log('🎼 Setting isPlaying to true...');
      setIsPlaying(true);
      
      // Parse the MusicXML
      console.log('🎼 About to parse MusicXML...');
      const parsedScore = parseMusicXML(musicXML, tempo);
      console.log('🎼 MusicXML parsed successfully:', {
        measuresCount: parsedScore.measures.length,
        totalDuration: parsedScore.totalDuration,
        tempo: parsedScore.tempo,
        firstMeasureNotes: parsedScore.measures[0]?.notes?.length || 0
      });
      
      // Check if we have notes to play
      const totalNotes = parsedScore.measures.reduce((total, measure) => total + (measure.notes?.length || 0), 0);
      console.log('🎼 Total notes to play:', totalNotes);
      
      if (totalNotes === 0) {
        console.warn('⚠️ No notes found in parsed score - this will be click-only playback');
      }
      
      // Play the score with sound settings
      console.log('🎼 About to call playerRef.current.playScore with:', {
        activeMode,
        soundSettings,
        parsedScore: {
          measures: parsedScore.measures.length,
          tempo: parsedScore.tempo,
          totalDuration: parsedScore.totalDuration
        }
      });
      
      if (activeMode !== 'record') {
        await playerRef.current.playScore(parsedScore, activeMode, soundSettings);
      }
      console.log('✅ playerRef.current.playScore completed');
      
      // Set up auto-stop timer with opId check
      const totalDuration = parsedScore.totalDuration + (60 / tempo * parsedScore.timeSignature.beats) + 1;
      console.log('🎼 Setting auto-stop timer for:', totalDuration, 'seconds');
      autoStopTimeoutRef.current = setTimeout(() => {
        if (opIdRef.current === currentOpId) {
          console.log('⏰ Auto-stop timer triggered for opId:', currentOpId);
          setIsPlaying(false);
        } else {
          console.log('⏰ Auto-stop timer ignored - stale opId:', currentOpId, 'vs current:', opIdRef.current);
        }
      }, totalDuration * 1000);
      
      transitioningRef.current = false;
      
    } catch (error) {
      console.error('❌ Playback error in useTonePlayback:', error);
      setIsPlaying(false);
      transitioningRef.current = false;
      throw error; // Re-throw so handleStartPlayback can catch it
    }
  }, [mode, soundSettings]);

  const stopPlayback = useCallback(() => {
    console.log('🛑 stopPlayback called');
    
    // Increment opId to invalidate any pending callbacks
    const currentOpId = ++opIdRef.current;
    console.log('🛑 New opId:', currentOpId);
    
    // Clear auto-stop timer
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
      console.log('🛑 Cleared auto-stop timer');
    }
    
    // Stop player
    if (playerRef.current) {
      playerRef.current.stop();
    }
    
    setIsPlaying(false);
    transitioningRef.current = false;
  }, []);

  return {
    isPlaying,
    mode,
    setMode,
    startPlayback,
    stopPlayback
  };
};