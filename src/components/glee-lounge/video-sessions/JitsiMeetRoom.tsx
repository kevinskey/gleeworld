import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, MessageSquare, ExternalLink, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JitsiMeetRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  onChatToggle?: () => void;
  isRecordingEnabled?: boolean;
}

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const JitsiMeetRoom = ({
  roomName,
  displayName,
  onLeave,
  onChatToggle,
  isRecordingEnabled = false
}: JitsiMeetRoomProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const { toast } = useToast();
  const isMobile = isMobileDevice();

  // Build Jitsi Meet URL with configuration
  const jitsiRoom = `GleeWorld-${roomName}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false`;

  useEffect(() => {
    if (!isMobile) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Connected",
          description: "You've joined the video session"
        });
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [toast, isMobile]);

  const openInNewTab = () => {
    window.open(jitsiUrl, '_blank', 'noopener,noreferrer');
    setHasJoined(true);
    toast({
      title: "Video Session Opened",
      description: "The video session opened in a new tab"
    });
  };

  const hangUp = () => {
    onLeave();
  };

  // Mobile view - show button to open in new tab
  if (isMobile) {
    return (
      <div className="relative h-full w-full bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Video Session</h2>
          <p className="text-white/60 text-sm mb-1">{jitsiRoom}</p>
          <p className="text-white/40 text-xs">
            {hasJoined ? "Session opened in new tab" : "Tap below to join the video call"}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={openInNewTab}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            <ExternalLink className="h-5 w-5" />
            {hasJoined ? "Rejoin Video Session" : "Join Video Session"}
          </Button>

          {onChatToggle && (
            <Button
              variant="outline"
              onClick={onChatToggle}
              className="w-full gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <MessageSquare className="h-5 w-5" />
              Toggle Chat
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

  // Desktop view - embedded iframe
  return (
    <div className="relative h-full w-full bg-slate-900 rounded-xl overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Connecting to video session...</p>
            <p className="text-white/60 text-sm mt-2">Please allow camera and microphone access</p>
          </div>
        </div>
      )}

      <iframe
        src={jitsiUrl}
        className="h-full w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; encrypted-media"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setIsLoading(false)}
      />

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