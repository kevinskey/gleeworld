import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, MessageSquare, Loader2, ExternalLink, Video, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JitsiMeetRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  onChatToggle?: () => void;
  isRecordingEnabled?: boolean;
}

// JaaS App ID from the magic cookie
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
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { toast } = useToast();

  const jitsiRoom = `GleeWorld-${roomName}`;
  const jaasRoomName = `${JAAS_APP_ID}/${jitsiRoom}`;
  const jaasUrl = `https://8x8.vc/${jaasRoomName}#userInfo.displayName="${encodeURIComponent(displayName)}"`;

  // Load JaaS External API script
  useEffect(() => {
    const scriptId = 'jaas-external-api';
    
    // Check if already loaded
    if (window.JitsiMeetExternalAPI) {
      console.log('JaaS API already available');
      setApiLoaded(true);
      setIsLoading(false);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.JitsiMeetExternalAPI) {
          setApiLoaded(true);
          setIsLoading(false);
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.JitsiMeetExternalAPI) {
          console.log('JaaS API timeout - falling back to new tab');
          setLoadFailed(true);
          setIsLoading(false);
        }
      }, 5000);
      
      return () => clearInterval(checkInterval);
    }

    // Load the script
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://8x8.vc/${JAAS_APP_ID}/external_api.js`;
    script.async = true;
    
    script.onload = () => {
      console.log('JaaS External API script loaded');
      // Wait a moment for the API to initialize
      setTimeout(() => {
        if (window.JitsiMeetExternalAPI) {
          console.log('JaaS API available after load');
          setApiLoaded(true);
        } else {
          console.log('JaaS API not available after script load');
          setLoadFailed(true);
        }
        setIsLoading(false);
      }, 500);
    };
    
    script.onerror = (error) => {
      console.error('Failed to load JaaS External API:', error);
      setLoadFailed(true);
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount - it can be reused
    };
  }, []);

  // Initialize Jitsi when API is loaded
  useEffect(() => {
    if (!apiLoaded || !containerRef.current || loadFailed) return;

    try {
      console.log('Initializing JaaS room:', jaasRoomName);

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
          disableInviteFunctions: true,
          toolbarButtons: [
            'camera',
            'chat',
            'closedcaptions',
            'desktop',
            'filmstrip',
            'fullscreen',
            'hangup',
            'microphone',
            'noisesuppression',
            'participants-pane',
            'profile',
            'raisehand',
            'recording',
            'select-background',
            'settings',
            'tileview',
            'toggle-camera',
            'videoquality'
          ]
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          TOOLBAR_ALWAYS_VISIBLE: true
        }
      });

      // Event listeners
      apiRef.current.addListener('videoConferenceJoined', () => {
        console.log('Joined video conference');
        toast({
          title: "Connected",
          description: "You've joined the video session"
        });
      });

      apiRef.current.addListener('videoConferenceLeft', () => {
        console.log('Left video conference');
        onLeave();
      });

      apiRef.current.addListener('readyToClose', () => {
        console.log('Ready to close');
        onLeave();
      });

    } catch (error) {
      console.error('Error initializing Jitsi:', error);
      setLoadFailed(true);
    }

    return () => {
      if (apiRef.current) {
        console.log('Disposing Jitsi API');
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [apiLoaded, loadFailed, jaasRoomName, displayName, onLeave, toast]);

  const openInNewTab = () => {
    window.open(jaasUrl, '_blank', 'noopener,noreferrer');
    setHasJoined(true);
    toast({
      title: "Video Session Opened",
      description: "The video session opened in a new tab"
    });
  };

  const hangUp = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    onLeave();
  };

  // Show fallback UI if script failed to load (common in sandbox/preview)
  if (loadFailed || (!apiLoaded && !isLoading)) {
    return (
      <div className="relative h-full w-full bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Embedded Video Unavailable</h2>
          <p className="text-white/60 text-sm mb-1">Session: {jitsiRoom}</p>
          <p className="text-white/40 text-xs max-w-sm">
            {hasJoined 
              ? "Session opened in new tab. You can rejoin anytime."
              : "Video embed is blocked in preview. Click below to open in a new tab."}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={openInNewTab}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            <ExternalLink className="h-5 w-5" />
            {hasJoined ? "Rejoin Video Session" : "Open Video Session"}
          </Button>

          {onChatToggle && (
            <Button
              variant="outline"
              onClick={onChatToggle}
              className="w-full gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <MessageSquare className="h-5 w-5" />
              Glee Chat
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={hangUp}
            className="w-full gap-2"
          >
            <PhoneOff className="h-5 w-5" />
            End Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-900 rounded-xl overflow-hidden">
      {/* Jitsi container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ height: '100%', width: '100%' }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-10">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-white text-lg">Connecting to video session...</p>
          <p className="text-white/60 text-sm mt-2">{jitsiRoom}</p>
        </div>
      )}

      {/* Controls overlay */}
      {!isLoading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {onChatToggle && (
            <Button
              variant="outline"
              onClick={onChatToggle}
              className="gap-2 border-white/20 bg-black/50 text-white hover:bg-white/10"
            >
              <MessageSquare className="h-5 w-5" />
              Glee Chat
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={hangUp}
            className="gap-2"
          >
            <PhoneOff className="h-5 w-5" />
            End Session
          </Button>
        </div>
      )}
    </div>
  );
};
