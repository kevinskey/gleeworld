import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFirstYearConsoleData = () => {
  const { user } = useAuth();

  // Get cohort statistics
  const { data: cohortStats, isLoading } = useQuery({
    queryKey: ["fy-console-stats"],
    queryFn: async () => {
      // Get all active cohorts
      const { data: cohorts, error: cohortsError } = await supabase
        .from("fy_cohorts")
        .select("*")
        .eq("is_active", true);

      if (cohortsError) throw cohortsError;

      // Get total students
      const { data: students, error: studentsError } = await supabase
        .from("fy_students")
        .select(`
          *,
          cohort:fy_cohorts!inner(*)
        `)
        .eq("cohort.is_active", true);

      if (studentsError) throw studentsError;

      // Get recent check-ins (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: recentCheckins, error: checkinsError } = await supabase
        .from("fy_checkins")
        .select("*")
        .gte("submitted_at", weekAgo.toISOString());

      if (checkinsError) throw checkinsError;

      // Get overdue tasks
      const { data: overdueTasks, error: tasksError } = await supabase
        .from("fy_task_submissions")
        .select("*")
        .eq("status", "draft")
        .lt("due_date", new Date().toISOString());

      if (tasksError) throw tasksError;

      // Calculate statistics
      const totalStudents = students.length;
      const studentsWithRecentCheckins = new Set(recentCheckins.map(c => c.student_id)).size;
      const attendanceRate = totalStudents > 0 ? (studentsWithRecentCheckins / totalStudents) * 100 : 0;

      // Risk flags - students who haven't checked in recently or have low mood ratings
      const riskFlags = students.filter(student => {
        const hasRecentCheckin = recentCheckins.some(c => c.student_id === student.id);
        const latestCheckin = recentCheckins
          .filter(c => c.student_id === student.id)
          .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
        
        return !hasRecentCheckin || (latestCheckin && latestCheckin.mood_rating <= 2);
      });

      return {
        totalStudents,
        activeCohorts: cohorts.length,
        attendanceRate: Math.round(attendanceRate),
        overdueTasks: overdueTasks.length,
        riskFlags: riskFlags.length,
        pendingMessages: 3, // Mock data
        attendanceAlerts: Math.floor(totalStudents * 0.1), // Mock: 10% have attendance issues
        openCases: Math.floor(totalStudents * 0.05), // Mock: 5% have open cases
        recentActivity: {
          checkins: recentCheckins.length,
          submissions: 0, // Would calculate from recent submissions
          messages: 12 // Mock data
        }
      };
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Get attendance data for donut chart
  const { data: attendanceData } = useQuery({
    queryKey: ["fy-attendance-breakdown"],
    queryFn: async () => {
      const { data: students, error } = await supabase
        .from("fy_students")
        .select(`
          *,
          checkins:fy_checkins(*)
        `);

      if (error) throw error;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      let excellent = 0;
      let good = 0;
      let concerning = 0;
      let critical = 0;

      students.forEach(student => {
        const recentCheckins = student.checkins.filter(
          c => new Date(c.submitted_at) >= weekAgo
        );

        if (recentCheckins.length >= 2) {
          excellent++;
        } else if (recentCheckins.length === 1) {
          good++;
        } else if (recentCheckins.length === 0) {
          const lastCheckin = student.checkins
            .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
          
          if (lastCheckin) {
            const daysSinceLastCheckin = Math.floor(
              (Date.now() - new Date(lastCheckin.submitted_at).getTime()) / (24 * 60 * 60 * 1000)
            );
            
            if (daysSinceLastCheckin <= 14) {
              concerning++;
            } else {
              critical++;
            }
          } else {
            critical++;
          }
        }
      });

      return [
        { name: "Excellent", value: excellent, color: "#22c55e" },
        { name: "Good", value: good, color: "#3b82f6" },
        { name: "Concerning", value: concerning, color: "#f59e0b" },
        { name: "Critical", value: critical, color: "#ef4444" }
      ];
    },
    enabled: !!user,
  });

  // Get task completion heatmap data
  const { data: taskHeatmapData } = useQuery({
    queryKey: ["fy-task-heatmap"],
    queryFn: async () => {
      const { data: submissions, error } = await supabase
        .from("fy_task_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Generate heatmap data for the last 30 days
      const heatmapData = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const daySubmissions = submissions.filter(s => 
          s.submitted_at && s.submitted_at.startsWith(dateString)
        );

        heatmapData.push({
          date: dateString,
          day: date.getDate(),
          month: date.getMonth(),
          submissions: daySubmissions.length,
          intensity: Math.min(daySubmissions.length / 5, 1) // Normalize to 0-1
        });
      }

      return heatmapData;
    },
    enabled: !!user,
  });

  return {
    cohortStats,
    attendanceData,
    taskHeatmapData,
    isLoading,
  };
};