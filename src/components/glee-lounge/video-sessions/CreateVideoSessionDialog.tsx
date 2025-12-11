import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Video, Users, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CreateVideoSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: (sessionId: string, roomName: string) => void;
}

export const CreateVideoSessionDialog = ({
  open,
  onOpenChange,
  onSessionCreated
}: CreateVideoSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enableRecording, setEnableRecording] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const generateRoomName = () => {
    const adjectives = ['Melodic', 'Harmonic', 'Rhythmic', 'Golden', 'Choral', 'Vocal'];
    const nouns = ['Rehearsal', 'Session', 'Gathering', 'Meeting', 'Practice', 'Harmony'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const id = Math.random().toString(36).substring(2, 8);
    return `${adj}${noun}-${id}`;
  };

  const handleCreate = async () => {
    if (!title.trim() || !user) return;

    setIsCreating(true);
    const roomName = generateRoomName();

    try {
      const { data, error } = await supabase
        .from('gw_video_sessions')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          host_user_id: user.id,
          room_name: roomName,
          is_recording_enabled: enableRecording,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Add host as participant
      await supabase
        .from('gw_video_session_participants')
        .insert({
          session_id: data.id,
          user_id: user.id,
          is_host: true
        });

      toast({
        title: "Session Created",
        description: "Your video session is ready!"
      });

      onSessionCreated(data.id, roomName);
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setEnableRecording(false);

    } catch (error: any) {
      console.error('Failed to create session:', error);
      toast({
        title: "Failed to create session",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Start Video Session
          </DialogTitle>
          <DialogDescription>
            Create a group video call. Other members can join with the link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Voice Part Rehearsal, Study Session"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this session about?"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <Circle className="h-4 w-4 text-red-500" />
              <div>
                <p className="font-medium text-sm">Enable Recording</p>
                <p className="text-xs text-muted-foreground">
                  Save session for later viewing
                </p>
              </div>
            </div>
            <Switch
              checked={enableRecording}
              onCheckedChange={setEnableRecording}
            />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span>Up to 50 members can join this session</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <>Creating...</>
            ) : (
              <>
                <Video className="h-4 w-4" />
                Start Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
