import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setupMobileAudioUnlock } from '@/utils/mobileAudioUnlock';

export type NotificationSoundType = 'poll' | 'message' | 'announcement' | 'success' | 'warning';

interface NotificationSound {
  id: string;
  sound_type: string;
  storage_path: string;
}

interface UseNotificationSoundsReturn {
  playSound: (type: NotificationSoundType) => Promise<void>;
  isLoaded: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export const useNotificationSounds = (): UseNotificationSoundsReturn => {
  const [sounds, setSounds] = useState<Map<string, HTMLAudioElement>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('notification-sounds-enabled');
    return stored !== null ? stored === 'true' : true;
  });
  const [volume, setVolumeState] = useState(() => {
    const stored = localStorage.getItem('notification-sounds-volume');
    return stored !== null ? parseFloat(stored) : 0.7;
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context and preload sounds
  useEffect(() => {
    const loadSounds = async () => {
      try {
        // Setup mobile audio unlock
        setupMobileAudioUnlock();

        // Fetch available sounds from database
        const { data: soundRecords, error } = await supabase
          .from('notification_sounds')
          .select('*');

        if (error) {
          console.error('Error fetching notification sounds:', error);
          return;
        }

        if (!soundRecords || soundRecords.length === 0) {
          console.log('No notification sounds configured yet');
          setIsLoaded(true);
          return;
        }

        // Preload each sound
        const soundMap = new Map<string, HTMLAudioElement>();
        
        for (const record of soundRecords) {
          const { data: urlData } = supabase.storage
            .from('notification-sounds')
            .getPublicUrl(record.storage_path);

          if (urlData?.publicUrl) {
            const audio = new Audio(urlData.publicUrl);
            audio.preload = 'auto';
            audio.volume = volume;
            
            // Wait for audio to be ready
            await new Promise<void>((resolve) => {
              audio.addEventListener('canplaythrough', () => resolve(), { once: true });
              audio.addEventListener('error', () => {
                console.error(`Failed to load sound: ${record.sound_type}`);
                resolve();
              }, { once: true });
              audio.load();
            });

            soundMap.set(record.sound_type, audio);
          }
        }

        setSounds(soundMap);
        setIsLoaded(true);
        console.log(`Loaded ${soundMap.size} notification sounds`);
      } catch (error) {
        console.error('Error loading notification sounds:', error);
        setIsLoaded(true);
      }
    };

    loadSounds();
  }, []);

  // Update volume on all loaded sounds
  useEffect(() => {
    sounds.forEach((audio) => {
      audio.volume = volume;
    });
    localStorage.setItem('notification-sounds-volume', volume.toString());
  }, [volume, sounds]);

  // Persist sound enabled preference
  useEffect(() => {
    localStorage.setItem('notification-sounds-enabled', soundEnabled.toString());
  }, [soundEnabled]);

  const playSound = useCallback(async (type: NotificationSoundType) => {
    if (!soundEnabled) return;

    const audio = sounds.get(type);
    if (!audio) {
      console.log(`Sound not available for type: ${type}`);
      return;
    }

    try {
      // Reset to beginning if already playing
      audio.currentTime = 0;
      audio.volume = volume;
      await audio.play();
    } catch (error) {
      console.error(`Error playing notification sound (${type}):`, error);
    }
  }, [sounds, soundEnabled, volume]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  }, []);

  return {
    playSound,
    isLoaded,
    soundEnabled,
    setSoundEnabled,
    volume,
    setVolume,
  };
};
