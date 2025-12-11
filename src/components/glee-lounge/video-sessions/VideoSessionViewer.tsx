import { useState, useEffect } from 'react';
import { JitsiMeetRoom } from './JitsiMeetRoom';
import { VideoSessionChat } from './VideoSessionChat';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

interface VideoSessionViewerProps {
  sessionId: string;
  roomName: string;
  isRecordingEnabled?: boolean;
  onClose: () => void;
}

export const VideoSessionViewer = ({
  sessionId,
  roomName,
  isRecordingEnabled = false,
  onClose
}: VideoSessionViewerProps) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [showChat, setShowChat] = useState(true);
  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || 'Guest';

  // Track participant joining
  useEffect(() => {
    if (!user) return;

    const joinSession = async () => {
      // Check if already a participant
      const { data: existing } = await supabase
        .from('gw_video_session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (!existing) {
        await supabase
          .from('gw_video_session_participants')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            is_host: false
          });
      } else {
        // Update joined_at if rejoining
        await supabase
          .from('gw_video_session_participants')
          .update({ 
            joined_at: new Date().toISOString(),
            left_at: null 
          })
          .eq('id', existing.id);
      }
    };

    joinSession();

    // Mark as left when component unmounts
    return () => {
      supabase
        .from('gw_video_session_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .then(() => {});
    };
  }, [sessionId, user]);

  const handleLeave = async () => {
    // Mark the participant as left
    if (user) {
      await supabase
        .from('gw_video_session_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      // Check if user is the host and end the session
      const { data: session } = await supabase
        .from('gw_video_sessions')
        .select('host_user_id')
        .eq('id', sessionId)
        .single();

      if (session?.host_user_id === user.id) {
        // Host is leaving - end the session
        await supabase
          .from('gw_video_sessions')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      }
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex overflow-hidden">
      {/* Video area */}
      <div 
        className="flex-1 h-full transition-all duration-300"
        style={{ marginRight: showChat ? '320px' : '0' }}
      >
        <JitsiMeetRoom
          roomName={roomName}
          displayName={displayName}
          onLeave={handleLeave}
          onChatToggle={() => setShowChat(!showChat)}
          isRecordingEnabled={isRecordingEnabled}
        />
      </div>

      {/* Chat sidebar */}
      {showChat && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-background border-l shadow-xl z-50">
          <VideoSessionChat 
            sessionId={sessionId} 
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      {/* Toggle chat button when closed */}
      {!showChat && (
        <Button
          onClick={() => setShowChat(true)}
          className="fixed right-4 top-4 z-[60] rounded-full h-10 w-10 p-0 shadow-lg bg-primary hover:bg-primary/90"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
