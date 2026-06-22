// In-app Jitsi meeting via direct iframe — rendered inline in the chat pane,
// not a popup. Simpler and more reliable than the External API.
//
// Base URL is the public meet.jit.si until the self-hosted instance at
// meet.gleeworld.org is provisioned (the subdomain currently has no DNS
// record, which is why "Jitsi is broken" with the previous URL).
// To flip to self-hosted later, change JITSI_BASE below.
import { Button } from '@/components/ui/button';
import { X, Video } from 'lucide-react';

const JITSI_BASE = 'https://meet.jit.si';

interface JitsiMeetingPanelProps {
  roomName: string;
  userName: string;
  userEmail?: string;
  onClose: () => void;
}

export function JitsiMeetingPanel({ roomName, userName, onClose }: JitsiMeetingPanelProps) {
  // Hash params must be URI-encoded manually — URLSearchParams turns spaces
  // into '+' which Jitsi renders literally in the display name.
  const hash = [
    'config.prejoinConfig.enabled=false',
    'config.prejoinPageEnabled=false',
    'config.disableDeepLinking=true',
    'config.startWithAudioMuted=false',
    'config.startWithVideoMuted=false',
    `userInfo.displayName=${encodeURIComponent(`"${userName}"`)}`,
  ].join('&');

  const src = `${JITSI_BASE}/${roomName}#${hash}`;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
        <span className="text-sm font-semibold flex items-center gap-2 truncate">
          <Video className="w-4 h-4 shrink-0 text-primary" /> <span className="truncate">Video meeting</span>
        </span>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="w-4 h-4 mr-1" /> Leave
        </Button>
      </div>
      <iframe
        title="Jitsi meeting"
        src={src}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        allowFullScreen
        className="flex-1 w-full border-0"
      />
    </div>
  );
}
