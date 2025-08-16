import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MessageSquare, 
  CheckSquare, 
  Calendar, 
  AlertTriangle, 
  BookOpen, 
  BarChart3 
} from "lucide-react";
import { SnapshotTab } from "./tabs/SnapshotTab";
import { CommsTab } from "./tabs/CommsTab";
import { TasksTab } from "./tabs/TasksTab";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { CasesTab } from "./tabs/CasesTab";
import { LibraryTab } from "./tabs/LibraryTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { useFirstYearConsoleData } from "@/hooks/useFirstYearConsoleData";

export const FirstYearConsole = () => {
  const [activeTab, setActiveTab] = useState("snapshot");
  const { cohortStats, isLoading } = useFirstYearConsoleData();

  const tabs = [
    {
      id: "snapshot",
      label: "Snapshot",
      icon: BarChart3,
      description: "Overview & quick actions",
      badge: null
    },
    {
      id: "comms",
      label: "Comms",
      icon: MessageSquare,
      description: "Communication management",
      badge: cohortStats?.pendingMessages || 0
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: CheckSquare,
      description: "Assignment tracking",
      badge: cohortStats?.overdueTasks || 0
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: Calendar,
      description: "Attendance monitoring",
      badge: cohortStats?.attendanceAlerts || 0
    },
    {
      id: "cases",
      label: "Cases",
      icon: AlertTriangle,
      description: "Student support cases",
      badge: cohortStats?.openCases || 0
    },
    {
      id: "library",
      label: "Library",
      icon: BookOpen,
      description: "Resource management",
      badge: null
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      description: "Detailed analytics",
      badge: null
    }
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">First-Year Console</h1>
          <p className="text-muted-foreground">
            Manage and monitor first-year student progress
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {cohortStats?.totalStudents || 0} Students
          </Badge>
          <Badge variant="secondary">
            2024-2025 Academic Year
          </Badge>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <Card>
          <CardContent className="p-6">
            <TabsList className="grid w-full grid-cols-7 gap-2 h-auto p-1">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex flex-col items-center gap-2 h-auto py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      {tab.badge !== null && tab.badge > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                          {tab.badge > 99 ? "99+" : tab.badge}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-medium">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <TabsContent value="snapshot" className="space-y-0">
          <SnapshotTab />
        </TabsContent>

        <TabsContent value="comms" className="space-y-0">
          <CommsTab />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-0">
          <TasksTab />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-0">
          <AttendanceTab />
        </TabsContent>

        <TabsContent value="cases" className="space-y-0">
          <CasesTab />
        </TabsContent>

        <TabsContent value="library" className="space-y-0">
          <LibraryTab />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-0">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};