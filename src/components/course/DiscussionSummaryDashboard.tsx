import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  TrendingUp,
  UserCheck,
  UserX,
  BarChart3
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DiscussionSummaryDashboardProps {
  courseId: string;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  is_graded: boolean;
  max_points: number | null;
  due_date: string | null;
  created_at: string;
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  grade: number | null;
  feedback: string | null;
  created_by: string;
  discussion_id: string;
  profile: {
    full_name: string;
  } | null;
}

interface EnrolledStudent {
  user_id: string;
  full_name: string;
}

export const DiscussionSummaryDashboard: React.FC<DiscussionSummaryDashboardProps> = ({ courseId }) => {
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null);

  // Fetch all discussions for the course
  const { data: discussions = [], isLoading: discussionsLoading } = useQuery({
    queryKey: ['course-discussions-summary', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_discussions')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Discussion[];
    },
    enabled: !!courseId
  });

  // Fetch all replies for all discussions
  const { data: allReplies = [] } = useQuery({
    queryKey: ['all-discussion-replies', courseId, discussions.map(d => d.id).join(',')],
    queryFn: async (): Promise<Reply[]> => {
      if (!discussions.length) return [];
      const discussionIds = discussions.map(d => d.id);
      const { data, error } = await supabase
        .from('discussion_replies')
        .select('id, content, created_at, grade, feedback, created_by, discussion_id')
        .in('discussion_id', discussionIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      // Fetch profiles separately
      const creatorIds = [...new Set((data || []).map(r => r.created_by))];
      if (creatorIds.length === 0) {
        return (data || []).map(r => ({
          ...r,
          profile: null
        }));
      }
      
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      
      return (data || []).map(r => ({
        ...r,
        profile: { full_name: profileMap.get(r.created_by) || 'Unknown' }
      }));
    },
    enabled: discussions.length > 0
  });

  // Fetch enrolled students
  const { data: enrolledStudents = [] } = useQuery<EnrolledStudent[]>({
    queryKey: ['enrolled-students', courseId],
    queryFn: async () => {
      // Query enrollments first
      const { data: enrollData, error: enrollError } = await supabase
        .from('gw_course_enrollments')
        .select('user_id, status')
        .eq('course_id', courseId);
      
      if (enrollError) throw enrollError;
      
      // Filter for enrolled status and get user IDs
      const userIds = ((enrollData || []) as any[])
        .filter((e: any) => e.status === 'enrolled')
        .map((e: any) => e.user_id as string);
      
      if (userIds.length === 0) return [];
      
      // Get profiles for enrolled users
      const { data: profiles, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      if (profileError) throw profileError;
      
      return ((profiles || []) as any[]).map((p: any) => ({
        user_id: p.user_id as string,
        full_name: (p.full_name || 'Unknown') as string
      }));
    },
    enabled: !!courseId
  });

  const getDiscussionStats = (discussionId: string) => {
    const replies = allReplies.filter((r: any) => r.discussion_id === discussionId);
    const uniqueParticipants = new Set(replies.map((r: any) => r.created_by));
    const gradedReplies = replies.filter((r: any) => r.grade !== null);
    
    const grades = gradedReplies.map((r: any) => r.grade);
    const avgGrade = grades.length > 0 
      ? (grades.reduce((a: number, b: number) => a + b, 0) / grades.length).toFixed(1)
      : null;

    // Get who participated
    const participantIds = new Set(replies.map((r: any) => r.created_by));
    const participated = enrolledStudents.filter(s => participantIds.has(s.user_id));
    const notParticipated = enrolledStudents.filter(s => !participantIds.has(s.user_id));

    return {
      totalReplies: replies.length,
      uniqueParticipants: uniqueParticipants.size,
      gradedCount: gradedReplies.length,
      avgGrade,
      participated,
      notParticipated,
      replies // All replies for theme summary
    };
  };

  const getParticipationRate = (stats: ReturnType<typeof getDiscussionStats>) => {
    if (enrolledStudents.length === 0) return 0;
    return Math.round((stats.uniqueParticipants / enrolledStudents.length) * 100);
  };

  const extractKeyThemes = (replies: any[]) => {
    // Simple theme extraction - count word frequency (excluding common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'it', 'that', 'this', 'i', 'we', 'they', 'you', 'be', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'with', 'as', 'by', 'from', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'think', 'because', 'like', 'music', 'black', 'people']);
    
    const wordCounts: Record<string, number> = {};
    
    replies.forEach(reply => {
      const words = reply.content
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !stopWords.has(w));
      
      words.forEach((word: string) => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, count]) => ({ word, count }));
  };

  if (discussionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading discussions...</div>
      </div>
    );
  }

  if (discussions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No discussions found for this course.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{discussions.length}</p>
                <p className="text-sm text-muted-foreground">Discussions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{enrolledStudents.length}</p>
                <p className="text-sm text-muted-foreground">Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{allReplies.length}</p>
                <p className="text-sm text-muted-foreground">Total Replies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">
                  {allReplies.filter((r: any) => r.grade !== null).length}
                </p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discussion Cards */}
      <div className="space-y-4">
        {discussions.map(discussion => {
          const stats = getDiscussionStats(discussion.id);
          const participationRate = getParticipationRate(stats);
          const themes = extractKeyThemes(stats.replies);
          const isExpanded = expandedDiscussion === discussion.id;

          return (
            <Card key={discussion.id} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => setExpandedDiscussion(isExpanded ? null : discussion.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="truncate">{discussion.title}</span>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {discussion.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant="secondary">
                            {stats.totalReplies} replies
                          </Badge>
                          <Badge variant={participationRate >= 75 ? "default" : participationRate >= 50 ? "secondary" : "destructive"}>
                            {participationRate}% participation
                          </Badge>
                          {discussion.is_graded && stats.avgGrade && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              Avg: {stats.avgGrade}/{discussion.max_points}
                            </Badge>
                          )}
                          {discussion.due_date && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {format(new Date(discussion.due_date), 'MMM d')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="border-t pt-6 space-y-6">
                    {/* Participation Progress */}
                    <div>
                      <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Participation Overview
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Participation Rate</span>
                            <span className="font-medium">{stats.uniqueParticipants} / {enrolledStudents.length} students</span>
                          </div>
                          <Progress value={participationRate} className="h-3" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xl font-bold text-blue-600">{stats.totalReplies}</p>
                            <p className="text-xs text-muted-foreground">Total Replies</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xl font-bold text-amber-600">{stats.gradedCount}</p>
                            <p className="text-xs text-muted-foreground">Graded</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Key Themes */}
                    {themes.length > 0 && (
                      <>
                        <div>
                          <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Key Themes & Topics
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {themes.map(({ word, count }) => (
                              <Badge 
                                key={word} 
                                variant="secondary"
                                className="text-sm px-3 py-1"
                              >
                                {word} <span className="ml-1 opacity-60">({count})</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Participation Lists */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Participated */}
                      <div>
                        <h4 className="font-semibold text-base mb-3 flex items-center gap-2 text-green-700">
                          <UserCheck className="h-4 w-4" />
                          Participated ({stats.participated.length})
                        </h4>
                        <ScrollArea className="h-40">
                          <div className="space-y-1">
                            {stats.participated.length > 0 ? (
                              stats.participated.map(student => (
                                <div key={student.user_id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  <span className="text-sm">{student.full_name}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No participants yet</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Not Participated */}
                      <div>
                        <h4 className="font-semibold text-base mb-3 flex items-center gap-2 text-red-700">
                          <UserX className="h-4 w-4" />
                          Not Participated ({stats.notParticipated.length})
                        </h4>
                        <ScrollArea className="h-40">
                          <div className="space-y-1">
                            {stats.notParticipated.length > 0 ? (
                              stats.notParticipated.map(student => (
                                <div key={student.user_id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                  <span className="text-sm">{student.full_name}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Everyone participated! 🎉</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>

                    {/* Response Excerpts */}
                    {stats.replies.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-base mb-3">Response Highlights</h4>
                          <ScrollArea className="h-48">
                            <div className="space-y-3">
                              {stats.replies.slice(0, 5).map((reply: any) => (
                                <div key={reply.id} className="p-3 bg-muted/30 rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">
                                      {reply.profile?.full_name || 'Student'}
                                    </span>
                                    {reply.grade !== null && (
                                      <Badge variant="outline" className="text-xs">
                                        {reply.grade} pts
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-3">
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
