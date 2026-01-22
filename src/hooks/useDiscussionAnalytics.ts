import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StudentDiscussionMetrics {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  posts_submitted: number;
  on_time_rate: number;
  peer_responses: number;
  avg_response_time_hours: number;
  originality_avg: number;
  engagement_quality_avg: number;
  flags_count: number;
  last_activity: string | null;
}

export interface StudentNote {
  id: string;
  course_id: string;
  student_id: string;
  author_id: string;
  note: string;
  created_at: string;
  author_name?: string;
}

export interface PostAnalysis {
  id: string;
  post_id: string;
  discussion_id: string;
  student_id: string;
  metrics_json: {
    originality?: number;
    evidence?: number;
    engagement_type?: string;
    low_effort_flag?: boolean;
    reasons?: string[];
  };
  created_at: string;
}

// Fetch all students with discussion metrics for a course
export function useStudentDiscussionList(courseId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-discussion-list', courseId],
    queryFn: async () => {
      // Get enrolled students from mus240_enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('mus240_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('status', 'active') as { data: { user_id: string }[] | null; error: any };

      if (enrollError) throw enrollError;

      const studentIds = enrollments?.map((e: any) => e.user_id) || [];
      if (studentIds.length === 0) return [];

      // Get profiles
      const { data: profiles, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', studentIds);

      if (profileError) throw profileError;

      // Get discussions for this course
      const { data: discussions, error: discError } = await supabase
        .from('course_discussions')
        .select('id, due_date')
        .eq('course_id', courseId);

      if (discError) throw discError;

      const discussionIds = discussions?.map((d: any) => d.id) || [];
      const discussionDueDates = new Map(discussions?.map((d: any) => [d.id, d.due_date]) || []);

      if (discussionIds.length === 0) {
        // Return students with zero metrics if no discussions
        return profiles?.map((profile: any) => ({
          student_id: profile.user_id,
          full_name: profile.full_name || 'Unknown',
          avatar_url: profile.avatar_url,
          posts_submitted: 0,
          on_time_rate: 0,
          peer_responses: 0,
          avg_response_time_hours: 0,
          originality_avg: 0,
          engagement_quality_avg: 0,
          flags_count: 0,
          last_activity: null,
        })) || [];
      }

      // Get all replies
      const { data: replies, error: replyError } = await supabase
        .from('discussion_replies')
        .select('id, discussion_id, created_by, created_at')
        .in('discussion_id', discussionIds);

      if (replyError) throw replyError;

      // Get cached metrics if available
      const { data: cachedMetrics } = await supabase
        .from('discussion_student_metrics')
        .select('student_id, metrics_json')
        .eq('course_id', courseId)
        .in('student_id', studentIds);

      const metricsMap = new Map(cachedMetrics?.map((m: any) => [m.student_id, m.metrics_json]) || []);

      // Get post analysis for flags
      const { data: postAnalyses } = await supabase
        .from('discussion_post_analysis')
        .select('student_id, metrics_json')
        .eq('course_id', courseId)
        .in('student_id', studentIds);

      // Count flags per student
      const flagsMap = new Map<string, number>();
      postAnalyses?.forEach((pa: any) => {
        const metrics = pa.metrics_json as any;
        if (metrics?.low_effort_flag) {
          flagsMap.set(pa.student_id, (flagsMap.get(pa.student_id) || 0) + 1);
        }
      });

      // Calculate metrics per student
      const studentMetrics: StudentDiscussionMetrics[] = profiles?.map((profile: any) => {
        const studentReplies = replies?.filter((r: any) => r.created_by === profile.user_id) || [];

        // Calculate on-time rate
        let onTimeCount = 0;
        studentReplies.forEach((reply: any) => {
          const dueDate = discussionDueDates.get(reply.discussion_id);
          if (dueDate && new Date(reply.created_at) <= new Date(dueDate as string)) {
            onTimeCount++;
          }
        });
        const onTimeRate = studentReplies.length > 0 
          ? Math.round((onTimeCount / studentReplies.length) * 100) 
          : 0;

        // Use cached metrics or defaults
        const cached = metricsMap.get(profile.user_id) as any || {};

        return {
          student_id: profile.user_id,
          full_name: profile.full_name || 'Unknown',
          avatar_url: profile.avatar_url,
          posts_submitted: studentReplies.length,
          on_time_rate: onTimeRate,
          peer_responses: 0, // Would need parent tracking
          avg_response_time_hours: cached.avg_response_time_hours || 0,
          originality_avg: cached.originality_avg || 0,
          engagement_quality_avg: cached.engagement_quality_avg || 0,
          flags_count: flagsMap.get(profile.user_id) || 0,
          last_activity: studentReplies.length > 0 
            ? studentReplies.sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0].created_at 
            : null,
        };
      }) || [];

      return studentMetrics;
    },
    enabled: !!user && !!courseId,
  });
}

