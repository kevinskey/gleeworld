import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, MessageSquare, Save, Search, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface DiscussionGradingPanelProps {
  courseId: string;
}

interface Discussion {
  id: string;
  title: string;
  max_points: number | null;
  is_graded: boolean | null;
  due_date: string | null;
}

interface StudentParticipation {
  studentId: string;
  studentName: string;
  email: string;
  initialPostCount: number;
  peerReplyCount: number;
  totalPosts: number;
  existingGrade: number | null;
  existingFeedback: string | null;
  gradeId: string | null;
}

export const DiscussionGradingPanel: React.FC<DiscussionGradingPanelProps> = ({ courseId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [grades, setGrades] = useState<Record<string, { score: number; feedback: string }>>({});
  const [bulkScore, setBulkScore] = useState<string>('');

  // Fetch all graded discussions for this course
  const { data: discussions, isLoading: loadingDiscussions } = useQuery({
    queryKey: ['graded-discussions', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_discussions')
        .select('id, title, max_points, is_graded, due_date')
        .eq('course_id', courseId)
        .eq('is_graded', true)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Discussion[];
    },
  });

  const selectedDiscussion = discussions?.find(d => d.id === selectedDiscussionId);

  // Fetch enrolled students
  const { data: students } = useQuery({
    queryKey: ['course-enrolled-students', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_course_enrollments')
        .select('user_id, gw_profiles!inner(user_id, first_name, last_name, email)')
        .eq('course_id', courseId)
        .eq('status', 'enrolled');
      if (error) throw error;
      return (data || []).map((e: any) => ({
        userId: e.user_id,
        name: `${e.gw_profiles.first_name || ''} ${e.gw_profiles.last_name || ''}`.trim() || e.gw_profiles.email,
        email: e.gw_profiles.email || '',
      }));
    },
    enabled: !!selectedDiscussionId,
  });

  // Fetch replies for the selected discussion
  const { data: replies } = useQuery({
    queryKey: ['discussion-replies-grading', selectedDiscussionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_replies')
        .select('id, discussion_id, created_by, parent_reply_id')
        .eq('discussion_id', selectedDiscussionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDiscussionId,
  });

  // Fetch existing grades
  const { data: existingGrades } = useQuery({
    queryKey: ['discussion-grades', selectedDiscussionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_grades')
        .select('id, student_id, total_score, instructor_feedback')
        .eq('discussion_id', selectedDiscussionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDiscussionId,
  });

  // Build participation data
  const participationData = useMemo((): StudentParticipation[] => {
    if (!students || !selectedDiscussionId) return [];

    const replyMap = new Map<string, { initial: number; peer: number }>();
    (replies || []).forEach(r => {
      const current = replyMap.get(r.created_by) || { initial: 0, peer: 0 };
      if (!r.parent_reply_id) {
        current.initial++;
      } else {
        current.peer++;
      }
      replyMap.set(r.created_by, current);
    });

    const gradeMap = new Map(
      (existingGrades || []).map(g => [g.student_id, g])
    );

    return students.map(s => {
      const counts = replyMap.get(s.userId) || { initial: 0, peer: 0 };
      const grade = gradeMap.get(s.userId);
      return {
        studentId: s.userId,
        studentName: s.name,
        email: s.email,
        initialPostCount: counts.initial,
        peerReplyCount: counts.peer,
        totalPosts: counts.initial + counts.peer,
        existingGrade: grade?.total_score ?? null,
        existingFeedback: grade?.instructor_feedback ?? null,
        gradeId: grade?.id ?? null,
      };
    });
  }, [students, replies, existingGrades, selectedDiscussionId]);

  const filteredData = participationData.filter(s =>
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Initialize local grades from existing data
  const getLocalGrade = (studentId: string) => {
    if (grades[studentId]) return grades[studentId];
    const p = participationData.find(s => s.studentId === studentId);
    return {
      score: p?.existingGrade ?? 0,
      feedback: p?.existingFeedback ?? '',
    };
  };

  const setLocalGrade = (studentId: string, field: 'score' | 'feedback', value: any) => {
    const current = getLocalGrade(studentId);
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...current, [field]: value },
    }));
  };

  // Save grades mutation
  const saveGrades = useMutation({
    mutationFn: async () => {
      if (!selectedDiscussionId || !user) return;

      const updates = Object.entries(grades).map(([studentId, { score, feedback }]) => {
        const existing = participationData.find(s => s.studentId === studentId);
        return {
          id: existing?.gradeId || undefined,
          discussion_id: selectedDiscussionId,
          student_id: studentId,
          total_score: score,
          instructor_feedback: feedback || null,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        };
      });

      const toInsert = updates.filter(u => !u.id).map(({ id, ...rest }) => rest);
      const toUpdate = updates.filter(u => u.id);

      if (toInsert.length > 0) {
        const { error } = await supabase.from('discussion_grades').insert(toInsert);
        if (error) throw error;
      }

      for (const u of toUpdate) {
        const { error } = await supabase
          .from('discussion_grades')
          .update({
            total_score: u.total_score,
            instructor_feedback: u.instructor_feedback,
            graded_by: u.graded_by,
            graded_at: u.graded_at,
          })
          .eq('id', u.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-grades', selectedDiscussionId] });
      setGrades({});
      toast.success('Discussion grades saved!');
    },
    onError: (err) => {
      toast.error('Failed to save grades');
      console.error(err);
    },
  });

  // Bulk award points to all who participated
  const handleBulkAward = () => {
    const score = parseFloat(bulkScore);
    if (isNaN(score)) return;
    const maxPts = selectedDiscussion?.max_points || 10;

    const newGrades: Record<string, { score: number; feedback: string }> = {};
    participationData.forEach(s => {
      if (s.totalPosts > 0) {
        const current = getLocalGrade(s.studentId);
        newGrades[s.studentId] = { score: Math.min(score, maxPts), feedback: current.feedback };
      }
    });
    setGrades(prev => ({ ...prev, ...newGrades }));
    toast.success(`Awarded ${score} pts to ${Object.keys(newGrades).length} participants`);
  };

  if (loadingDiscussions) return <LoadingSpinner size="md" text="Loading discussions..." />;

  // Discussion selection view
  if (!selectedDiscussionId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Grade Discussions</h2>
        <p className="text-sm text-muted-foreground">Select a discussion to grade student participation.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {discussions?.map(d => {
            const maxPts = d.max_points || 10;
            return (
              <Card
                key={d.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedDiscussionId(d.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    {d.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge variant="secondary">{maxPts} pts</Badge>
                </CardContent>
              </Card>
            );
          })}
          {(!discussions || discussions.length === 0) && (
            <p className="text-muted-foreground col-span-2">No graded discussions found. Mark discussions as graded first.</p>
          )}
        </div>
      </div>
    );
  }

  const maxPts = selectedDiscussion?.max_points || 10;
  const hasChanges = Object.keys(grades).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setSelectedDiscussionId(null); setGrades({}); }}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{selectedDiscussion?.title}</h2>
          <p className="text-sm text-muted-foreground">Participation grading • {maxPts} pts max</p>
        </div>
        <Button onClick={() => saveGrades.mutate()} disabled={!hasChanges || saveGrades.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveGrades.isPending ? 'Saving...' : 'Save Grades'}
        </Button>
      </div>

      {/* Bulk award + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={`Pts (max ${maxPts})`}
            className="w-32"
            value={bulkScore}
            onChange={e => setBulkScore(e.target.value)}
            min={0}
            max={maxPts}
          />
          <Button variant="outline" size="sm" onClick={handleBulkAward}>
            Award to all who posted
          </Button>
        </div>
      </div>

      {/* Grading table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-center w-20">Initial</TableHead>
              <TableHead className="text-center w-20">Replies</TableHead>
              <TableHead className="text-center w-20">Total</TableHead>
              <TableHead className="w-24">Score</TableHead>
              <TableHead>Feedback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map(s => {
              const local = getLocalGrade(s.studentId);
              const participated = s.totalPosts > 0;
              return (
                <TableRow key={s.studentId}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{s.studentName}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {s.initialPostCount > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">{s.peerReplyCount}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={participated ? 'default' : 'destructive'}>
                      {s.totalPosts}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      value={local.score}
                      onChange={e => setLocalGrade(s.studentId, 'score', Math.min(parseFloat(e.target.value) || 0, maxPts))}
                      min={0}
                      max={maxPts}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      className="h-8 min-h-[32px] text-xs resize-none"
                      placeholder="Optional feedback..."
                      value={local.feedback}
                      onChange={e => setLocalGrade(s.studentId, 'feedback', e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
