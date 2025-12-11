import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Maximize2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JitsiMeetRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  onChatToggle?: () => void;
  isRecordingEnabled?: boolean;
}

export const JitsiMeetRoom = ({
  roomName,
  displayName,
  onLeave,
  onChatToggle,
  isRecordingEnabled = false
}: JitsiMeetRoomProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Build Jitsi Meet URL with configuration
  const jitsiConfig = {
    room: `GleeWorld-${roomName}`,
    displayName: encodeURIComponent(displayName),
    config: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      prejoinPageEnabled: false,
      disableDeepLinking: true,
    },
    interfaceConfig: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      DEFAULT_BACKGROUND: '#1e293b',
      TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'desktop', 'fullscreen', 
        'hangup', 'settings', 'raisehand', 'videoquality', 'tileview',
        ...(isRecordingEnabled ? ['recording'] : [])
      ],
    }
  };

  // Encode config for URL
  const configString = encodeURIComponent(JSON.stringify(jitsiConfig.config));
  const interfaceConfigString = encodeURIComponent(JSON.stringify(jitsiConfig.interfaceConfig));
  
  const jitsiUrl = `https://meet.jit.si/${jitsiConfig.room}#userInfo.displayName="${jitsiConfig.displayName}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false`;

  useEffect(() => {
    // Simulate loading time for iframe
    const timer = setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Connected",
        description: "You've joined the video session"
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [toast]);

  const openInNewTab = () => {
    window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
  };

  const hangUp = () => {
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

      {/* Jitsi iframe embed */}
      <iframe
        src={jitsiUrl}
        className="h-full w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />

      {/* Custom bottom controls overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
        {onChatToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onChatToggle}
            className="rounded-full h-10 w-10 text-white hover:bg-white/20"
            title="Toggle Chat"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={openInNewTab}
          className="rounded-full h-10 w-10 text-white hover:bg-white/20"
          title="Open in new tab"
        >
          <ExternalLink className="h-5 w-5" />
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={hangUp}
          className="rounded-full px-4 h-10 bg-red-500 hover:bg-red-600 text-white gap-2"
          title="Leave meeting"
        >
          <PhoneOff className="h-5 w-5" />
          <span className="font-medium">End Session</span>
        </Button>
      </div>
    </div>
  );
};
