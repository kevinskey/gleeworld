import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Lock, MessageCircle, Send, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Discussion {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
  is_locked: boolean;
  reply_count: number;
}

interface Reply {
  id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface DiscussionThreadProps {
  discussion: Discussion;
  onBack: () => void;
  courseId: string;
}

export const DiscussionThread: React.FC<DiscussionThreadProps> = ({
  discussion,
  onBack,
  courseId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState('');

  // Fetch author profile
  const { data: authorProfile } = useQuery({
    queryKey: ['profile', discussion.created_by],
    queryFn: async () => {
      if (!discussion.created_by) return null;
      const { data } = await supabase
        .from('gw_profiles')
        .select('full_name, avatar_url')
        .eq('user_id', discussion.created_by)
        .single();
      return data;
    },
    enabled: !!discussion.created_by,
  });

  // Fetch replies with profiles
  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ['discussion-replies', discussion.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_replies')
        .select('*')
        .eq('discussion_id', discussion.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for all replies
      const userIds = [...new Set(data.map(r => r.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(reply => ({
        ...reply,
        profile: profileMap.get(reply.created_by) || null,
      }));
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('You must be logged in');

      const { error } = await supabase
        .from('discussion_replies')
        .insert({
          discussion_id: discussion.id,
          content: content.trim(),
          created_by: user.id,
        });

      if (error) throw error;

      // Update reply count
      await supabase
        .from('course_discussions')
        .update({ reply_count: (discussion.reply_count || 0) + 1 })
        .eq('id', discussion.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-replies', discussion.id] });
      queryClient.invalidateQueries({ queryKey: ['course-discussions', courseId] });
      setReplyContent('');
      toast.success('Reply posted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to post reply');
    },
  });

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    replyMutation.mutate(replyContent);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Discussions
      </Button>

      {/* Original Post */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={authorProfile?.avatar_url || undefined} />
                <AvatarFallback>{getInitials(authorProfile?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {discussion.title}
                  {discussion.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Posted by {authorProfile?.full_name || 'Anonymous'} on{' '}
                  {format(new Date(discussion.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {discussion.reply_count || 0} replies
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">{discussion.content}</p>
        </CardContent>
      </Card>

      {/* Replies */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Replies</h3>
        
        {repliesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : replies && replies.length > 0 ? (
          replies.map((reply) => (
            <Card key={reply.id} className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={reply.profile?.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(reply.profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {reply.profile?.full_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-6 text-center text-muted-foreground">
              No replies yet. Be the first to respond!
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reply Form */}
      {!discussion.is_locked && user && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmitReply} className="space-y-3">
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={replyMutation.isPending}
                rows={3}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={replyMutation.isPending || !replyContent.trim()}>
                  {replyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Post Reply
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {discussion.is_locked && (
        <Card className="bg-muted/50">
          <CardContent className="py-4 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" />
            This discussion is locked. No new replies can be added.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
