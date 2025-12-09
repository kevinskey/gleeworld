import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Heart, Music, Flame, HandMetal, Laugh, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostReactionsProps {
  postId: string;
  reactions: {
    heart: number;
    music: number;
    fire: number;
    clap: number;
    laugh: number;
  };
  userReactions: string[];
  onReactionChange?: () => void;
}

const REACTION_CONFIG = {
  heart: { icon: Heart, label: '❤️', color: 'text-red-500' },
  music: { icon: Music, label: '🎵', color: 'text-blue-500' },
  fire: { icon: Flame, label: '🔥', color: 'text-orange-500' },
  clap: { icon: HandMetal, label: '👏', color: 'text-yellow-500' },
  laugh: { icon: Laugh, label: '😂', color: 'text-green-500' },
};

type ReactionType = keyof typeof REACTION_CONFIG;

export function PostReactions({ postId, reactions, userReactions, onReactionChange }: PostReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleReaction = async (reactionType: ReactionType) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const hasReaction = userReactions.includes(reactionType);

      if (hasReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('gw_social_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction_type', reactionType);
        
        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('gw_social_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          });
        
        if (error) throw error;
      }

      onReactionChange?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({
        title: 'Failed to react',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);
  const activeReactions = Object.entries(reactions).filter(([_, count]) => count > 0);

  return (
    <div className="flex items-center gap-2">
      {/* Show existing reactions */}
      {activeReactions.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-full">
          {activeReactions.map(([type, count]) => {
            const config = REACTION_CONFIG[type as ReactionType];
            const isUserReaction = userReactions.includes(type);
            return (
              <button
                key={type}
                onClick={() => handleReaction(type as ReactionType)}
                className={cn(
                  'flex items-center gap-0.5 text-sm transition-transform hover:scale-110',
                  isUserReaction && config.color
                )}
                disabled={isLoading}
              >
                <span>{config.label}</span>
                <span className="text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Reaction picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            {totalReactions === 0 ? (
              <>
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">React</span>
              </>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {Object.entries(REACTION_CONFIG).map(([type, config]) => {
              const isActive = userReactions.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => handleReaction(type as ReactionType)}
                  disabled={isLoading}
                  className={cn(
                    'p-2 text-xl rounded-lg transition-all hover:scale-125 hover:bg-accent',
                    isActive && 'bg-accent ring-2 ring-primary'
                  )}
                  title={type}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
