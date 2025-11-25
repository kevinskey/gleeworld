import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import { Heart, ThumbsUp, Smile, PartyPopper, Flame, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface MessageReactionsProps {
  messageId: string;
}

const QUICK_REACTIONS = [
  { emoji: '❤️', icon: Heart, label: 'Love' },
  { emoji: '👍', icon: ThumbsUp, label: 'Like' },
  { emoji: '😂', icon: Smile, label: 'Haha' },
  { emoji: '🎉', icon: PartyPopper, label: 'Celebrate' },
  { emoji: '🔥', icon: Flame, label: 'Fire' },
];

export const MessageReactions: React.FC<MessageReactionsProps> = ({ messageId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState<Array<{ emoji: string; count: number; users: string[] }>>([]);

  useEffect(() => {
    fetchReactions();
    
    // Subscribe to reaction changes
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gw_message_reactions', filter: `message_id=eq.${messageId}` }, () => {
        fetchReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('gw_message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId);

    if (data) {
      const grouped = data.reduce((acc: any, r: any) => {
        if (!acc[r.emoji]) {
          acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
        }
        acc[r.emoji].count++;
        acc[r.emoji].users.push(r.user_id);
        return acc;
      }, {});
      
      setReactions(Object.values(grouped));
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;

    try {
      const existing = reactions.find(r => r.emoji === emoji && r.users.includes(user.id));

      if (existing) {
        await supabase
          .from('gw_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
      } else {
        await supabase
          .from('gw_message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji });
      }
    } catch (error) {
      console.error('Reaction error:', error);
      toast({ title: 'Failed to react', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {reactions.map((reaction, idx) => (
        <Button
          key={idx}
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs rounded-full ${
            user && reaction.users.includes(user.id) ? 'bg-primary/10' : 'bg-muted'
          }`}
          onClick={() => handleReaction(reaction.emoji)}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </Button>
      ))}

      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map(({ emoji, label }) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title={label}
                onClick={() => {
                  handleReaction(emoji);
                  setShowPicker(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};