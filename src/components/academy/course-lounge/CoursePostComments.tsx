import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Comment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface CoursePostCommentsProps {
  postId: string;
  onCommentAdded?: () => void;
}

export function CoursePostComments({ postId, onCommentAdded }: CoursePostCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const { data: rawData, error } = await supabase
        .from('gw_course_lounge_comments' as any)
        .select('*')
        .eq('post_id', postId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const data = (rawData || []) as unknown as { id: string; content: string; author_id: string; created_at: string }[];

      // Fetch author profiles
      const authorIds = [...new Set(data?.map(c => c.author_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setComments(data?.map(comment => ({
        id: comment.id,
        content: comment.content,
        author_id: comment.author_id,
        created_at: comment.created_at,
        author: profileMap.get(comment.author_id)
      })) || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { data: rawData, error } = await supabase
        .from('gw_course_lounge_comments' as any)
        .insert({
          post_id: postId,
          author_id: user.id,
          content: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;
      
      const data = rawData as unknown as { id: string; content: string; author_id: string; created_at: string };

      // Get current user profile for the new comment
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      setComments(prev => [...prev, {
        id: data.id,
        content: data.content,
        author_id: data.author_id,
        created_at: data.created_at,
        author: profile || undefined
      }]);
      setNewComment('');
      onCommentAdded?.();
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.author?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {comment.author?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{comment.author?.full_name || 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={1}
          className="min-h-[40px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button 
          size="icon" 
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
