import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFirstYearStudents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fy-students-detailed"],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      try {
        // Get students first
        const { data: students, error: studentsError } = await supabase
          .from("fy_students")
          .select("*");

        if (studentsError) throw studentsError;

        // Get cohorts
        const { data: cohorts, error: cohortsError } = await supabase
          .from("fy_cohorts")
          .select("*")
          .eq("is_active", true);

        if (cohortsError) throw cohortsError;

        // Get profiles 
        const { data: profiles, error: profilesError } = await supabase
          .from("gw_profiles")
          .select("user_id, full_name, email, role");

        if (profilesError) throw profilesError;

        // Get check-ins
        const { data: checkins, error: checkinsError } = await supabase
          .from("fy_checkins")
          .select("*");

        if (checkinsError) throw checkinsError;

        // Calculate attendance metrics for each student
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Filter students from active cohorts only
        const activeCohortIds = cohorts?.map(c => c.id) || [];
        const activeStudents = students?.filter(s => activeCohortIds.includes(s.cohort_id)) || [];

        const studentsWithMetrics = activeStudents.map(student => {
          // Find related data
          const profile = profiles?.find(p => p.user_id === student.user_id);
          const cohort = cohorts?.find(c => c.id === student.cohort_id);
          const studentCheckins = checkins?.filter(c => c.student_id === student.id) || [];
          
          // Filter recent check-ins
          const recentCheckins = studentCheckins.filter(
            checkin => new Date(checkin.updated_at) >= weekAgo
          );
          
          const lastCheckin = studentCheckins
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

          // Determine status based on check-ins
          let status = "critical";
          let riskLevel = "high";

          if (recentCheckins.length >= 2) {
            status = "excellent";
            riskLevel = "low";
          } else if (recentCheckins.length >= 1) {
            status = "good";
            riskLevel = "low";
          } else if (studentCheckins.length > 0) {
            status = "concerning";
            riskLevel = "medium";
          }

          // Calculate days since last check-in for additional risk assessment
          if (lastCheckin) {
            const daysSinceLastCheckin = Math.floor(
              (Date.now() - new Date(lastCheckin.updated_at).getTime()) / (24 * 60 * 60 * 1000)
            );
            
            if (daysSinceLastCheckin > 14) {
              riskLevel = "high";
              status = "critical";
            } else if (daysSinceLastCheckin > 7) {
              riskLevel = "medium";
              if (status === "excellent") status = "good";
            }
          }

          return {
            id: student.id,
            studentId: student.student_id || "",
            name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            avatar: null, // Avatar will be handled separately
            checkinsThisWeek: recentCheckins.length,
            totalRequired: 2, // Assuming 2 check-ins per week requirement
            lastCheckin: lastCheckin?.updated_at || null,
            status,
            riskLevel,
            voicePart: student.voice_part,
            cohortName: cohort?.name || "Unknown Cohort",
            totalCheckins: studentCheckins.length,
            averageMood: 3 // Default mood since we don't have mood_rating in the schema
          };
        });

        return studentsWithMetrics;
      } catch (error) {
        console.error("Error fetching first-year students:", error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: 1,
  });
};