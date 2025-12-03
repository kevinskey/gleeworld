import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PollBubble } from './PollBubble';
import { PollCreator } from './PollCreator';
import { BarChart3, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PollsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export const PollsDialog: React.FC<PollsDialogProps> = ({
  open,
  onOpenChange,
  groupId,
}) => {
  const [pollMessages, setPollMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPolls();
    }
  }, [open, groupId]);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      
      // Fetch all poll messages for this group
      const { data: messages, error } = await supabase
        .from('gw_group_messages')
        .select('*')
        .eq('group_id', groupId)
        .eq('message_type', 'poll')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPollMessages(messages || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col bg-background z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[hsl(var(--message-header))]" />
            Group Polls
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Create Poll Button */}
          <div className="pb-4 border-b">
            {showPollCreator ? (
              <div className="space-y-2">
                <PollCreator 
                  groupId={groupId} 
                  inline={true}
                  onPollCreated={() => {
                    setShowPollCreator(false);
                    fetchPolls();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPollCreator(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowPollCreator(true)}
                className="w-full bg-[hsl(var(--message-header))] hover:bg-[hsl(var(--message-header))]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Poll
              </Button>
            )}
          </div>

          {/* Polls List */}
          <ScrollArea className="flex-1 mt-4 pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--message-header))]"></div>
              </div>
            ) : pollMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-8 w-8 text-[hsl(var(--message-header))]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Polls Yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Create your first poll to gather opinions and make group decisions.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {pollMessages.map((message) => (
                  <PollBubble
                    key={message.id}
                    messageId={message.id}
                    createdBy={message.user_id}
                    createdAt={message.created_at}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
