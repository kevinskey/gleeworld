// In-app Jitsi meeting via iframe pointed at JaaS (8x8.vc) with a JWT.
//
// History: this used to load https://meet.jit.si directly, which since
// Jitsi's 2022 policy change requires every meeting to have a logged-in
// moderator. In WKWebView (iOS Capacitor) the moderator-login popup is
// blocked, producing the "Login popup was blocked by your browser"
// banner with the meeting stuck on "Asking to join meeting…".
//
// Fix: fetch a JaaS JWT via our `jaas-jwt-token` edge function and load
// 8x8.vc with that token embedded in the URL. JaaS rooms accept JWT
// participants directly — no second-factor login popup, works inside
// WKWebView.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { X, Video, Loader2, ExternalLink } from 'lucide-react';

interface JitsiMeetingPanelProps {
  roomName: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  isModerator?: boolean;
  onClose: () => void;
}

export function JitsiMeetingPanel({ roomName, userName, userEmail, userId, isModerator = false, onClose }: JitsiMeetingPanelProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: tokenError } = await supabase.functions.invoke('jaas-jwt-token', {
          body: { roomName, userName, userEmail, userId, isModerator },
        });
        if (tokenError) throw new Error(tokenError.message || 'Failed to get meeting token');
        if (!data?.token || !data?.appId) throw new Error('Invalid token response');

        // JaaS iframe URL. The room path MUST include the appId prefix for
        // JaaS tenant matching. Hash params turn off the prejoin screen
        // and deep-linking so the iframe lands the user straight in the
        // call without any "open in app" interstitials.
        const hash = [
          'config.prejoinConfig.enabled=false',
          'config.prejoinPageEnabled=false',
          'config.disableDeepLinking=true',
          'config.startWithAudioMuted=false',
          'config.startWithVideoMuted=false',
          `userInfo.displayName=${encodeURIComponent(`"${userName}"`)}`,
        ].join('&');
        const url = `https://8x8.vc/${data.appId}/${encodeURIComponent(roomName)}?jwt=${data.token}#${hash}`;
        if (!cancelled) setSrc(url);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to start meeting');
      }
    })();
    return () => { cancelled = true; };
  }, [roomName, userName, userEmail, userId, isModerator]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
        <span className="text-sm font-semibold flex items-center gap-2 truncate">
          <Video className="w-4 h-4 shrink-0 text-primary" /> <span className="truncate">Video meeting</span>
        </span>
        <div className="flex items-center gap-2">
          {src && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(src, '_blank', 'noopener')}
              title="Open in a new tab — useful for diagnosing JaaS errors"
            >
              <ExternalLink className="w-4 h-4 mr-1" /> Open externally
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Leave
          </Button>
        </div>
      </div>
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-sm font-semibold text-destructive">Couldn't start the meeting</p>
          <p className="text-xs text-muted-foreground max-w-md">{error}</p>
        </div>
      ) : !src ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Connecting…
        </div>
      ) : (
        <iframe
          title="Jitsi meeting"
          src={src}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          allowFullScreen
          className="flex-1 w-full border-0"
        />
      )}
    </div>
  );
}
