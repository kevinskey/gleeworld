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
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { SocialPost } from '@/hooks/useSocialFeed';
import { PostReactions } from './PostReactions';
import { PostComments } from './PostComments';
import { ReportPostDialog } from './ReportPostDialog';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Pin, MoreHorizontal, Flag, Trash2, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
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

const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

export function PostCard({ post, userProfile, onRefresh }: PostCardProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextMedia = () => {
    if (post.media_urls && lightboxIndex < post.media_urls.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const prevMedia = () => {
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const renderMediaItem = (url: string, index: number, inLightbox = false) => {
    const isVideo = isVideoUrl(url);
    
    if (isVideo) {
      if (inLightbox) {
        return (
          <video
            key={index}
            src={url}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-lg"
          />
        );
      }
      return (
        <div
          key={index}
          className="relative cursor-pointer group"
          onClick={() => openLightbox(index)}
        >
          <video
            src={url}
            className="w-full h-48 object-cover rounded-lg"
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover:bg-black/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-6 w-6 text-foreground fill-current ml-1" />
            </div>
          </div>
        </div>
      );
    }
    
    if (inLightbox) {
      return (
        <img
          key={index}
          src={url}
          alt={`Post media ${index + 1}`}
          className="max-h-[80vh] max-w-full object-contain rounded-lg"
        />
      );
    }
    
    return (
      <img
        key={index}
        src={url}
        alt={`Post media ${index + 1}`}
        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => openLightbox(index)}
      />
    );
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
              {post.media_urls.map((url, index) => renderMediaItem(url, index))}
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

      {/* Media Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[50vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            {post.media_urls && post.media_urls.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 z-10 text-white hover:bg-white/20 disabled:opacity-30"
                  onClick={prevMedia}
                  disabled={lightboxIndex === 0}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 z-10 text-white hover:bg-white/20 disabled:opacity-30"
                  onClick={nextMedia}
                  disabled={lightboxIndex === post.media_urls.length - 1}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
            
            <div className="p-4">
              {post.media_urls && renderMediaItem(post.media_urls[lightboxIndex], lightboxIndex, true)}
            </div>
            
            {post.media_urls && post.media_urls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {lightboxIndex + 1} / {post.media_urls.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReportPostDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        contentType="post"
        contentId={post.id}
      />
    </>
  );
}
