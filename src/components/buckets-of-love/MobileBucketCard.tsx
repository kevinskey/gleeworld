import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MoreVertical, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BucketOfLove } from "@/hooks/useBucketsOfLove";

interface MobileBucketCardProps {
  bucket: BucketOfLove;
  onReply?: (bucket: BucketOfLove) => void;
  onLike?: (bucket: BucketOfLove) => void;
}

export const MobileBucketCard = ({ bucket, onReply, onLike }: MobileBucketCardProps) => {
  const getColorClass = (color: string) => {
    const colorMap = {
      pink: 'border-l-pink-400 bg-pink-50/50',
      yellow: 'border-l-yellow-400 bg-yellow-50/50',
      blue: 'border-l-blue-400 bg-blue-50/50',
      green: 'border-l-green-400 bg-green-50/50',
      purple: 'border-l-purple-400 bg-purple-50/50',
      orange: 'border-l-orange-400 bg-orange-50/50',
    };
    return colorMap[color as keyof typeof colorMap] || 'border-l-pink-400 bg-pink-50/50';
  };

  return (
    <Card className={`border-l-4 ${getColorClass(bucket.note_color)} hover:shadow-sm transition-all`}>
      <CardContent className="p-4">
        {/* Message content */}
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground">
            {bucket.message}
          </p>
          
          {/* Decorations */}
          {bucket.decorations && (
            <div className="text-lg">
              {bucket.decorations}
            </div>
          )}

          {/* Sender and recipient info */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Heart className="h-3 w-3 text-pink-400" />
                <span className="font-medium">
                  {bucket.is_anonymous ? 'Anonymous' : (bucket.sender_name || 'Unknown')}
                </span>
              </div>
              <span>
                {formatDistanceToNow(new Date(bucket.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {bucket.recipient_name && (
              <div className="text-xs text-muted-foreground">
                To: <span className="font-medium">{bucket.recipient_name}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLike?.(bucket)}
                className="h-8 px-2 text-muted-foreground hover:text-pink-600"
              >
                <Heart className={`h-3 w-3 mr-1 ${bucket.likes > 0 ? 'fill-current text-pink-500' : ''}`} />
                <span className="text-xs">{bucket.likes > 0 ? bucket.likes : 'Like'}</span>
              </Button>
              
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(bucket)}
                  className="h-8 px-2 text-muted-foreground hover:text-primary"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};