import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { speak, stopSpeaking } from '@/lib/assistant/speech';
import { useAssistantVoice } from '@/lib/assistant/voices';
import type { BibleVerse } from '@/hooks/useBible';

/** A chunk of speech, optionally preceded by deliberate silence — how the
 *  daily readings hold a lector's pause between one reading and the next.
 *  Plain strings remain valid chunks with no pause. */
export interface SpokenChunk { text: string; pauseBeforeMs?: number }

/**
 * Speaks an ordered list of text chunks, one after another.
 *
 * Chunking matters: a whole chapter or a full Gospel reading is far past a
 * comfortable TTS payload, and one long request means a long silence before
 * anything plays. Chunked, playback starts almost immediately and can be
 * stopped part-way.
 *
 * A chunk's `pauseBeforeMs` inserts real client-side silence before it is
 * spoken (Kevin, 2026-08-17: the readings must not be plowed through — 5s
 * between them, like a lector). SSML breaks are not an option: the TTS
 * model caps them around 3s and sanitizeForSpeech would mangle the tags.
 */
export function useSpokenText(chunks: Array<string | SpokenChunk>) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  // Bumped on every stop so a late chunk from a cancelled run can tell that it
  // no longer belongs to the current playback.
  const runRef = useRef(0);
  // The user's own assistant voice (falls back to tenant/app default inside
  // speak() while still loading). Without this, readings always came out in
  // the app-default voice regardless of the chosen one.
  const { voiceId } = useAssistantVoice();

  const stop = useCallback(() => {
    runRef.current += 1;
    stopSpeaking();
    setPlaying(false);
    setIndex(null);
  }, []);

  // Never let audio outlive what it was reading.
  useEffect(() => stop, [stop]);

  const play = useCallback(async () => {
    const parts = chunks
      .map((c) => (typeof c === 'string' ? { text: c.trim() } : { ...c, text: c.text.trim() }))
      .filter((c) => c.text);
    if (!parts.length) return;
    runRef.current += 1;
    const run = runRef.current;
    setPlaying(true);

    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;

    for (let i = 0; i < parts.length; i++) {
      if (runRef.current !== run) return;
      if (i > 0 && parts[i].pauseBeforeMs) {
        // `playing` stays true through the gap — silence here is deliberate,
        // not finished. Stop must win DURING the gap too, hence the re-check
        // after the sleep.
        await new Promise((resolve) => setTimeout(resolve, parts[i].pauseBeforeMs));
        if (runRef.current !== run) return;
      }
      setIndex(i);
      await new Promise<void>((resolve) => {
        speak(parts[i].text, { accessToken, supabaseUrl: SUPABASE_URL, voiceId, onEnd: () => resolve() });
      });
    }

    if (runRef.current === run) {
      setPlaying(false);
      setIndex(null);
    }
  }, [chunks, voiceId]);

  return { playing, index, play, stop };
}

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
