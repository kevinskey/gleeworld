import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Video, 
  Plus, 
  Users, 
  Circle, 
  X, 
  Loader2,
  VideoOff,
  Mic,
  MicOff,
  PhoneCall,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

interface MobileVideoInterfaceProps {
  onJoinSession: (sessionId: string, roomName: string, isRecording: boolean) => void;
}

export const MobileVideoInterface = ({ onJoinSession }: MobileVideoInterfaceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create form state
  const [title, setTitle] = useState('');
  const [enableRecording, setEnableRecording] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('video-sessions-mobile')
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
      const enrichedSessions = await Promise.all(
        data.map(async (session) => {
          const { data: hostProfile } = await supabase
            .from('gw_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', session.host_user_id)
            .single();

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

  const generateRoomName = () => {
    const adjectives = ['Melodic', 'Harmonic', 'Rhythmic', 'Golden', 'Choral', 'Vocal'];
    const nouns = ['Rehearsal', 'Session', 'Gathering', 'Meeting', 'Practice', 'Harmony'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const id = Math.random().toString(36).substring(2, 8);
    return `${adj}${noun}-${id}`;
  };

  const handleQuickStart = async () => {
    if (!user) return;
    
    setIsCreating(true);
    const roomName = generateRoomName();
    const sessionTitle = title.trim() || 'Quick Video Call';

    try {
      const { data, error } = await supabase
        .from('gw_video_sessions')
        .insert({
          title: sessionTitle,
          host_user_id: user.id,
          room_name: roomName,
          is_recording_enabled: enableRecording,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('gw_video_session_participants')
        .insert({
          session_id: data.id,
          user_id: user.id,
          is_host: true
        });

      toast({
        title: "Starting call...",
        description: "Your video session is ready!"
      });

      onJoinSession(data.id, roomName, enableRecording);
      setShowCreateForm(false);
      setTitle('');
      setEnableRecording(false);

    } catch (error: any) {
      toast({
        title: "Failed to start",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    
    if (!confirm('Delete this session permanently?')) return;

    const { error } = await supabase
      .from('gw_video_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Session deleted",
        description: "The video session has been removed"
      });
      fetchSessions();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Quick Start Section */}
      <div className="p-4 space-y-4">
        {!showCreateForm ? (
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="w-full h-16 text-lg gap-3 rounded-2xl shadow-lg"
            size="lg"
          >
            <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Video className="h-5 w-5" />
            </div>
            Start Video Call
          </Button>
        ) : (
          <div className="bg-card rounded-2xl border shadow-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                New Video Call
              </h3>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setShowCreateForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Call title (optional)"
              className="h-12 rounded-xl text-base"
            />

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <Circle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Record this call</span>
              </div>
              <Switch
                checked={enableRecording}
                onCheckedChange={setEnableRecording}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl gap-2"
                onClick={handleQuickStart}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
                {isCreating ? 'Starting...' : 'Start Now'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {sessions.length > 0 ? 'Active Calls' : 'No Active Calls'}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1 px-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <VideoOff className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">No active calls</p>
              <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                Start a video call to connect with your Glee Club family
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onJoinSession(session.id, session.room_name, session.is_recording_enabled)}
                className="w-full p-4 rounded-2xl border bg-card hover:bg-accent/50 transition-all duration-200 active:scale-[0.98] text-left"
              >
                <div className="flex items-start gap-3">
                  {/* Host Avatar with Live Indicator */}
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-green-500/50">
                      <AvatarImage src={session.host?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {session.host?.full_name?.[0] || 'H'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                      <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-foreground truncate">
                        {session.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Users className="h-3 w-3" />
                          {session.participant_count}
                        </Badge>
                        {user && session.host_user_id === user.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteSession(e, session.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {session.host?.full_name || 'Unknown Host'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200 bg-green-50">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Live Now
                      </Badge>
                      {session.is_recording_enabled && (
                        <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30 bg-destructive/10">
                          <Circle className="h-2 w-2 fill-current" />
                          Recording
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Join Button */}
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-11 rounded-xl bg-primary/10 flex items-center justify-center gap-2 text-primary font-medium">
                    <Video className="h-4 w-4" />
                    Tap to Join
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom Tips */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            <span>Audio enabled</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            <span>Video enabled</span>
          </div>
          <span>•</span>
          <span>Up to 50 people</span>
        </div>
      </div>
    </div>
  );
};
