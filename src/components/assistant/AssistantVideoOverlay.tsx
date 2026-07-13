import { X } from 'lucide-react';
import { JitsiMeetRoom } from '@/components/video/JitsiMeetRoom';

interface AssistantVideoOverlayProps {
  roomName: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  onClose: () => void;
}

/**
 * Full-screen Jitsi layer used by both the desktop spotlight and the phone
 * sheet. Rendered as a fixed inset-0 layer so it works the same regardless
 * of which shell is mounted around it; the caller is responsible for
 * routing its own close affordances (Esc/backdrop) through the guarded
 * close path so this never gets unmounted out from under a live call.
 */
export const AssistantVideoOverlay = ({ roomName, userName, userEmail, userId, onClose }: AssistantVideoOverlayProps) => (
  <div className="fixed inset-0 z-[60] bg-background">
    <button
      type="button"
      onClick={onClose}
      className="absolute top-3 right-3 z-[61] h-8 w-8 rounded-full bg-card border flex items-center justify-center"
    >
      <X className="w-4 h-4" />
    </button>
    <JitsiMeetRoom roomName={roomName} userName={userName} userEmail={userEmail} userId={userId} onClose={onClose} />
  </div>
);
