// One place that knows which environment variable holds the ElevenLabs key.
//
// Why this exists: a key rotation left the live edge-functions container with
// ELEVENLABS_API_KEY_1 populated and ELEVENLABS_API_KEY present but EMPTY.
// Two functions (tts, conversation-token) had already grown a private
// fallback chain and kept working. The other five read only the old name and
// went dead — including elevenlabs-scribe-token, which mints the microphone's
// transcription token, so the assistant silently stopped hearing anything the
// user said. Nothing logged, nothing alerted; the mic just did nothing.
//
// Rotating a key should never again mean auditing seven files. Add the new
// variable name to the front of this list and every caller follows.

export const ELEVENLABS_KEY_VARS = [
  'ELEVENLABS_API_KEY_1',
  'ELEVENLABS_API_KEY',
] as const;

// Reads through Deno.env where it exists and process.env otherwise, so the
// same function is exercised by the vitest suite that guards it.
function readEnv(name: string): string | undefined {
  const denoEnv = (globalThis as { Deno?: { env?: { get(k: string): string | undefined } } }).Deno?.env;
  if (denoEnv) return denoEnv.get(name);
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

/**
 * The configured ElevenLabs key, or null when there genuinely isn't one.
 *
 * An empty or whitespace-only value counts as absent — that is precisely the
 * state the container was in, and an existence check would have "found" it
 * and then sent an empty xi-api-key header to ElevenLabs.
 */
export function resolveElevenLabsKey(): string | null {
  for (const name of ELEVENLABS_KEY_VARS) {
    const value = readEnv(name);
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}
