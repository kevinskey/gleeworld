import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Video, VideoOff, Mic, MicOff, PhoneOff, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JitsiMeetRoomProps {
  roomName: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  isModerator?: boolean;
  onClose?: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const JitsiMeetRoom: React.FC<JitsiMeetRoomProps> = ({
  roomName,
  userName,
  userEmail,
  userId,
  isModerator = false,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const { toast } = useToast();
  
  // Stabilize callbacks to prevent useEffect re-runs
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let mounted = true;
    
    const initJitsi = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get JWT token from edge function
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('jaas-jwt-token', {
          body: {
            roomName,
            userName,
            userEmail,
            userId,
            isModerator
          }
        });

        if (tokenError) {
          throw new Error(tokenError.message || 'Failed to get meeting token');
        }

        if (!tokenData?.token || !tokenData?.appId) {
          throw new Error('Invalid token response');
        }

        // Debug (safe): verify the browser is using the expected kid/sub from the JWT
        try {
          const [headerB64, payloadB64] = String(tokenData.token).split('.');
          const header = JSON.parse(atob(headerB64));
          const payload = JSON.parse(atob(payloadB64));
          console.log('JaaS JWT debug:', {
            kid: header?.kid,
            sub: payload?.sub,
            room: payload?.room,
            appId: tokenData.appId,
          });
        } catch (e) {
          console.warn('Failed to decode JWT for debug:', e);
        }

        // Load Jitsi API script if not already loaded
        if (!window.JitsiMeetExternalAPI) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            // Use the appId from the token response for the correct tenant
            script.src = `https://8x8.vc/${tokenData.appId}/external_api.js`;
            script.async = true;
            script.onload = () => {
              console.log('Jitsi API script loaded successfully');
              resolve();
            };
            script.onerror = (e) => {
              console.error('Failed to load Jitsi API script:', e);
              reject(new Error('Failed to load Jitsi API'));
            };
            document.head.appendChild(script);
          });
        }

        if (!mounted || !containerRef.current) return;

        // Initialize Jitsi Meet
        // For JaaS (8x8.vc), the roomName MUST include the appId prefix for tenant matching.
        const domain = '8x8.vc';
        const options = {
          roomName: `${tokenData.appId}/${roomName}`,
          jwt: tokenData.token,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableClosePage: false,
            enableWelcomePage: false,
            toolbarButtons: [
              'camera',
              'chat',
              'closedcaptions',
              'desktop',
              'download',
              'embedmeeting',
              'etherpad',
              'feedback',
              'filmstrip',
              'fullscreen',
              'hangup',
              'help',
              'highlight',
              'invite',
              'linktosalesforce',
              'livestreaming',
              'microphone',
              'mute-everyone',
              'mute-video-everyone',
              'participants-pane',
              'profile',
              'raisehand',
              'recording',
              'security',
              'select-background',
              'settings',
              'shareaudio',
              'sharedvideo',
              'shortcuts',
              'stats',
              'tileview',
              'toggle-camera',
              'videoquality',
              'whiteboard',
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            MOBILE_APP_PROMO: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          },
          userInfo: {
            displayName: userName,
            email: userEmail || ''
          }
        };

        console.log('Creating JitsiMeetExternalAPI with options:', { domain, roomName: options.roomName });
        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        console.log('JitsiMeetExternalAPI created');

        // Fallback timeout - if videoConferenceJoined doesn't fire within 15 seconds, hide loader anyway
        const fallbackTimeout = setTimeout(() => {
          if (mounted && isLoading) {
            console.log('Jitsi fallback timeout - hiding loader');
            setIsLoading(false);
          }
        }, 15000);

        // Event listeners
        apiRef.current.addListener('videoConferenceJoined', () => {
          console.log('videoConferenceJoined event fired');
          clearTimeout(fallbackTimeout);
          if (mounted) {
            setIsLoading(false);
            toast({
              title: "Joined meeting",
              description: `You've joined ${roomName}`
            });
          }
        });

        // When auth fails, JaaS often triggers one of these events.
        const handleConferenceFailure = (payload: any) => {
          console.error('Jitsi conference failed:', payload);

          const pretty =
            payload?.message ||
            payload?.error?.params?.join(' ') ||
            payload?.error?.name ||
            payload?.error ||
            payload?.name ||
            'Conference failed to start';

          if (mounted) {
            setError(String(pretty));
            setIsLoading(false);
          }
        };

        apiRef.current.addListener('conferenceFailed', handleConferenceFailure);
        apiRef.current.addListener('errorOccurred', handleConferenceFailure);
        apiRef.current.addListener('authenticationRequired', (payload: any) => {
          console.error('Jitsi authenticationRequired:', payload);
          if (mounted) {
            setError('JaaS authentication required (JWT rejected). Double-check the API key public key matches the private key.');
            setIsLoading(false);
          }
        });

        // Note: We intentionally don't call onClose on videoConferenceLeft
        // because this event fires when switching tabs/windows, not just when
        // the user intentionally leaves. We only close on readyToClose (hangup button).
        apiRef.current.addListener('videoConferenceLeft', () => {
          console.log('videoConferenceLeft event - meeting will stay open unless hangup was clicked');
        });

        apiRef.current.addListener('participantJoined', () => {
          if (mounted) {
            setParticipantCount(prev => prev + 1);
          }
        });

        apiRef.current.addListener('participantLeft', () => {
          if (mounted) {
            setParticipantCount(prev => Math.max(1, prev - 1));
          }
        });

        apiRef.current.addListener('readyToClose', () => {
          if (mounted && onCloseRef.current) {
            onCloseRef.current();
          }
        });

      } catch (err: any) {
        console.error('Jitsi init error:', err);
        if (mounted) {
          setError(err.message || 'Failed to initialize meeting');
          setIsLoading(false);
        }
      }
    };

    initJitsi();

    return () => {
      mounted = false;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  // Only re-init if essential props change - NOT callbacks
  }, [roomName, userName, userEmail, userId, isModerator]);

  if (error) {
    return (
      <Card className="w-full h-full min-h-[400px] flex items-center justify-center">
        <CardContent className="text-center space-y-4">
          <VideoOff className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-destructive font-medium">Failed to join meeting</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Connecting to meeting...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      {!isLoading && (
        <div className="absolute top-2 right-2 bg-background/80 rounded-full px-3 py-1 flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          <span>{participantCount}</span>
        </div>
      )}
    </div>
  );
};

export default JitsiMeetRoom;
