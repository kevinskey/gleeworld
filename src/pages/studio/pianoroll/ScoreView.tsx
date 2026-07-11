// Read-only engraved view of a MIDI clip (piano roll's "Score" toggle).
// OSMD is ~1MB, so it's imported lazily on first open — the studio
// bundle doesn't pay for it until someone actually looks at notation.
// White background on purpose: engraving is black-on-paper; OSMD's
// glyphs are not theme-aware and would vanish on the dark studio card.

import { useEffect, useRef, useState } from 'react';

export function ScoreView({ xml, height }: { xml: string; height: number }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('loading');
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
        if (cancelled || !holderRef.current) return;
        holderRef.current.innerHTML = '';
        const osmd = new OpenSheetMusicDisplay(holderRef.current, {
          autoResize: false,
          backend: 'svg',
          drawTitle: false,
          drawSubtitle: false,
          drawComposer: false,
          drawPartNames: false,
        });
        await osmd.load(xml);
        if (cancelled) return;
        osmd.Zoom = 0.75;
        osmd.render();
        setStatus('ready');
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : String(e)); setStatus('error'); }
      }
    })();
    return () => { cancelled = true; };
  }, [xml]);

  return (
    <div className="overflow-auto bg-white rounded-b-md" style={{ height }} data-testid="piano-roll-score">
      {status === 'loading' && <div className="text-xs text-neutral-500 p-3">Rendering score…</div>}
      {status === 'error' && <div className="text-xs text-rose-600 p-3">Score render failed: {error}</div>}
      <div ref={holderRef} className="px-2 py-1" />
    </div>
  );
}
