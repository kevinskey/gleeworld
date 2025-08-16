import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, User, Clock, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export const RiskFlagsList = () => {
  const { data: riskFlags = [], isLoading } = useQuery({
    queryKey: ["fy-risk-flags"],
    queryFn: async () => {
      // Get students with recent activity data
      const { data: students, error } = await supabase
        .from("fy_students")
        .select(`
          *,
          cohort:fy_cohorts(*),
          checkins:fy_checkins(*),
          practice_logs:fy_practice_logs(*),
          task_submissions:fy_task_submissions(*)
        `);

      if (error) throw error;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const riskStudents = students.filter(student => {
        // Check for recent check-ins
        const recentCheckins = student.checkins.filter(
          c => new Date(c.submitted_at) >= weekAgo
        );

        // Check for low mood ratings
        const latestCheckin = student.checkins
          .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];

        // Check for overdue tasks
        const overdueTasks = student.task_submissions.filter(
          t => t.status === 'draft' && t.due_date && new Date(t.due_date) < new Date()
        );

        // Risk criteria
        const noRecentCheckin = recentCheckins.length === 0;
        const lowMood = latestCheckin && latestCheckin.mood_rating <= 2;
        const hasOverdueTasks = overdueTasks.length > 0;
        const noPracticeRecent = student.practice_logs.filter(
          p => new Date(p.practice_date) >= weekAgo
        ).length === 0;

        return noRecentCheckin || lowMood || hasOverdueTasks || noPracticeRecent;
      });

      // Add risk details and mock profile data
      return riskStudents.map(student => {
        const recentCheckins = student.checkins.filter(
          c => new Date(c.submitted_at) >= weekAgo
        );
        const latestCheckin = student.checkins
          .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
        const overdueTasks = student.task_submissions.filter(
          t => t.status === 'draft' && t.due_date && new Date(t.due_date) < new Date()
        );

        const risks = [];
        if (recentCheckins.length === 0) risks.push("No recent check-in");
        if (latestCheckin && latestCheckin.mood_rating <= 2) risks.push("Low mood rating");
        if (overdueTasks.length > 0) risks.push(`${overdueTasks.length} overdue task(s)`);

        return {
          id: student.id,
          name: `Student ${student.id.slice(0, 8)}`, // Mock name
          voicePart: student.voice_part || "Soprano",
          lastActivity: latestCheckin ? new Date(latestCheckin.submitted_at) : null,
          riskLevel: risks.length >= 3 ? "high" : risks.length >= 2 ? "medium" : "low",
          risks,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${student.id}`
        };
      }).slice(0, 10); // Limit to 10 for display
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getRiskIcon = (level: string) => {
    return level === "high" ? "🚨" : level === "medium" ? "⚠️" : "📋";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Risk Flags
          {riskFlags.length > 0 && (
            <Badge variant="destructive">{riskFlags.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {riskFlags.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-muted-foreground">No risk flags detected!</p>
            <p className="text-xs text-muted-foreground mt-1">
              All students are staying engaged
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {riskFlags.map((flag) => (
              <div 
                key={flag.id}
                className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl">{getRiskIcon(flag.riskLevel)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{flag.name}</h4>
                      <Badge variant={getRiskBadgeVariant(flag.riskLevel)}>
                        {flag.riskLevel}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {flag.voicePart}
                      </span>
                      {flag.lastActivity && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(flag.lastActivity, { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {flag.risks.map((risk, index) => (
                        <div key={index} className="text-xs text-destructive">
                          • {risk}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button size="sm" variant="outline" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};