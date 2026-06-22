// /auth/callback — magic-link landing page.
//
// We don't trust supabase-js's `detectSessionInUrl` to fire reliably on
// self-hosted GoTrue (race conditions between client-module load and
// React mount, plus the implicit/PKCE flow type ambiguity). Instead we
// manually parse the URL fragment (#access_token=… &refresh_token=…)
// OR the query (?code=…) and feed it into `setSession` /
// `exchangeCodeForSession` directly. Anything left over → poll once,
// then surface the URL state on screen so failures self-debug.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState('Signing you in…');
  const [debug, setDebug] = useState<string>('');
  const [errored, setErrored] = useState(false);
  const routedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function routeAfterSession(userId: string) {
      if (routedRef.current) return;
      routedRef.current = true;
      const next = params.get('next') || '/academy';
      console.log('[AuthCallback] routing to', next, 'user', userId);
      supabase
        .from('gw_profiles_directory')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (cancelled) return;
          if (profile) {
            navigate(next, { replace: true });
          } else {
            navigate(`/onboarding?next=${encodeURIComponent(next)}`, { replace: true });
          }
        })
        .catch(() => {
          if (cancelled) return;
          navigate(next, { replace: true });
        });
    }

    async function run() {
      const fullUrl = window.location.href;
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const code = params.get('code');
      const errCode = params.get('error_code') || params.get('error') || hashParams.get('error');
      const errDesc = params.get('error_description') || hashParams.get('error_description');

      console.log('[AuthCallback] mount', {
        fullUrl,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasCode: !!code,
        errCode,
      });

      if (errCode) {
        console.error('[AuthCallback] auth error from URL', errCode, errDesc);
        setMsg(`Sign-in failed: ${errDesc || errCode}`);
        setErrored(true);
        return;
      }

      // Implicit flow — manually call setSession instead of waiting on
      // the SDK's hash-detection magic.
      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          // Clean the hash off the URL so refresh doesn't re-process it.
          try { window.history.replaceState({}, '', window.location.pathname + window.location.search); } catch { /* ignore */ }
          if (data.session) {
            routeAfterSession(data.session.user.id);
            return;
          }
        } catch (e) {
          console.error('[AuthCallback] setSession failed', e);
          setMsg('Sign-in failed — please request a new invite.');
          setDebug(`setSession error: ${String((e as Error)?.message ?? e)}`);
          setErrored(true);
          return;
        }
      }

      // PKCE flow.
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('[AuthCallback] exchangeCodeForSession error', error);
        } catch (e) {
          console.error('[AuthCallback] exchangeCodeForSession threw', e);
        }
      }

      // Last-resort poll — maybe the SDK already grabbed the session.
      const deadline = Date.now() + 6000;
      while (!routedRef.current && !cancelled && Date.now() < deadline) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          routeAfterSession(data.session.user.id);
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!routedRef.current && !cancelled) {
        console.error('[AuthCallback] no session detected', { fullUrl });
        setMsg('Sign-in link expired or invalid. Magic links can only be used once and last 1 hour — please ask your teacher to resend.');
        setDebug(`url=${fullUrl.slice(0, 160)}…`);
        setErrored(true);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <div className="text-center max-w-md space-y-3">
        {errored ? (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center mb-2">
              <span className="text-rose-600 text-2xl leading-none">!</span>
            </div>
            <p className="text-sm text-rose-700 font-medium">{msg}</p>
            {debug && <p className="text-[11px] text-muted-foreground/70 break-all">{debug}</p>}
            <button
              onClick={() => navigate('/auth', { replace: true })}
              className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Go to sign-in
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">{msg}</p>
            {debug && <p className="text-[11px] text-muted-foreground/70 mt-4 break-all">{debug}</p>}
          </>
        )}
      </div>
    </div>
  );
}
