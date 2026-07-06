// /try — one-click demo entry (linked from gleeworld.org "Try the demo").
// Mints a Director session via demo-login and drops the prospect into the
// Command Center. Full-page redirect (not navigate()) so AuthContext and
// every JWT-derived hook boot cleanly against the fresh session.

import { useEffect, useRef, useState } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { startDemoSession, DEMO_HOME, claimsToDemoRole, decodeJwtClaims } from '@/lib/demoSession';
import { supabase } from '@/integrations/supabase/client';

export default function TryDemo() {
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return; // StrictMode double-invoke guard
    started.current = true;
    (async () => {
      try {
        // Don't clobber a real signed-in session (e.g. the demo-admin curator):
        // only prospects (no session, or an existing demo-viewer session) get a
        // fresh demo login.
        const { data } = await supabase.auth.getSession();
        const existing = data.session?.access_token;
        if (existing && !claimsToDemoRole(decodeJwtClaims(existing))) {
          window.location.replace(DEMO_HOME.director);
          return;
        }

        await startDemoSession('director');
        sessionStorage.setItem('gw-demo-welcome-pending', '1');
        window.location.replace(DEMO_HOME.director);
      } catch (e) {
        console.error('[try-demo] failed', e);
        setFailed(true);
        window.setTimeout(() => window.location.replace('/auth?demoError=1'), 1500);
      }
    })();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, hsl(187 80% 35% / 0.55) 0%, transparent 50%), ' +
          'radial-gradient(ellipse at 75% 80%, hsl(271 75% 45% / 0.55) 0%, transparent 55%), ' +
          'linear-gradient(135deg, hsl(220 60% 12%) 0%, hsl(265 50% 18%) 50%, hsl(290 45% 20%) 100%)',
      }}
    >
      <img src="/lovable-uploads/gleeworld-logo.png" alt="GleeWorld" className="h-14 drop-shadow-lg" />
      {failed ? (
        <p className="text-white/90 text-sm font-medium">
          The demo hit a snag — taking you to sign-in…
        </p>
      ) : (
        <>
          <LoadingSpinner size="lg" />
          <p className="text-white/90 text-sm font-medium">Opening the Harmony Hall Choir demo…</p>
        </>
      )}
    </div>
  );
}
