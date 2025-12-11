import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Users, Plus, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface VideoSession {
  id: string;
  title: string;
  description: string | null;
  room_name: string;
  host_user_id: string;
  is_recording_enabled: boolean;
  started_at: string;
  participant_count?: number;
  host?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface ActiveVideoSessionsProps {
  onJoinSession: (sessionId: string, roomName: string, isRecording: boolean) => void;
  onCreateSession: () => void;
}

export const ActiveVideoSessions = ({ 
  onJoinSession, 
  onCreateSession 
}: ActiveVideoSessionsProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    // Subscribe to session changes
    const channel = supabase
      .channel('video-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_video_sessions'
        },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('gw_video_sessions')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (!error && data) {
      // Fetch host profiles and participant counts
      const enrichedSessions = await Promise.all(
        data.map(async (session) => {
          // Get host profile
          const { data: hostProfile } = await supabase
            .from('gw_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', session.host_user_id)
            .single();

          // Get participant count
          const { count } = await supabase
            .from('gw_video_session_participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .is('left_at', null);

          return {
            ...session,
            host: hostProfile || undefined,
            participant_count: count || 0
          };
        })
      );

      setSessions(enrichedSessions);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading sessions...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-primary" />
            Active Video Sessions
          </CardTitle>
          <Button onClick={onCreateSession} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Start Session
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No active video sessions</p>
            <Button onClick={onCreateSession} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Start the first session
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session.host?.avatar_url || undefined} />
                      <AvatarFallback>
                        {session.host?.full_name?.[0] || 'H'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{session.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Hosted by {session.host?.full_name || 'Unknown'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {session.participant_count}
                      </span>
                      {session.is_recording_enabled && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-red-500">
                            <Circle className="h-2 w-2 fill-current" />
                            Recording
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => onJoinSession(session.id, session.room_name, session.is_recording_enabled)}
                  size="sm"
                  className="gap-1"
                >
                  <Video className="h-4 w-4" />
                  Join
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
