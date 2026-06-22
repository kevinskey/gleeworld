// Sandbox launcher for the real-product tour.
//
// Flow when ?key=preview is present:
//   1. If a session already exists, redirect to /dashboard?tour=admin.
//   2. Otherwise, sign in as the demo viewer using the public popup creds.
//   3. Wait for AuthContext to actually report `user` populated, then
//      navigate. Doing this in two passes avoids a brief flash to /auth
//      caused by ProtectedRoute seeing `user === null` between the
//      supabase signin resolving and the auth state listener firing.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const DEMO_EMAIL = 'demo-admin@gleeworld.org';
const DEMO_PASSWORD = 'GleeDemo2026';
const TOUR_TARGET = '/dashboard?tour=admin';

type Status = 'idle' | 'signing-in' | 'awaiting-session' | 'redirecting' | 'error';

export default function TourSandbox() {
  const [params] = useSearchParams();
  const allowed = params.get('key') === 'preview';
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const signInTriggeredRef = useRef(false);

  useEffect(() => {
    if (!allowed) return;
    if (loading) return;

    // Pass 2: AuthContext has populated `user`. Safe to redirect now — the
    // ProtectedRoute on /dashboard will see a truthy user and let us through.
    if (user) {
      setStatus('redirecting');
      navigate(TOUR_TARGET, { replace: true });
      return;
    }

    // Pass 1: not signed in. Kick off the signin exactly once. We don't
    // navigate here — once the auth state listener fires, this effect
    // re-runs with user populated and the block above handles redirect.
    if (signInTriggeredRef.current) return;
    signInTriggeredRef.current = true;

    let cancelled = false;
    setStatus('signing-in');

    (async () => {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (cancelled) return;
      if (authError) {
        setError(authError.message);
        setStatus('error');
        signInTriggeredRef.current = false; // allow retry
        return;
      }
      // Belt-and-suspenders: also drop a redirectAfterAuth so any
      // ProtectedRoute intercept routes back here.
      try {
        sessionStorage.setItem('redirectAfterAuth', TOUR_TARGET);
      } catch {
        /* private mode: ignore */
      }
      setStatus('awaiting-session');
    })();

    return () => {
      cancelled = true;
    };
  }, [allowed, loading, user, navigate]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold mb-2">Sandbox locked</h1>
          <p className="text-slate-400 text-sm">
            Append <code className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">?key=preview</code> to the URL to enter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 text-white"
      style={{ background: 'linear-gradient(135deg,#0a0518 0%,#1a0f3a 50%,#0a0518 100%)' }}
    >
      <div className="text-center max-w-md">
        {status === 'error' ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Couldn't start the tour</h1>
            <p className="text-slate-300 text-sm mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStatus('idle');
                }}
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold"
                style={{ background: 'linear-gradient(90deg,#3b82f6 0%,#8b5cf6 50%,#c084fc 100%)' }}
              >
                Try again
              </button>
              <a
                href="/auth?email=demo-admin@gleeworld.org&returnTo=/dashboard?tour=admin"
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold border border-white/30"
              >
                Sign in manually
              </a>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white/80" />
            <h1 className="text-xl font-bold mb-1">Starting the tour…</h1>
            <p className="text-slate-300 text-sm">
              {status === 'signing-in'
                ? 'Signing in as the demo viewer.'
                : status === 'awaiting-session'
                  ? 'Establishing session…'
                  : status === 'redirecting'
                    ? 'Loading your Command Center.'
                    : 'Preparing…'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
