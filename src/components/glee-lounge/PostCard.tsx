import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SocialPost } from '@/hooks/useSocialFeed';
import { PostReactions } from './PostReactions';
import { PostComments } from './PostComments';
import { ReportPostDialog } from './ReportPostDialog';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Pin, MoreHorizontal, Flag, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PostCardProps {
  post: SocialPost;
  userProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  onRefresh?: () => void;
}

export function PostCard({ post, userProfile, onRefresh }: PostCardProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const isOwnPost = userProfile?.user_id === post.user_id;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('gw_social_posts')
        .delete()
        .eq('id', post.id);
      
      if (error) throw error;
      
      toast({
        title: 'Post deleted',
        description: 'Your post has been removed',
      });
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Failed to delete',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="mb-4">
        <CardContent className="pt-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={getAvatarUrl(post.author?.avatar_url) || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(post.author?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{post.author?.full_name || 'Member'}</span>
                  {post.is_pinned && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                  {post.location_tag && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {post.location_tag}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost ? (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <p className="text-foreground whitespace-pre-wrap mb-3">{post.content}</p>

          {/* Media grid */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className={`grid gap-2 mb-3 ${
              post.media_urls.length === 1 ? 'grid-cols-1' :
              post.media_urls.length === 2 ? 'grid-cols-2' :
              post.media_urls.length === 3 ? 'grid-cols-3' :
              'grid-cols-2'
            }`}>
              {post.media_urls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Post media ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          )}

          {/* Reactions */}
          <PostReactions
            postId={post.id}
            reactions={post.reactions}
            userReactions={post.user_reactions}
            onReactionChange={onRefresh}
          />

          {/* Comments */}
          <PostComments
            postId={post.id}
            commentCount={post.comment_count}
            userProfile={userProfile}
          />
        </CardContent>
      </Card>

      <ReportPostDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        contentType="post"
        contentId={post.id}
      />
    </>
  );
}
