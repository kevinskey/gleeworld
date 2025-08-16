import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Calendar,
  Zap,
  Send,
  Plus
} from "lucide-react";
import { AttendanceDonut } from "../charts/AttendanceDonut";
import { TaskHeatmap } from "../charts/TaskHeatmap";
import { RiskFlagsList } from "../widgets/RiskFlagsList";
import { useFirstYearConsoleData } from "@/hooks/useFirstYearConsoleData";

export const SnapshotTab = () => {
  const { cohortStats, attendanceData, taskHeatmapData } = useFirstYearConsoleData();

  const quickStats = [
    {
      title: "Total Students",
      value: cohortStats?.totalStudents || 0,
      icon: Users,
      trend: "+2 this week",
      color: "text-blue-600"
    },
    {
      title: "Attendance Rate",
      value: `${cohortStats?.attendanceRate || 0}%`,
      icon: TrendingUp,
      trend: "+5% vs last week",
      color: "text-green-600"
    },
    {
      title: "Active Cases",
      value: cohortStats?.openCases || 0,
      icon: AlertTriangle,
      trend: "2 resolved today",
      color: "text-orange-600"
    },
    {
      title: "Overdue Tasks",
      value: cohortStats?.overdueTasks || 0,
      icon: Calendar,
      trend: "-3 vs yesterday",
      color: "text-red-600"
    }
  ];

  const quickActions = [
    {
      title: "Nudge All Late",
      description: "Send reminders to students with overdue tasks",
      icon: Zap,
      action: "nudge",
      variant: "default" as const,
      count: cohortStats?.overdueTasks || 0
    },
    {
      title: "Schedule Announcement",
      description: "Create and schedule a cohort-wide announcement",
      icon: Send,
      action: "announce",
      variant: "outline" as const
    },
    {
      title: "Create Task from Template",
      description: "Generate new assignments from predefined templates",
      icon: Plus,
      action: "task",
      variant: "secondary" as const
    }
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "nudge":
        console.log("Nudging all late students...");
        // Implementation for nudging late students
        break;
      case "announce":
        console.log("Opening announcement scheduler...");
        // Implementation for scheduling announcements
        break;
      case "task":
        console.log("Opening task template selector...");
        // Implementation for creating tasks from templates
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold">{stat.value}</h3>
                      <IconComponent className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.trend}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Donut */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceDonut data={attendanceData} />
            </CardContent>
          </Card>

          {/* Task Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Task Submission Activity (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskHeatmap data={taskHeatmapData} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Risk Flags & Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{action.title}</h4>
                          {action.count && action.count > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {action.count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={action.variant}
                      className="w-full"
                      onClick={() => handleQuickAction(action.action)}
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {action.title}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Risk Flags */}
          <RiskFlagsList />
        </div>
      </div>
    </div>
  );
};