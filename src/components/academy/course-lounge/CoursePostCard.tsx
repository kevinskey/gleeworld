import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { CoursePost } from '@/hooks/useCourseSocialFeed';
import { CoursePostReactions } from './CoursePostReactions';
import { CoursePostComments } from './CoursePostComments';
import { MessageCircle, Pin, Megaphone, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CoursePostCardProps {
  post: CoursePost;
  currentUserId: string | null;
  onRefresh: () => void;
}

export function CoursePostCard({ post, currentUserId, onRefresh }: CoursePostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const isAuthor = currentUserId === post.author_id;

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    
    try {
      const { error } = await supabase
        .from('gw_course_lounge_posts')
        .delete()
        .eq('id', post.id);
      
      if (error) throw error;
      toast.success('Post deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  return (
    <Card className={`mb-4 ${post.is_pinned ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback>{post.author?.full_name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{post.author?.full_name || 'Unknown'}</span>
                {post.is_pinned && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                )}
                {post.is_announcement && (
                  <Badge variant="default" className="gap-1 text-xs">
                    <Megaphone className="h-3 w-3" />
                    Announcement
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <p className="text-foreground whitespace-pre-wrap mb-3">{post.content}</p>

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="grid gap-2 mb-3">
            {post.media_urls.map((url, i) => (
              <img 
                key={i} 
                src={url} 
                alt="" 
                className="rounded-lg max-h-80 object-contain bg-muted"
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <CoursePostReactions
            postId={post.id}
            reactions={post.reactions}
            userReactions={post.user_reactions}
            onReactionChange={onRefresh}
          />
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{commentCount > 0 ? commentCount : 'Comment'}</span>
          </Button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-border">
            <CoursePostComments 
              postId={post.id} 
              onCommentAdded={() => setCommentCount(c => c + 1)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
