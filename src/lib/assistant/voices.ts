// Curated ElevenLabs voice options exposed to users in the assistant
// voice-picker. Voice IDs are ElevenLabs' pre-made public voices — stable
// across our account and free-tier compatible. Adding a voice here makes it
// pickable everywhere `useAssistantVoice()` is used.
//
// Special value `null` (rendered as "Browser default") means: skip
// ElevenLabs entirely and use the browser's SpeechSynthesis. Saves
// ElevenLabs quota and stays functional if ELEVENLABS_API_KEY is
// unavailable on the server.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

export interface AssistantVoice {
  id: string;          // ElevenLabs voice_id
  label: string;       // user-facing name
  description: string; // short tone/style hint
  gender: 'female' | 'male';
  /** Playback loudness trim. Library voices are mastered quieter than
   *  ElevenLabs premades, and the server deliberately keeps
   *  use_speaker_boost OFF (it clips the source MP3 — see
   *  elevenlabs-tts). Values > 1 are applied client-side through a
   *  WebAudio gain + limiter in speech.ts. Omit for premades (1.0). */
  gain?: number;
}

// Union of every voice previously offered in the main assistant, Office
// Hours (Aria), and The Lab — one canonical list so a user's choice is
// consistent across surfaces and adding/removing a voice is a one-line
// change here instead of a scavenger hunt.
export const ASSISTANT_VOICES: AssistantVoice[] = [
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica',  description: 'Warm, natural — the default',    gender: 'female' },
  // African American voices added from the ElevenLabs voice library
  // 2026-08-03 (Kevin's picks). These are shared-library voices added to
  // our account via POST /v1/voices/add — they are NOT premade voices, so
  // if TTS for one ever 404s, re-add it to the account before debugging.
  { id: '5V3TtHQpNbNMJIdXzmGC', label: 'Allison',  description: 'Natural, calm, welcoming',       gender: 'female' , gain: 1.7 },
  { id: 'YYsXMvvITqnbq9AYpUDk', label: 'Rene',     description: 'Calm, confident, powerful',      gender: 'female' , gain: 1.7 },
  { id: 'zWoalRDt5TZrmW4ROIA7', label: 'Brooklyn', description: 'New Yorker, conversational',     gender: 'female' , gain: 1.7 },
  { id: 'pOo9f7JLO1jJyqHtwenW', label: 'James',    description: 'Teaching and ministry warmth',   gender: 'male'   , gain: 1.7 },
  { id: 'iObeGmp9cQqqHByD4hTs', label: 'Rory',     description: 'Mellow, smooth, slightly deep',  gender: 'male'   , gain: 1.7 },
  { id: 'JMj1UeO6tBAXd3E8HyWb', label: 'Joseph',   description: 'Smooth, confident',              gender: 'male'   , gain: 1.7 },
  { id: 'dbABjyOGWVViRzFiwl1U', label: 'Anthony',  description: 'Deep, warm baritone',            gender: 'male'   , gain: 1.7 },
  { id: '9BWtsMINqrJLrRacOk9x', label: 'Aria',     description: 'Young, expressive',              gender: 'female' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah',    description: 'Soft, conversational',           gender: 'female' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura',    description: 'Clear, confident',               gender: 'female' },
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte',description: 'British, mature',                gender: 'female' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice',    description: 'Clear, professional',            gender: 'female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda',  description: 'Warm, friendly',                 gender: 'female' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily',     description: 'Gentle, soothing',               gender: 'female' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger',    description: 'Warm, natural male',             gender: 'male'   },
  { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George',   description: 'Warm, mature British male',      gender: 'male'   },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian',    description: 'Deep, resonant',                 gender: 'male'   },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel',   description: 'Deep, authoritative',            gender: 'male'   },
  { id: 'cjVigY5qzO86Huf0OWal', label: 'Eric',     description: 'Friendly, conversational',       gender: 'male'   },
];

// Sentinel for "use the browser's built-in speech synth" — non-null so we
// can distinguish "user picked browser default" from "user hasn't picked
// yet" (null → use the app default, currently Jessica).
export const BROWSER_VOICE_ID = 'browser';

export const DEFAULT_VOICE_ID = ASSISTANT_VOICES[0].id;

// Loudness trim for a voice id (1.0 when unknown/default). null/undefined
// resolves through the app default so the trim follows the actual voice.
export function voiceGain(voiceId: string | null | undefined): number {
  const id = voiceId ?? DEFAULT_VOICE_ID;
  return ASSISTANT_VOICES.find((v) => v.id === id)?.gain ?? 1;
}

export function voiceLabel(voiceId: string | null | undefined): string {
  if (!voiceId) return ASSISTANT_VOICES[0].label; // app default
  if (voiceId === BROWSER_VOICE_ID) return 'Browser default';
  return ASSISTANT_VOICES.find((v) => v.id === voiceId)?.label ?? 'Custom';
}

// Reads the TENANT's default assistant voice from gw_branding_settings —
// admin-managed on the Branding tab of Workspace Settings, applies to
// every user in the tenant. Returns `null` while loading (callers fall
// back to the app default). No setter here: the picker lives on the
// branding form; this hook is read-only.
/** The voice this person hears, resolved in order:
 *
 *    1. their own choice   (user_preferences.assistant_voice_id)
 *    2. the workspace's    (gw_branding_settings.assistant_voice_id)
 *    3. the app default
 *
 *  A personal choice is an OVERRIDE, not a replacement — leaving it unset
 *  keeps whatever the tenant branded, which is what every existing account
 *  does without any backfill. */
export function useAssistantVoice(): { voiceId: string | null; loading: boolean } {
  const { settings, isLoading } = useBrandingSettings();
  const { voiceId: mine, isLoading: mineLoading } = useMyAssistantVoice();
  return {
    voiceId: mine ?? settings.assistant_voice_id,
    loading: isLoading || mineLoading,
  };
}

/** Read + write this user's own voice choice. */
export function useMyAssistantVoice() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['my-assistant-voice'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<string | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return null;
      // Tenant-blind read (get_nav_prefs, SECURITY DEFINER): the row is
      // UNIQUE(user_id) and tenant-stamped by saves, so a direct select
      // went blind from any other tenant — the voice looked unsaved
      // (2026-08-13, same disease as the nav-prefs first-run loop).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_nav_prefs');
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as { assistant_voice_id?: string | null } | null)?.assistant_voice_id ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (voiceId: string | null) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not signed in.');
      // .select() and check the error: silent write failures have bitten this
      // codebase before on demo tenants.
      // SECURITY DEFINER save: a direct upsert 403s on the RESTRICTIVE
      // tenant policy whenever the row is stamped to another tenant —
      // "voices won't change and save" (2026-08-13).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('save_assistant_voice', { p_voice_id: voiceId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-assistant-voice'] });
    },
  });

  return { voiceId: query.data ?? null, isLoading: query.isLoading, save };
}

// ── Per-user, per-device voice override ──────────────────────────────────
// The tenant picks a default voice in Workspace Settings → Branding, but a
// user can pick their own from the assistant sheet ("on-page"). Stored in
// localStorage so it follows the device, not the tenant.
const VOICE_OVERRIDE_KEY = 'gw-assistant-voice';

export function getVoiceOverride(): string | null {
  try { return localStorage.getItem(VOICE_OVERRIDE_KEY); } catch { return null; }
}

export function setVoiceOverrideStored(id: string | null): void {
  try {
    if (id) localStorage.setItem(VOICE_OVERRIDE_KEY, id);
    else localStorage.removeItem(VOICE_OVERRIDE_KEY);
  } catch { /* private mode */ }
}
