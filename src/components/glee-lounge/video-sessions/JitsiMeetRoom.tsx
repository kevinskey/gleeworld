import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, MessageSquare, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JitsiMeetRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  onChatToggle?: () => void;
  isRecordingEnabled?: boolean;
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
  isRecordingEnabled = false
}: JitsiMeetRoomProps) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if script is already loaded
    if (window.JitsiMeetExternalAPI) {
      initJitsi();
      return;
    }

    // Load Jitsi Meet External API script
    const existingScript = document.querySelector('script[src="https://meet.jit.si/external_api.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', initJitsi);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = initJitsi;
    script.onerror = () => {
      setIsLoading(false);
      toast({
        title: "Connection Error",
        description: "Failed to load video conferencing. Please check your internet connection.",
        variant: "destructive"
      });
    };
    document.body.appendChild(script);

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, []);

  const initJitsi = () => {
    if (!jitsiContainerRef.current) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: `GleeWorld-${roomName}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: displayName
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        enableClosePage: false,
        disableInviteFunctions: true,
        toolbarButtons: [
          'microphone',
          'camera',
          'desktop',
          'fullscreen',
          'hangup',
          'settings',
          'raisehand',
          'videoquality',
          'tileview',
          ...(isRecordingEnabled ? ['recording'] : [])
        ],
        notifications: [],
        enableNoAudioDetection: true,
        enableNoisyMicDetection: true,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_POWERED_BY: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        MOBILE_APP_PROMO: false,
        TOOLBAR_ALWAYS_VISIBLE: true,
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        FILM_STRIP_MAX_HEIGHT: 120,
        VERTICAL_FILMSTRIP: true,
        CLOSE_PAGE_GUEST_HINT: false,
        DEFAULT_BACKGROUND: '#1e293b',
        DISABLE_FOCUS_INDICATOR: true,
        DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
        GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
        HIDE_INVITE_MORE_HEADER: true,
        MOBILE_DOWNLOAD_LINK_ANDROID: '',
        MOBILE_DOWNLOAD_LINK_IOS: '',
        NATIVE_APP_NAME: 'GleeWorld',
        PROVIDER_NAME: 'GleeWorld',
        APP_NAME: 'GleeWorld Video',
      }
    };

    try {
      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

      apiRef.current.addListener('videoConferenceJoined', () => {
        setIsLoading(false);
        toast({
          title: "Connected",
          description: "You've joined the video session"
        });
      });

      apiRef.current.addListener('participantJoined', () => {
        updateParticipantCount();
      });

      apiRef.current.addListener('participantLeft', () => {
        updateParticipantCount();
      });

      apiRef.current.addListener('audioMuteStatusChanged', (event: { muted: boolean }) => {
        setIsAudioMuted(event.muted);
      });

      apiRef.current.addListener('videoMuteStatusChanged', (event: { muted: boolean }) => {
        setIsVideoMuted(event.muted);
      });

      apiRef.current.addListener('readyToClose', () => {
        onLeave();
      });

      if (isRecordingEnabled) {
        apiRef.current.addListener('recordingStatusChanged', (event: { on: boolean }) => {
          toast({
            title: event.on ? "Recording Started" : "Recording Stopped",
            description: event.on ? "This session is being recorded" : "Recording has ended"
          });
        });
      }

    } catch (error) {
      console.error('Failed to initialize Jitsi:', error);
      toast({
        title: "Connection Error",
        description: "Failed to start video session",
        variant: "destructive"
      });
    }
  };

  const updateParticipantCount = () => {
    if (apiRef.current) {
      const count = apiRef.current.getNumberOfParticipants();
      setParticipantCount(count);
    }
  };

  const toggleAudio = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleVideo');
    }
  };

  const toggleScreenShare = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleShareScreen');
    }
  };

  const hangUp = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    onLeave();
  };

  return (
    <div className="relative h-full w-full bg-slate-900 rounded-xl overflow-hidden">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Connecting to video session...</p>
            <p className="text-white/60 text-sm mt-2">Please allow camera and microphone access</p>
          </div>
        </div>
      )}

      {/* Jitsi container */}
      <div ref={jitsiContainerRef} className="h-full w-full" />

      {/* Custom bottom controls overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAudio}
          className={`rounded-full h-10 w-10 ${isAudioMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'text-white hover:bg-white/20'}`}
        >
          {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleVideo}
          className={`rounded-full h-10 w-10 ${isVideoMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'text-white hover:bg-white/20'}`}
        >
          {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleScreenShare}
          className="rounded-full h-10 w-10 text-white hover:bg-white/20"
        >
          <ScreenShare className="h-5 w-5" />
        </Button>

        {onChatToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onChatToggle}
            className="rounded-full h-10 w-10 text-white hover:bg-white/20"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-1 px-2 text-white/80 text-sm">
          <Users className="h-4 w-4" />
          <span>{participantCount}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={hangUp}
          className="rounded-full h-10 w-10 bg-red-500 hover:bg-red-600 text-white"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={hangUp}
        className="absolute top-4 right-4 z-10 rounded-full h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
