import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, MessageSquare, Loader2 } from 'lucide-react';

interface JitsiMeetRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  onChatToggle?: () => void;
  isRecordingEnabled?: boolean;
}

// JaaS App ID from the magic cookie
const JAAS_APP_ID = 'vpaas-magic-cookie-f5bedadd63834d7887fe0bfe495bd2f9';

export const JitsiMeetRoom = ({
  roomName,
  displayName,
  onLeave,
  onChatToggle,
  isRecordingEnabled = false
}: JitsiMeetRoomProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const jitsiRoom = `GleeWorld-${roomName}`;
  const jaasRoomName = `${JAAS_APP_ID}/${jitsiRoom}`;
  
  // Build iframe URL with config
  const configParams = new URLSearchParams({
    'config.startWithAudioMuted': 'false',
    'config.startWithVideoMuted': 'false',
    'config.prejoinPageEnabled': 'false',
    'config.disableDeepLinking': 'true',
    'interfaceConfig.SHOW_JITSI_WATERMARK': 'false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS': 'false',
    'interfaceConfig.MOBILE_APP_PROMO': 'false',
    'interfaceConfig.HIDE_INVITE_MORE_HEADER': 'true'
  });
  
  const iframeSrc = `https://8x8.vc/${jaasRoomName}?${configParams.toString()}#userInfo.displayName="${encodeURIComponent(displayName)}"`;

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const hangUp = () => {
    onLeave();
  };

  return (
    <div className="relative h-full w-full bg-slate-900 rounded-xl overflow-hidden">
      {/* JaaS iframe embed */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        className="absolute inset-0 w-full h-full border-0"
        onLoad={handleIframeLoad}
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
