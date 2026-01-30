// Microphone permission helper
//
// Why this exists:
// - Some browsers won't prompt for SpeechRecognition until a getUserMedia call happens.
// - If we call getUserMedia just to trigger the prompt, we MUST stop tracks immediately
//   or the mic can remain in-use and interfere with other audio/recognition flows.

export type MicPermissionResult =
  | { ok: true }
  | { ok: false; reason: 'not-supported' | 'denied' | 'error'; error?: unknown };

export const requestMicrophonePermission = async (): Promise<MicPermissionResult> => {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'not-supported' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Important: stop immediately — we only needed the permission prompt.
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (error: any) {
    const name = error?.name as string | undefined;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return { ok: false, reason: 'denied', error };
    }
    return { ok: false, reason: 'error', error };
  }
};
