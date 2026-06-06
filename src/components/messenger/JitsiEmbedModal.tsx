// In-app Jitsi meeting via direct iframe to meet.jit.si — simpler and more
// reliable than the External API for cross-browser/mobile embedding.
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface JitsiEmbedModalProps {
  roomName: string;
  userName: string;
  userEmail?: string;
  onClose: () => void;
}

export function JitsiEmbedModal({ roomName, userName, onClose }: JitsiEmbedModalProps) {
  // Config + interface flags via URL hash so prejoin/deep-linking is disabled
  // and our display name is pre-filled. See meet.jit.si docs for params.
  const params = new URLSearchParams();
  params.set('config.prejoinPageEnabled', 'false');
  params.set('config.disableDeepLinking', 'true');
  params.set('config.startWithAudioMuted', 'false');
  params.set('config.startWithVideoMuted', 'false');
  params.set('userInfo.displayName', `"${userName}"`);

  const src = `https://meet.gleeworld.org/${roomName}#${params.toString()}`;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-white text-gray-900 border-b">
        <div className="text-sm font-semibold truncate">Meeting · {roomName}</div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Leave meeting" className="text-gray-900 hover:bg-gray-100">
          <X className="w-4 h-4" />
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
