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
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { toast } = useToast();

  // Load JaaS External API script
  useEffect(() => {
    const scriptId = 'jaas-external-api';
    
    // Check if already loaded
    if (window.JitsiMeetExternalAPI) {
      setApiLoaded(true);
      return;
    }

    // Check if script is already in DOM
    if (document.getElementById(scriptId)) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.JitsiMeetExternalAPI) {
          setApiLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Load the script
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://8x8.vc/${JAAS_APP_ID}/external_api.js`;
    script.async = true;
    
    script.onload = () => {
      console.log('JaaS External API loaded');
      setApiLoaded(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load JaaS External API');
      toast({
        title: "Error",
        description: "Failed to load video conferencing. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount - it can be reused
    };
  }, [toast]);

  // Initialize Jitsi when API is loaded
  useEffect(() => {
    if (!apiLoaded || !containerRef.current) return;

    try {
      const jitsiRoom = `${JAAS_APP_ID}/GleeWorld-${roomName}`;
      
      console.log('Initializing JaaS room:', jitsiRoom);

      apiRef.current = new window.JitsiMeetExternalAPI('8x8.vc', {
        roomName: jitsiRoom,
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
            'download',
            'embedmeeting',
            'filmstrip',
            'fullscreen',
            'hangup',
            'help',
            'highlight',
            'microphone',
            'noisesuppression',
            'participants-pane',
            'profile',
            'raisehand',
            'recording',
            'select-background',
            'settings',
            'shareaudio',
            'sharedvideo',
            'shortcuts',
            'stats',
            'tileview',
            'toggle-camera',
            'videoquality',
            'whiteboard'
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
        setIsLoading(false);
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
      toast({
        title: "Error",
        description: "Failed to start video session. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }

    return () => {
      if (apiRef.current) {
        console.log('Disposing Jitsi API');
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [apiLoaded, roomName, displayName, onLeave, toast]);

  const hangUp = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    onLeave();
  };

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
          <p className="text-white/60 text-sm mt-2">GleeWorld-{roomName}</p>
        </div>
      )}

      {/* Controls overlay */}
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
    </div>
  );
};
