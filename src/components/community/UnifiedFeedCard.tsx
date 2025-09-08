import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  Repeat2, 
  MessageSquare, 
  Share, 
  MoreHorizontal,
  Star,
  ThumbsUp,
  Clock,
  Sparkles,
  Activity
} from 'lucide-react';
import { UnifiedEntry, ENTRY_COLORS, BADGES } from '@/types/unified-feed';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface UnifiedFeedCardProps {
  entry: UnifiedEntry;
  onReaction: (entryId: string, reaction: string) => void;
  onShare: (entryId: string) => void;
  onReply: (entryId: string) => void;
  compact?: boolean;
}

export const UnifiedFeedCard: React.FC<UnifiedFeedCardProps> = ({
  entry,
  onReaction,
  onShare,
  onReply,
  compact = false
}) => {
  const [showActions, setShowActions] = useState(false);

  const categoryColor = ENTRY_COLORS[entry.type];
  const reactionIcons = {
    heart: Heart,
    star: Star,
    clap: '👏',
    thumbs_up: ThumbsUp
  };

  const getBadgeInfo = (badge: string) => {
    return BADGES[badge as keyof typeof BADGES] || { name: badge, icon: '🏆', description: '' };
  };

  return (
    <Card 
      className={cn(
        "touch-target transition-all duration-200 hover:shadow-md border-l-4 group",
        compact ? "p-3" : "p-4"
      )}
      style={{ borderLeftColor: categoryColor }}
    >
      <CardContent className="p-0 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className={cn(compact ? "h-8 w-8" : "h-10 w-10")}>
              <AvatarImage src={entry.author.avatar} />
              <AvatarFallback>{entry.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("font-medium", compact ? "text-sm" : "text-base")}>
                  {entry.author.name}
                </span>
                {entry.author.role && (
                  <Badge variant="secondary" className="text-xs">
                    {entry.author.role}
                  </Badge>
                )}
                {entry.metadata?.badge_earned && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      {getBadgeInfo(entry.metadata.badge_earned).icon}
                    </span>
                    <Badge variant="outline" className="text-xs bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                      {getBadgeInfo(entry.metadata.badge_earned).name}
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ borderColor: categoryColor, color: categoryColor }}
                >
                  {entry.type.replace('_', ' ')}
                </Badge>
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(entry.timestamp, { addSuffix: true })}</span>
                {entry.metadata?.streak_day && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-yellow-500" />
                    <span className="text-yellow-600 font-medium">
                      {entry.metadata.streak_day} day streak!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {entry.title && (
            <h3 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
              {entry.title}
            </h3>
          )}
          
          <p className={cn(
            "text-foreground leading-relaxed",
            compact ? "text-sm line-clamp-2" : "text-base"
          )}>
            {entry.content}
          </p>

          {/* Wellness Score */}
          {entry.metadata?.wellness_score && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Wellness Score: {entry.metadata.wellness_score}/10
              </span>
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            {entry.reactions?.map((reaction) => {
              const Icon = reactionIcons[reaction.type as keyof typeof reactionIcons];
              return (
                <Button
                  key={reaction.type}
                  variant={reaction.userReacted ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onReaction(entry.id, reaction.type)}
                  className={cn(
                    "gap-1 text-xs h-8 px-2",
                    reaction.userReacted && "text-primary"
                  )}
                >
                  {typeof Icon === 'string' ? (
                    <span className="text-sm">{Icon}</span>
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  <span>{reaction.count}</span>
                </Button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(entry.id)}
              className="gap-1 text-xs h-8 px-2"
            >
              <MessageSquare className="h-3 w-3" />
              <span>{entry.engagement?.replies || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare(entry.id)}
              className="gap-1 text-xs h-8 px-2"
            >
              <Share className="h-3 w-3" />
              <span>{entry.engagement?.shares || 0}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};