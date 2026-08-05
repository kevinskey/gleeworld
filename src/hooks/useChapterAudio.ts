import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { speak, stopSpeaking } from '@/lib/assistant/speech';
import type { BibleVerse } from '@/hooks/useBible';

/**
 * Reads a chapter aloud through ElevenLabs.
 *
 * Reuses the assistant's `speak()` rather than calling elevenlabs-tts directly:
 * it already handles the voice id, the mute preference, the browser-TTS
 * fallback when there's no token, and guarantees onEnd on every path.
 *
 * Verses are spoken ONE AT A TIME rather than as one long request. A whole
 * chapter is far past a comfortable TTS payload — Psalm 119 is 176 verses —
 * and per-verse requests mean playback starts almost immediately, can be
 * stopped mid-chapter, and lets the UI show which verse is being read.
 *
 * SUPABASE_URL must be passed explicitly: this project derives its URL from
 * the tenant bootstrap at runtime, so without it speak() silently falls back
 * to the OS voice and ignores the tenant's ElevenLabs voice entirely.
 */
export function useChapterAudio(verses: BibleVerse[]) {
  const [playing, setPlaying] = useState(false);
  const [currentVerse, setCurrentVerse] = useState<number | null>(null);
  // Bumped on every stop so a late-arriving verse from a cancelled run can
  // check whether it still belongs to the current playback.
  const runRef = useRef(0);

  const stop = useCallback(() => {
    runRef.current += 1;
    stopSpeaking();
    setPlaying(false);
    setCurrentVerse(null);
  }, []);

  // Never let audio outlive the chapter — changing book or chapter mid-read
  // would otherwise keep reciting the previous one.
  useEffect(() => stop, [stop]);

  const play = useCallback(async () => {
    if (!verses.length) return;
    runRef.current += 1;
    const run = runRef.current;
    setPlaying(true);

    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;

    for (const v of verses) {
      if (runRef.current !== run) return; // stopped, or a new run started
      setCurrentVerse(v.verse);
      await new Promise<void>((resolve) => {
        speak(v.text, {
          accessToken,
          supabaseUrl: SUPABASE_URL,
          onEnd: () => resolve(),
        });
      });
    }

    if (runRef.current === run) {
      setPlaying(false);
      setCurrentVerse(null);
    }
  }, [verses]);

  return { playing, currentVerse, play, stop };
}
