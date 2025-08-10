import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MoreVertical, Reply, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BucketOfLove, useBucketsOfLove } from "@/hooks/useBucketsOfLove";
import { getNoteClasses } from "./notePalette";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface MobileBucketCardProps {
  bucket: BucketOfLove;
  onReply?: (bucket: BucketOfLove) => void;
  onLike?: (bucket: BucketOfLove) => void;
}

export const MobileBucketCard = ({ bucket, onReply, onLike }: MobileBucketCardProps) => {
  // Using shared pastel note palette
  const note = (color: string) => getNoteClasses(color);
  const { user } = useAuth();
  const { deleteBucket } = useBucketsOfLove();

  const handleDelete = async () => {
    const ok = window.confirm('Delete this note?');
    if (!ok) return;
    const res = await deleteBucket(bucket.id);
    if (res.success) {
      toast({ title: 'Deleted', description: 'Your bucket of love was removed.' });
    } else {
      toast({ title: 'Error', description: res.error || 'Could not delete note.' });
    }
  };

  const isOwner = bucket.user_id && user?.id && bucket.user_id === user.id;

  return (
    <Card className={`border-l-4 ${getNoteClasses(bucket.note_color).container} hover:shadow-sm transition-all`}>
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
            <div className={`flex items-center justify-between text-xs text-muted-foreground ${getNoteClasses(bucket.note_color).meta}`}>
              <div className="flex items-center gap-2">
                <Heart className={`h-3 w-3 ${getNoteClasses(bucket.note_color).heart}`} />
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
                className="h-8 px-2 text-muted-foreground hover:opacity-80"
              >
                <Heart className={`h-3 w-3 mr-1 ${getNoteClasses(bucket.note_color).heart} ${bucket.likes > 0 ? 'fill-current' : ''}`} />
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

            <div className="flex items-center gap-1">
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                  aria-label="Delete note"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground"
                aria-label="More actions"
                title="More"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};