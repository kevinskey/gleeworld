import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface JitsiMeetRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  onChatToggle?: () => void;
  isRecordingEnabled?: boolean;
  userEmail?: string;
  userId?: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const JitsiMeetRoom = ({
  roomName,
  displayName,
  onLeave,
  onChatToggle,
  isRecordingEnabled = false,
  userEmail,
  userId
}: JitsiMeetRoomProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { toast } = useToast();

  // Use 8x8 JaaS domain
  const jitsiDomain = '8x8.vc';
  const jitsiRoom = `GleeWorld${roomName.replace(/[^a-zA-Z0-9]/g, '')}`;
  const jitsiScriptSrc = `https://${jitsiDomain}/external_api.js`;

  useEffect(() => {
    let mounted = true;

    const fetchJwtAndInitialize = async () => {
      try {
        // First, get JWT token from edge function
        console.log('Fetching JaaS JWT token...');
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('jaas-jwt-token', {
          body: {
            roomName: jitsiRoom,
            userName: displayName,
            userEmail: userEmail,
            userId: userId,
            isModerator: true
          }
        });

        if (tokenError) {
          console.error('Error fetching JWT:', tokenError);
          // Continue without JWT - will use public mode
        }

        const jwt = tokenData?.token;
        const appId = tokenData?.appId || 'vpaas-magic-cookie-f5bedadd63834d7887fe0bfe495bd2f9';
        
        console.log('JWT fetched:', jwt ? 'success' : 'failed, using public mode');

        // Load Jitsi API script
        if (!window.JitsiMeetExternalAPI) {
          await loadJitsiScript();
        }

        if (!mounted) return;
        
        initializeJitsi(jwt, appId);
      } catch (err) {
        console.error('Error in fetchJwtAndInitialize:', err);
        if (mounted) {
          setError('Failed to initialize video session');
          setIsLoading(false);
        }
      }
    };

    const loadJitsiScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = jitsiScriptSrc;
        script.async = true;
        
        script.onload = () => {
          if (window.JitsiMeetExternalAPI) {
            resolve();
          } else {
            reject(new Error('JitsiMeetExternalAPI not available'));
          }
        };
        
        script.onerror = () => reject(new Error('Failed to load Jitsi script'));
        document.head.appendChild(script);
      });
    };

    const initializeJitsi = (jwt: string | null, appId: string) => {
      if (!containerRef.current || !mounted) return;

      try {
        // For JaaS, room name format is: [appId]/[roomName]
        const fullRoomName = jwt ? `${appId}/${jitsiRoom}` : jitsiRoom;
        console.log('Initializing Jitsi with room:', fullRoomName, 'JWT:', jwt ? 'present' : 'none');
        
        const options: any = {
          roomName: fullRoomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: displayName
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            enableClosePage: false,
            disableInviteFunctions: true,
            enableLobbyChat: false,
            hideLobbyButton: true,
            requireDisplayName: false,
            enableInsecureRoomNameWarning: false,
            lobby: { enabled: false },
            disableLobby: true,
            membersOnly: false,
            p2p: { enabled: true },
            testing: { p2pTestMode: false },
            startAudioOnly: false,
            enableNoisyMicDetection: false,
            openBridgeChannel: 'websocket',
            channelLastN: -1
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            TOOLBAR_ALWAYS_VISIBLE: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
          }
        };

        // Add JWT if available
        if (jwt) {
          options.jwt = jwt;
        }
        
        apiRef.current = new window.JitsiMeetExternalAPI(jitsiDomain, options);
        
        console.log('Jitsi API created successfully');

        apiRef.current.addListener('videoConferenceJoined', () => {
          if (mounted) {
            setIsLoading(false);
            toast({
              title: "Connected",
              description: "You've joined the video session as moderator"
            });
          }
        });

        apiRef.current.addListener('videoConferenceLeft', () => {
          onLeave();
        });

        apiRef.current.addListener('readyToClose', () => {
          onLeave();
        });

        // Timeout fallback
        setTimeout(() => {
          if (mounted && isLoading) {
            setIsLoading(false);
          }
        }, 8000);

      } catch (err) {
        if (mounted) {
          console.error('Jitsi init error:', err);
          setError('Failed to start video session');
          setIsLoading(false);
        }
      }
    };

    fetchJwtAndInitialize();

    return () => {
      mounted = false;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [jitsiRoom, displayName, onLeave, toast, userEmail, userId]);

  const hangUp = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    onLeave();
  };

  if (error) {
    return (
      <div className="relative h-full w-full bg-slate-900 rounded-xl flex flex-col items-center justify-center p-6">
        <p className="text-white/60 mb-4">{error}</p>
        <Button variant="destructive" onClick={onLeave}>Close</Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-900 rounded-xl overflow-hidden">
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ height: '100%', width: '100%' }}
      />

      {isLoading && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-10">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-white text-lg">Connecting...</p>
          <p className="text-white/60 text-sm mt-2">{jitsiRoom}</p>
        </div>
      )}

      {!isLoading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {onChatToggle && (
            <Button
              variant="outline"
              onClick={onChatToggle}
              className="gap-2 border-white/20 bg-black/50 text-white hover:bg-white/10"
            >
              <MessageSquare className="h-5 w-5" />
              Chat
            </Button>
          )}
          <Button variant="destructive" onClick={hangUp} className="gap-2">
            <PhoneOff className="h-5 w-5" />
            End
          </Button>
        </div>
      )}
    </div>
  );
};
