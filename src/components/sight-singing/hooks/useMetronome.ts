import { useState, useCallback, useRef, useEffect } from 'react';
import { setupMobileAudioUnlock, forceUnlockAudio, getSharedAudioContext } from '@/utils/mobileAudioUnlock';

export type MetronomeSoundType = 'pitch' | 'click';

export const useMetronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [tempo, setTempo] = useState(120);
  const [soundType, setSoundType] = useState<MetronomeSoundType>('click');
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const tempoRef = useRef(120);
  const volumeRef = useRef(0.8);
  const soundTypeRef = useRef<MetronomeSoundType>('click');

  // Keep refs in sync
  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { soundTypeRef.current = soundType; }, [soundType]);

  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  const getAudioContext = useCallback((): AudioContext | null => {
    try {
      forceUnlockAudio();
      const ctx = getSharedAudioContext();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      return ctx;
    } catch (error) {
      console.error('Failed to get audio context:', error);
      return null;
    }
  }, []);

  const scheduleClick = useCallback((ctx: AudioContext, time: number) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const st = soundTypeRef.current;
      osc.frequency.value = st === 'click' ? 1000 : 800;
      osc.type = st === 'click' ? 'square' : 'sine';

      const vol = volumeRef.current;
      // Longer envelope for audibility: 80ms total
      gain.gain.setValueAtTime(vol * 0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.08);
    } catch (e) {
      console.warn('🎵 Metronome: Failed to schedule click:', e);
    }
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || !isPlayingRef.current) return;

    // Schedule notes up to 100ms ahead (lookahead window)
    const scheduleAheadTime = 0.1;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      scheduleClick(ctx, nextNoteTimeRef.current);
      const secondsPerBeat = 60.0 / tempoRef.current;
      nextNoteTimeRef.current += secondsPerBeat;
    }

    // Call scheduler again in ~25ms
    timerRef.current = window.setTimeout(scheduler, 25);
  }, [scheduleClick]);

  const stopMetronome = useCallback(() => {
    isPlayingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startMetronome = useCallback((bpm: number = tempo) => {
    if (isPlayingRef.current) {
      stopMetronome();
    }

    forceUnlockAudio();

    const ctx = getAudioContext();
    if (!ctx) {
      console.warn('🎵 Metronome: Failed to get audio context');
      return;
    }

    audioContextRef.current = ctx;

    if (ctx.state !== 'running') {
      ctx.resume();
    }

    setTempo(bpm);
    tempoRef.current = bpm;
    isPlayingRef.current = true;
    setIsPlaying(true);

    // Start scheduling from now
    nextNoteTimeRef.current = ctx.currentTime;
    scheduler();
  }, [tempo, stopMetronome, getAudioContext, scheduler]);

  const updateTempo = useCallback((newTempo: number) => {
    setTempo(newTempo);
    tempoRef.current = newTempo;
    // No need to restart — scheduler reads tempoRef on each iteration
  }, []);

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
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
