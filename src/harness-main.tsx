// Dev-only harness that mounts the REAL audio-companion stack exactly the
// way ViewerReader does: AudioCompanionProvider at the top, then the
// AudioCompanionControls strip. Used by scripts/companion-harness.spec to
// exercise the YouTube + Apple Music paths headlessly, with no auth.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AudioCompanionProvider, useAudioCompanion } from '@/contexts/AudioCompanionContext';
import { AudioCompanionControls } from '@/components/music-library/AudioCompanionControls';
import './index.css';

const qc = new QueryClient();

// Mirrors the state the context holds so the Playwright spec can assert on
// it via plain DOM reads instead of poking React internals.
function StateProbe() {
  const s = useAudioCompanion();
  return (
    <pre
      id="probe"
      data-audio-source={s.audioSource ?? 'none'}
      data-is-playing={String(s.isPlaying)}
      data-player-ready={String(s.playerReady)}
      data-needs-auth={String(s.appleMusicNeedsAuth)}
      style={{ fontSize: 11 }}
    >
      {JSON.stringify(
        {
          audioSource: s.audioSource,
          isPlaying: s.isPlaying,
          isLoading: s.isLoading,
          playerReady: s.playerReady,
          currentTime: Math.round(s.currentTime * 10) / 10,
          duration: Math.round(s.duration),
          appleMusicNeedsAuth: s.appleMusicNeedsAuth,
          appleMusicAuthError: s.appleMusicAuthError,
          audioFileName: s.audioFileName,
        },
        null,
        2,
      )}
    </pre>
  );
}

function Harness() {
  // Same toggle shape as ViewerReader's header strip.
  const [on, setOn] = useState(true);
  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 14 }}>Audio Companion Harness</h1>
      <button id="toggle-strip" onClick={() => setOn((v) => !v)}>
        toggle strip
      </button>
      {on && (
        <div className="px-2 py-1 bg-background/95 border-b border-border">
          <AudioCompanionControls
            className="bg-transparent border-0 shadow-none rounded-none px-0 py-0"
            onClose={() => setOn(false)}
          />
        </div>
      )}
      <StateProbe />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}>
    <AudioCompanionProvider>
      <Harness />
      <Toaster />
    </AudioCompanionProvider>
  </QueryClientProvider>,
);
