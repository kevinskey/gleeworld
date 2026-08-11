import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adoptFragmentTokens, completeSpotifyCallback } from '@/lib/spotify';

/**
 * The one registered Spotify redirect lands here (apex — Spotify wants
 * exact URIs and we have ~50 tenant hosts). Two jobs:
 *  - ?code=… : exchange it (PKCE) and either finish locally or bounce the
 *    tokens to the originating tenant origin in a URL fragment.
 *  - #st=…  : we ARE that tenant origin — adopt the tokens and go home.
 */
export default function SpotifyCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (adoptFragmentTokens()) { navigate('/dashboard', { replace: true }); return; }
      const qs = new URLSearchParams(window.location.search);
      const code = qs.get('code');
      const state = qs.get('state');
      if (!code || !state) { setError(qs.get('error') || 'Spotify sent nothing back.'); return; }
      try {
        const dest = await completeSpotifyCallback(code, state);
        if (dest.startsWith('http')) window.location.replace(dest);
        else navigate(dest || '/dashboard', { replace: true });
      } catch {
        setError('Connecting Spotify failed — try again from the assistant.');
      }
    })();
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-sm text-muted-foreground">
      {error ?? 'Connecting Spotify…'}
    </div>
  );
}
