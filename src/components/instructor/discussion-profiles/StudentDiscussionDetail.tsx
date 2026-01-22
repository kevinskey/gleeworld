import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, MessageSquare, Clock, Award, AlertTriangle, 
  Plus, Trash2, Calendar, TrendingUp, FileText, StickyNote,
  CheckCircle, XCircle, ExternalLink
} from 'lucide-react';
import { 
  useStudentDiscussionDetail, 
  useAddStudentNote, 
  useDeleteStudentNote 
} from '@/hooks/useDiscussionAnalytics';
import { format, formatDistanceToNow } from 'date-fns';

interface StudentDiscussionDetailProps {
  courseId: string;
  studentId: string;
  onBack: () => void;
}

export const StudentDiscussionDetail: React.FC<StudentDiscussionDetailProps> = ({
  courseId,
  studentId,
  onBack,
}) => {
  const { data, isLoading } = useStudentDiscussionDetail(courseId, studentId);
  const addNoteMutation = useAddStudentNote(courseId, studentId);
  const deleteNoteMutation = useDeleteStudentNote(courseId, studentId);
  const [newNote, setNewNote] = useState('');
  const [selectedDiscussion, setSelectedDiscussion] = useState<string | null>(null);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote, {
      onSuccess: () => setNewNote(''),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="link" onClick={onBack}>Go back</Button>
      </div>
    );
  }

  const { profile, replies, discussions, notes, bestPosts, flaggedPosts, totalPosts, totalResponses } = data;

  // Calculate KPIs
  const onTimeCount = replies.filter(r => {
    const discussion = discussions?.find(d => d.id === r.discussion_id);
    return discussion?.due_date && new Date(r.created_at) <= new Date(discussion.due_date);
  }).length;
  const onTimeRate = replies.length > 0 ? Math.round((onTimeCount / replies.length) * 100) : 0;
  const participationRate = discussions?.length 
    ? Math.round((new Set(replies.map(r => r.discussion_id)).size / discussions.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>
              {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{profile?.full_name}</h1>
            <p className="text-sm text-muted-foreground">Discussion Profile</p>
          </div>
        </div>
        <Badge 
          variant={participationRate >= 80 ? "default" : participationRate >= 50 ? "secondary" : "destructive"}
          className="text-sm"
        >
          {participationRate}% Participation
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Total Posts</span>
            </div>
            <p className="text-2xl font-bold">{totalPosts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">Peer Responses</span>
            </div>
            <p className="text-2xl font-bold">{totalResponses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">On-Time Rate</span>
            </div>
            <p className="text-2xl font-bold">{onTimeRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Flags</span>
            </div>
            <p className="text-2xl font-bold">{flaggedPosts.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">All Posts</TabsTrigger>
          <TabsTrigger value="best">Best Of</TabsTrigger>
          <TabsTrigger value="flags">Flags & Signals</TabsTrigger>
          <TabsTrigger value="notes">Instructor Notes</TabsTrigger>
        </TabsList>

        {/* All Posts Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {replies.length > 0 ? replies.map((reply: any) => {
                    const discussion = discussions?.find((d: any) => d.id === reply.discussion_id);
                    const isOnTime = discussion?.due_date && 
                      new Date(reply.created_at) <= new Date(discussion.due_date);

                    return (
                      <div key={reply.id} className="p-4 hover:bg-muted/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {discussion?.title || 'Unknown Discussion'}
                              </Badge>
                              <Badge variant="default" className="text-xs">
                                Post
                              </Badge>
                              {isOnTime ? (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  On Time
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Late
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm line-clamp-3">{reply.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No posts yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Best Of Tab */}
        <TabsContent value="best">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Best Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestPosts.length > 0 ? (
                <div className="space-y-4">
                  {bestPosts.map((post, index) => {
                    const discussion = discussions?.find(d => d.id === post.discussion_id);
                    const metrics = post.analysis?.metrics_json as any;

                    return (
                      <div key={post.id} className="p-4 border rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-yellow-500">{index + 1}</Badge>
                          <span className="text-sm font-medium">{discussion?.title}</span>
                          {metrics?.originality && (
                            <Badge variant="outline" className="ml-auto">
                              {metrics.originality}% Originality
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{post.content}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No analyzed posts yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flags Tab */}
        <TabsContent value="flags">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Integrity Signals
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Potential concerns identified by automated analysis. Review each case individually.
              </p>
            </CardHeader>
            <CardContent>
              {flaggedPosts.length > 0 ? (
                <div className="space-y-4">
                  {flaggedPosts.map((post) => {
                    const discussion = discussions?.find(d => d.id === post.discussion_id);
                    const metrics = post.analysis?.metrics_json as any;

                    return (
                      <div key={post.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="destructive" className="text-xs">Flagged</Badge>
                          <span className="text-sm font-medium">{discussion?.title}</span>
                        </div>
                        <p className="text-sm mb-2">{post.content}</p>
                        {metrics?.reasons && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Reasons:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {metrics.reasons.map((reason: string, i: number) => (
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No flags for this student
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Private Instructor Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note Form */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a private note about this student's discussion performance..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button 
                  size="sm" 
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              <Separator />

              {/* Notes List */}
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {notes.length > 0 ? notes.map((note) => (
                    <div key={note.id} className="p-3 border rounded-lg bg-muted/20">
                      <div className="flex items-start justify-between">
                        <p className="text-sm whitespace-pre-wrap flex-1">{note.note}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">
                      No notes yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
