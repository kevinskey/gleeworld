// Curated ElevenLabs voice options exposed to users in the assistant
// voice-picker. Voice IDs are ElevenLabs' pre-made public voices — stable
// across our account and free-tier compatible. Adding a voice here makes it
// pickable everywhere `useAssistantVoice()` is used.
//
// Special value `null` (rendered as "Browser default") means: skip
// ElevenLabs entirely and use the browser's SpeechSynthesis. Saves
// ElevenLabs quota and stays functional if ELEVENLABS_API_KEY is
// unavailable on the server.

import { useBrandingSettings } from '@/hooks/useBrandingSettings';

export interface AssistantVoice {
  id: string;          // ElevenLabs voice_id
  label: string;       // user-facing name
  description: string; // short tone/style hint
  gender: 'female' | 'male';
}

// Union of every voice previously offered in the main assistant, Office
// Hours (Aria), and The Lab — one canonical list so a user's choice is
// consistent across surfaces and adding/removing a voice is a one-line
// change here instead of a scavenger hunt.
export const ASSISTANT_VOICES: AssistantVoice[] = [
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica',  description: 'Warm, natural — the default',    gender: 'female' },
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
export function useAssistantVoice(): { voiceId: string | null; loading: boolean } {
  const { settings, isLoading } = useBrandingSettings();
  return { voiceId: settings.assistant_voice_id, loading: isLoading };
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
