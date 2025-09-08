import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PageCard, ProseWrapper } from './PageShell';
import { Button } from '@/components/ui/button';
import { UnifiedEntry, ENTRY_COLORS } from '@/types/unified-feed';
import { 
  Heart,
  Activity,
  MessageSquare,
  Mail,
  Megaphone,
  ThumbsUp,
  Star,
  Share2,
  MoreHorizontal
} from 'lucide-react';

interface EntryCardProps {
  entry: UnifiedEntry;
  onReaction?: (entryId: string, reaction: string) => void;
  onShare?: (entryId: string) => void;
  onReply?: (entryId: string) => void;
  compact?: boolean;
  className?: string;
}

export const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  onReaction,
  onShare,
  onReply,
  compact = false,
  className = ""
}) => {
  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-3 w-3 text-white" />;
      case 'wellness_check':
        return <Activity className="h-3 w-3 text-white" />;
      case 'love_note':
        return <Heart className="h-3 w-3 text-white fill-current" />;
      case 'message':
        return <Mail className="h-3 w-3 text-white" />;
      default:
        return <MessageSquare className="h-3 w-3 text-white" />;
    }
  };

  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'heart':
        return <Heart className="h-3 w-3" />;
      case 'thumbs_up':
        return <ThumbsUp className="h-3 w-3" />;
      case 'star':
        return <Star className="h-3 w-3" />;
      case 'clap':
        return <span>👏</span>;
      default:
        return <Heart className="h-3 w-3" />;
    }
  };

  return (
    <PageCard className={cn("transition-all hover:shadow-md", className)}>
      <div className="flex gap-3">
        {/* Entry Type Icon */}
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${ENTRY_COLORS[entry.type]}20` }}
        >
          <div 
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: ENTRY_COLORS[entry.type] }}
          >
            {getEntryIcon(entry.type)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3 md:space-y-4">
          {/* Header with type and timestamp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground capitalize">
                {entry.type.replace('_', ' ')}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(entry.timestamp, { addSuffix: true }).replace('about ', '')}
              </span>
            </div>
            {!compact && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Title */}
          {entry.title && (
            <h3 className={cn(
              "font-semibold leading-tight",
              compact ? "text-base" : "text-lg md:text-xl"
            )}>
              {entry.title}
            </h3>
          )}

          {/* Content */}
          <ProseWrapper className={cn(
            compact ? "prose-sm" : "prose-sm md:prose-base"
          )}>
            <p>{entry.content}</p>
          </ProseWrapper>

          {/* Metadata */}
          {entry.metadata && (
            <div className="space-y-2">
              {/* Wellness streak */}
              {entry.metadata.streak_day && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">😊</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {entry.metadata.streak_day}-day streak
                  </span>
                </div>
              )}

              {/* Wellness score */}
              {entry.metadata.wellness_score && (
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    Wellness Score: {entry.metadata.wellness_score}/10
                  </span>
                </div>
              )}

              {/* Love note recipient */}
              {entry.type === 'love_note' && entry.metadata.recipient && (
                <div className="text-sm text-muted-foreground">
                  For {entry.metadata.recipient}
                </div>
              )}
            </div>
          )}

          {/* Author info for love notes */}
          {entry.type === 'love_note' && (
            <div className="text-xs text-muted-foreground">
              From {entry.author.name}
            </div>
          )}

          {/* Actions */}
          {(entry.reactions || onShare || onReply) && (
            <div className="flex items-center justify-between pt-3 border-t">
              {/* Reactions */}
              {entry.reactions && entry.reactions.length > 0 && (
                <div className="flex items-center gap-4">
                  {entry.reactions.map((reaction) => (
                    <button
                      key={reaction.type}
                      onClick={() => onReaction?.(entry.id, reaction.type)}
                      className={cn(
                        "flex items-center gap-1 text-xs transition-colors",
                        reaction.userReacted 
                          ? "text-primary" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {getReactionIcon(reaction.type)}
                      <span>{reaction.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {(onShare || onReply) && (
                <div className="flex items-center gap-2">
                  {onReply && entry.engagement?.replies && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReply(entry.id)}
                      className="h-8 text-xs"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {entry.engagement.replies}
                    </Button>
                  )}
                  {onShare && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onShare(entry.id)}
                      className="h-8 text-xs"
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      {entry.engagement?.shares || 0}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageCard>
  );
};