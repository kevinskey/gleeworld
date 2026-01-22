import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Lock, MessageCircle, Send, Loader2, Award, Calendar, AlertCircle, Check, CheckCircle2, Circle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { calculateLetterGrade, getLetterGradeColor } from '@/utils/grading';

interface Discussion {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
  is_locked: boolean;
  reply_count: number;
  due_date?: string | null;
  max_points?: number | null;
  is_graded?: boolean | null;
}

interface Reply {
  id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  grade?: number | null;
  feedback?: string | null;
  graded_at?: string | null;
  graded_by?: string | null;
  parent_reply_id?: string | null;
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
  const { isInstructor, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [gradingReplyId, setGradingReplyId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState('');

  const canGrade = (isInstructor() || isAdmin()) && discussion.is_graded;
  const isPastDue = discussion.due_date ? isPast(new Date(discussion.due_date)) : false;

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

  // Check student's participation status
  // For "post once, respond once": first post is original, any subsequent is a response
  const userPosts = replies?.filter(r => r.created_by === user?.id) || [];
  const hasPostedOriginal = userPosts.length >= 1;
  const hasRespondedToPeer = userPosts.length >= 2;

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

  const gradeMutation = useMutation({
    mutationFn: async ({ replyId, grade, feedback }: { replyId: string; grade: number; feedback: string }) => {
      if (!user) throw new Error('You must be logged in');

      const { error } = await supabase
        .from('discussion_replies')
        .update({
          grade,
          feedback: feedback.trim() || null,
          graded_at: new Date().toISOString(),
          graded_by: user.id,
        })
        .eq('id', replyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-replies', discussion.id] });
      setGradingReplyId(null);
      setGradeInput(0);
      setFeedbackInput('');
      toast.success('Grade saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save grade');
    },
  });

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    replyMutation.mutate(replyContent);
  };

  const handleSubmitGrade = (replyId: string) => {
    if (gradeInput < 0 || gradeInput > (discussion.max_points || 10)) {
      toast.error(`Grade must be between 0 and ${discussion.max_points || 10}`);
      return;
    }
    gradeMutation.mutate({ replyId, grade: gradeInput, feedback: feedbackInput });
  };

  const startGrading = (reply: Reply) => {
    setGradingReplyId(reply.id);
    setGradeInput(reply.grade || 0);
    setFeedbackInput(reply.feedback || '');
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

      {/* Participation Tracker for Students */}
      {user && !canGrade && discussion.is_graded && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Your Participation</p>
                <p className="text-xs text-muted-foreground">Post once, respond once</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {hasPostedOriginal ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={hasPostedOriginal ? 'text-green-600' : 'text-muted-foreground'}>
                    Original Post
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasRespondedToPeer ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={hasRespondedToPeer ? 'text-green-600' : 'text-muted-foreground'}>
                    Peer Response
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  Posted by {authorProfile?.full_name || 'Instructor'} on{' '}
                  {format(new Date(discussion.created_at), 'MMM d, yyyy h:mm a')}
                </p>
                {/* Due date and grading info */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {discussion.is_graded && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      {discussion.max_points} points
                    </Badge>
                  )}
                  {discussion.due_date && (
                    <Badge 
                      variant={isPastDue ? "destructive" : "outline"} 
                      className="flex items-center gap-1"
                    >
                      {isPastDue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                      Due: {format(new Date(discussion.due_date), 'MMM d, yyyy h:mm a')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {discussion.reply_count || 0} replies
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {discussion.content}
          </div>
        </CardContent>
      </Card>

      {/* Replies */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Student Responses</h3>
        
        {repliesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : replies && replies.length > 0 ? (
          replies.map((reply) => {
            const isOwnPost = reply.created_by === user?.id;
            const isPeerPost = reply.created_by !== user?.id && reply.created_by !== discussion.created_by;
            
            return (
              <Card key={reply.id} className={`bg-muted/30 ${isOwnPost ? 'border-primary/30' : ''}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={reply.profile?.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(reply.profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">
                          {reply.profile?.full_name || 'Anonymous'}
                        </span>
                        {isOwnPost && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        {/* Show grade badge if graded */}
                        {reply.grade !== null && reply.grade !== undefined && discussion.max_points && (
                          <Badge className={`${getLetterGradeColor(calculateLetterGrade(reply.grade, discussion.max_points))} text-xs`}>
                            {reply.grade}/{discussion.max_points} ({calculateLetterGrade(reply.grade, discussion.max_points)})
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      
                      {/* Feedback display */}
                      {reply.feedback && (
                        <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/20">
                          <p className="text-xs font-medium text-primary">Instructor Feedback:</p>
                          <p className="text-sm text-muted-foreground">{reply.feedback}</p>
                        </div>
                      )}

                      {/* Reply to peer button (for students who have posted their original) */}
                      {user && !canGrade && isPeerPost && hasPostedOriginal && !replyingToId && !discussion.is_locked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2"
                          onClick={() => setReplyingToId(reply.id)}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Respond to {reply.profile?.full_name?.split(' ')[0] || 'this post'}
                        </Button>
                      )}

                      {/* Reply button for instructors */}
                      {user && canGrade && !isOwnPost && !replyingToId && !discussion.is_locked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2"
                          onClick={() => setReplyingToId(reply.id)}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Reply to {reply.profile?.full_name?.split(' ')[0] || 'this post'}
                        </Button>
                      )}

                      {/* Inline reply form */}
                      {replyingToId === reply.id && (
                        <div className="mt-3 p-3 border rounded-lg bg-background space-y-2">
                          <Label className="text-xs">Responding to {reply.profile?.full_name}</Label>
                          <Textarea
                            placeholder={canGrade ? "Add instructor comment..." : "Build on their idea, gently challenge an assumption, or connect to a different era..."}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => {
                              setReplyingToId(null);
                              setReplyContent('');
                            }}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (replyContent.trim()) {
                                  replyMutation.mutate(replyContent);
                                  setReplyingToId(null);
                                }
                              }}
                              disabled={replyMutation.isPending || !replyContent.trim()}
                            >
                              {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                              {canGrade ? 'Post Comment' : 'Post Response'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Grading form for instructors */}
                      {canGrade && gradingReplyId === reply.id && (
                        <div className="mt-3 p-3 border rounded-lg bg-background space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Grade (0-{discussion.max_points})</Label>
                              <Input
                                type="number"
                                min={0}
                                max={discussion.max_points || 10}
                                value={gradeInput}
                                onChange={(e) => setGradeInput(parseInt(e.target.value) || 0)}
                                className="h-8"
                              />
                            </div>
                            <div className="text-xs text-muted-foreground pt-5">
                              <p>Original Post: ~5pts</p>
                              <p>Response: ~3pts</p>
                              <p>Tone/Length: ~2pts</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Feedback</Label>
                            <Textarea
                              placeholder="Specific, constructive feedback..."
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setGradingReplyId(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitGrade(reply.id)}
                              disabled={gradeMutation.isPending}
                            >
                              {gradeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                              Save Grade
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Grade button for instructors */}
                      {canGrade && gradingReplyId !== reply.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => startGrading(reply)}
                        >
                          <Award className="h-3 w-3 mr-1" />
                          {reply.grade !== null && reply.grade !== undefined ? 'Edit Grade' : 'Grade'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-6 text-center text-muted-foreground">
              No responses yet. Be the first to share your reflection!
            </CardContent>
          </Card>
        )}
      </div>

      {/* Original Post Form (for students who haven't posted) */}
      {!discussion.is_locked && user && !canGrade && !hasPostedOriginal && !replyingToId && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Circle className="h-4 w-4" />
              Share Your Original Reflection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPastDue && (
              <div className="mb-3 p-2 bg-destructive/10 text-destructive rounded flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                This discussion is past due. Your response may be marked late.
              </div>
            )}
            <form onSubmit={handleSubmitReply} className="space-y-3">
              <Textarea
                placeholder="Add your voice: Reference music, use listening language, make a clear claim or question..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={replyMutation.isPending}
                rows={4}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  A strong post uses listening language and engages the music directly.
                </p>
                <Button type="submit" disabled={replyMutation.isPending || !replyContent.trim()}>
                  {replyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Post Reflection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Instructor reply form */}
      {!discussion.is_locked && user && canGrade && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmitReply} className="space-y-3">
              <Textarea
                placeholder="Add instructor comment..."
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
                  Post Comment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Completion message for students */}
      {user && !canGrade && hasPostedOriginal && hasRespondedToPeer && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-700">Participation Complete!</p>
            <p className="text-sm text-muted-foreground">
              You've added your voice and practiced listening.
            </p>
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
