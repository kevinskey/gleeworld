import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useFirstYearData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user's student record
  const { data: studentRecord } = useQuery({
    queryKey: ["fy-student", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("fy_students")
        .select(`
          *,
          cohort:fy_cohorts(*)
        `)
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Get checkins for current week
  const { data: checkins } = useQuery({
    queryKey: ["fy-checkins", studentRecord?.id],
    queryFn: async () => {
      if (!studentRecord?.id) return [];
      
      const currentWeek = Math.ceil((Date.now() - new Date(studentRecord.cohort.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      const { data, error } = await supabase
        .from("fy_checkins")
        .select("*")
        .eq("student_id", studentRecord.id)
        .eq("week_number", currentWeek)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentRecord?.id,
  });

  // Get practice logs for current week
  const { data: practiceLogs } = useQuery({
    queryKey: ["fy-practice-logs", studentRecord?.id],
    queryFn: async () => {
      if (!studentRecord?.id) return [];
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("fy_practice_logs")
        .select("*")
        .eq("student_id", studentRecord.id)
        .gte("practice_date", weekAgo.toISOString().split('T')[0])
        .order("practice_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentRecord?.id,
  });

  // Get task submissions
  const { data: taskSubmissions } = useQuery({
    queryKey: ["fy-task-submissions", studentRecord?.id],
    queryFn: async () => {
      if (!studentRecord?.id) return [];
      
      const { data, error } = await supabase
        .from("fy_task_submissions")
        .select("*")
        .eq("student_id", studentRecord.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentRecord?.id,
  });

  // Submit check-in mutation
  const submitCheckInMutation = useMutation({
    mutationFn: async (checkInData: {
      week_number: number;
      academic_progress?: string;
      vocal_progress?: string;
      challenges?: string;
      goals?: string;
      mood_rating?: number;
    }) => {
      if (!studentRecord?.id) throw new Error("No student record found");
      
      const { data, error } = await supabase
        .from("fy_checkins")
        .insert({
          student_id: studentRecord.id,
          ...checkInData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fy-checkins"] });
      toast({
        title: "Check-in submitted",
        description: "Your weekly check-in has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit check-in. Please try again.",
        variant: "destructive",
      });
      console.error("Check-in submission error:", error);
    },
  });

  // Submit practice log mutation
  const submitPracticeLogMutation = useMutation({
    mutationFn: async (practiceData: {
      practice_date: string;
      duration_minutes: number;
      pieces_practiced?: string[];
      focus_areas?: string[];
      notes?: string;
      quality_rating?: number;
    }) => {
      if (!studentRecord?.id) throw new Error("No student record found");
      
      const { data, error } = await supabase
        .from("fy_practice_logs")
        .insert({
          student_id: studentRecord.id,
          ...practiceData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fy-practice-logs"] });
      toast({
        title: "Practice logged",
        description: "Your practice session has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to log practice session. Please try again.",
        variant: "destructive",
      });
      console.error("Practice log submission error:", error);
    },
  });

  return {
    studentRecord,
    checkins,
    practiceLogs,
    taskSubmissions,
    submitCheckIn: submitCheckInMutation.mutate,
    submitPracticeLog: submitPracticeLogMutation.mutate,
    isSubmittingCheckIn: submitCheckInMutation.isPending,
    isSubmittingPracticeLog: submitPracticeLogMutation.isPending,
  };
};