// Fetch detailed metrics for a specific student
export function useStudentDiscussionDetail(courseId: string, studentId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-discussion-detail', courseId, studentId],
    queryFn: async () => {
      // Get student profile
      const { data: profile, error: profileError } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('user_id', studentId)
        .single();

      if (profileError) throw profileError;

      // Get discussions
      const { data: discussions, error: discError } = await supabase
        .from('course_discussions')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (discError) throw discError;

      const discussionIds = discussions?.map((d: any) => d.id) || [];

      // Get student's replies
      let replies: any[] = [];
      if (discussionIds.length > 0) {
        const { data: replyData, error: replyError } = await supabase
          .from('discussion_replies')
          .select('*')
          .in('discussion_id', discussionIds)
          .eq('created_by', studentId)
          .order('created_at', { ascending: false });

        if (replyError) throw replyError;
        replies = replyData || [];
      }

      // Get post analyses
      const { data: analyses } = await supabase
        .from('discussion_post_analysis')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId);

      // Get instructor notes
      const { data: notes } = await supabase
        .from('discussion_student_notes')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      // Calculate weekly participation
      const weeklyData: Record<string, number> = {};
      replies?.forEach((reply: any) => {
        const week = new Date(reply.created_at).toISOString().slice(0, 10);
        weeklyData[week] = (weeklyData[week] || 0) + 1;
      });

      // Find best posts (highest originality)
      const analysisMap = new Map(analyses?.map((a: any) => [a.post_id, a]) || []);
      const bestPosts = replies
        ?.map((reply: any) => ({
          ...reply,
          analysis: analysisMap.get(reply.id),
        }))
        .filter((r: any) => r.analysis)
        .sort((a: any, b: any) => {
          const aScore = (a.analysis?.metrics_json as any)?.originality || 0;
          const bScore = (b.analysis?.metrics_json as any)?.originality || 0;
          return bScore - aScore;
        })
        .slice(0, 3);

      // Find flagged posts
      const flaggedPosts = replies
        ?.map((reply: any) => ({
          ...reply,
          analysis: analysisMap.get(reply.id),
        }))
        .filter((r: any) => (r.analysis?.metrics_json as any)?.low_effort_flag);

      return {
        profile,
        discussions: discussions || [],
        replies: replies || [],
        analyses: analyses || [],
        notes: notes || [],
        weeklyData,
        bestPosts: bestPosts || [],
        flaggedPosts: flaggedPosts || [],
        totalPosts: replies?.length || 0,
        totalResponses: 0, // Would need parent tracking
      };
    },
    enabled: !!user && !!courseId && !!studentId,
  });
}

// Add instructor note
export function useAddStudentNote(courseId: string, studentId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (note: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('discussion_student_notes')
        .insert({
          course_id: courseId,
          student_id: studentId,
          author_id: user.id,
          note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['student-discussion-detail', courseId, studentId] 
      });
      toast.success('Note added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add note');
    },
  });
}

// Delete instructor note
export function useDeleteStudentNote(courseId: string, studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('discussion_student_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['student-discussion-detail', courseId, studentId] 
      });
      toast.success('Note deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete note');
    },
  });
}

// Update student metrics cache
export function useUpdateStudentMetrics(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      studentId, 
      metrics 
    }: { 
      studentId: string; 
      metrics: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('discussion_student_metrics')
        .upsert({
          course_id: courseId,
          student_id: studentId,
          metrics_json: metrics,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'course_id,student_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['student-discussion-list', courseId] 
      });
    },
  });
}
