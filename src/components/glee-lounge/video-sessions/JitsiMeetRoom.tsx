import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JitsiMeetRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  onChatToggle?: () => void;
  isRecordingEnabled?: boolean;
}

// JaaS App ID
const JAAS_APP_ID = 'vpaas-magic-cookie-f5bedadd63834d7887fe0bfe495bd2f9';

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
  isRecordingEnabled = false
}: JitsiMeetRoomProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { toast } = useToast();

  const jitsiRoom = `GleeWorld-${roomName}`;
  const jaasRoomName = `${JAAS_APP_ID}/${jitsiRoom}`;

  useEffect(() => {
    let mounted = true;

    const loadJaaSAPI = async () => {
      // Check if already loaded
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }

      // Load the JaaS External API script
      const script = document.createElement('script');
      script.src = `https://8x8.vc/${JAAS_APP_ID}/external_api.js`;
      script.async = true;
      
      script.onload = () => {
        if (mounted && window.JitsiMeetExternalAPI) {
          initializeJitsi();
        } else if (mounted) {
          setError('Failed to initialize video API');
          setIsLoading(false);
        }
      };
      
      script.onerror = () => {
        if (mounted) {
          setError('Failed to load video conferencing');
          setIsLoading(false);
        }
      };

      document.head.appendChild(script);
    };

    const initializeJitsi = () => {
      if (!containerRef.current || !mounted) return;

      try {
        apiRef.current = new window.JitsiMeetExternalAPI('8x8.vc', {
          roomName: jaasRoomName,
          parentNode: containerRef.current,
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
            disableInviteFunctions: true
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            TOOLBAR_ALWAYS_VISIBLE: true
          }
        });

        apiRef.current.addListener('videoConferenceJoined', () => {
          if (mounted) {
            setIsLoading(false);
            toast({
              title: "Connected",
              description: "You've joined the video session"
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
        }, 5000);

      } catch (err) {
        if (mounted) {
          console.error('Jitsi init error:', err);
          setError('Failed to start video session');
          setIsLoading(false);
        }
      }
    };

    loadJaaSAPI();

    return () => {
      mounted = false;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [jaasRoomName, displayName, onLeave, toast]);

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
