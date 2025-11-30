import { useState, useCallback, useRef, useEffect } from 'react';

export type MetronomeSoundType = 'pitch' | 'click';

export const useMetronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [tempo, setTempo] = useState(120);
  const [soundType, setSoundType] = useState<MetronomeSoundType>('pitch');
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended' || audioContextRef.current.state === 'closed') {
      try {
        await audioContextRef.current.resume();
        console.log('🔊 AudioContext resumed, state:', audioContextRef.current.state);
      } catch (error) {
        console.error('❌ Failed to resume AudioContext:', error);
        // Create new AudioContext if resume fails
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    }
    
    return audioContextRef.current;
  }, []);

  const playClick = useCallback(async (isDownbeat: boolean = false) => {
    const audioContext = await initAudioContext();
    if (!audioContext) {
      console.error('❌ AudioContext not available for metronome click');
      return;
    }
    
    console.log('🔊 Playing metronome click, AudioContext state:', audioContext.state);
    
    // Ensure AudioContext is running
    if (audioContext.state !== 'running') {
      console.warn('⚠️ AudioContext not running, attempting to start...');
      try {
        await audioContext.resume();
      } catch (error) {
        console.error('❌ Failed to resume AudioContext:', error);
        return;
      }
    }
    
    if (soundType === 'click') {
      // Non-pitched block/click sound using noise and filtering
      const bufferSize = audioContext.sampleRate * 0.05; // 50ms of noise
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = buffer;
      
      // High-pass filter for sharper click sound
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, audioContext.currentTime);
      
      const gainNode = audioContext.createGain();
      
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Louder click for downbeat
      const clickVolume = isDownbeat ? volume * 1.5 : volume * 0.8;
      gainNode.gain.setValueAtTime(clickVolume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
      
      noiseSource.start(audioContext.currentTime);
      noiseSource.stop(audioContext.currentTime + 0.05);
    } else {
      // Original pitched sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Higher pitch for downbeat, lower for other beats
      const pitchVolume = isDownbeat ? volume * 1.2 : volume * 0.9;
      oscillator.frequency.setValueAtTime(isDownbeat ? 1000 : 800, audioContext.currentTime);
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(pitchVolume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
    }
  }, [volume, soundType, initAudioContext]);

  const stopMetronome = useCallback(() => {
    console.log('🛑 stopMetronome called');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('✅ Metronome stopped');
    }
    setIsPlaying(false);
  }, []);

  const startMetronome = useCallback(async (bpm: number = tempo) => {
    console.log('🎵 startMetronome called with BPM:', bpm);
    if (intervalRef.current) {
      console.log('⚠️ Metronome already running, stopping first');
      stopMetronome();
    }
    
    // Initialize audio context first
    const audioContext = await initAudioContext();
    if (!audioContext) {
      console.error('❌ Failed to initialize AudioContext');
      return;
    }
    
    console.log('🔊 AudioContext state:', audioContext.state);
    
    setIsPlaying(true);
    setTempo(bpm);
    
    const interval = 60000 / bpm; // milliseconds per beat
    let beatCount = 0;

    // Play first click immediately
    console.log('🔔 Playing first metronome click');
    await playClick(true);
    beatCount++;

    intervalRef.current = setInterval(async () => {
      const isDownbeat = beatCount % 4 === 0;
      console.log('🥁 Metronome tick:', beatCount, isDownbeat ? '(downbeat)' : '');
      await playClick(isDownbeat);
      beatCount++;
    }, interval);
    
    console.log('✅ Metronome started successfully at', bpm, 'BPM with interval', interval, 'ms');
  }, [tempo, playClick, stopMetronome, initAudioContext]);

  // Live tempo update function - restart metronome with new tempo
  const updateTempo = useCallback((newTempo: number) => {
    setTempo(newTempo);
    if (isPlaying) {
      console.log('🔄 Live tempo update to', newTempo, 'BPM');
      // Restart metronome with new tempo
      startMetronome(newTempo);
    }
  }, [isPlaying, startMetronome]);

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
    setTempo,
    updateTempo, // New function for live tempo updates
    soundType,
    setSoundType,
  };
};