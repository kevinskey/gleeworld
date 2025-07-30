import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Music, 
  Calendar, 
  MessageSquare, 
  Star,
  Home,
  X,
  ClipboardList,
  Target,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export const SectionLeaderDashboard = () => {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState("soprano");

  // Mock data for section members
  const sectionData = {
    soprano: {
      members: [
        { id: 1, name: "Sarah Johnson", attendance: 95, performance: "Excellent", status: "active" },
        { id: 2, name: "Maya Patel", attendance: 88, performance: "Good", status: "active" },
        { id: 3, name: "Emily Chen", attendance: 92, performance: "Very Good", status: "active" },
        { id: 4, name: "Jessica Williams", attendance: 85, performance: "Good", status: "concern" },
      ],
      total: 4,
      avgAttendance: 90
    },
    alto: {
      members: [
        { id: 5, name: "Alicia Davis", attendance: 97, performance: "Excellent", status: "active" },
        { id: 6, name: "Rachel Green", attendance: 89, performance: "Good", status: "active" },
        { id: 7, name: "Nina Rodriguez", attendance: 91, performance: "Very Good", status: "active" },
      ],
      total: 3,
      avgAttendance: 92
    }
  };

  const currentSectionData = sectionData[selectedSection as keyof typeof sectionData] || sectionData.soprano;

  const upcomingTasks = [
    { id: 1, task: "Sectional Rehearsal - Soprano", date: "Today, 3:00 PM", priority: "high" },
    { id: 2, task: "Voice Part Check - Alto", date: "Tomorrow, 2:00 PM", priority: "medium" },
    { id: 3, task: "Performance Evaluation", date: "Friday, 4:00 PM", priority: "high" },
    { id: 4, task: "Section Meeting", date: "Monday, 1:00 PM", priority: "low" },
  ];

  const recentActivity = [
    { id: 1, activity: "Jessica Williams marked absent for Tuesday rehearsal", time: "2 hours ago", type: "attendance" },
    { id: 2, activity: "Soprano sectional completed successfully", time: "1 day ago", type: "rehearsal" },
    { id: 3, activity: "Performance notes submitted for Sarah Johnson", time: "2 days ago", type: "evaluation" },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'concern': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <UserCheck className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Exit Section Leader Dashboard
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Section Leader Dashboard</h1>
              <p className="text-muted-foreground">Manage your voice section and support member development</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Section Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedSection} onValueChange={setSelectedSection}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="soprano">Soprano</TabsTrigger>
                    <TabsTrigger value="alto">Alto</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value={selectedSection} className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Total Members</span>
                          </div>
                          <p className="text-2xl font-bold">{currentSectionData.total}</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Avg. Attendance</span>
                          </div>
                          <p className="text-2xl font-bold">{currentSectionData.avgAttendance}%</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium">Performance</span>
                          </div>
                          <p className="text-2xl font-bold">Good</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Section Members */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg">Section Members</h4>
                      {currentSectionData.members.map((member) => (
                        <Card key={member.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(member.status)}
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Performance: {member.performance}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={member.attendance >= 90 ? "default" : "secondary"}>
                                  {member.attendance}% Attendance
                                </Badge>
                                <div className="mt-2 flex gap-2">
                                  <Button size="sm" variant="outline">
                                    View Details
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    Send Message
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-sm">{task.task}</h5>
                          <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{task.date}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Sectional
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Section Message
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <UserCheck className="h-4 w-4 mr-2" />
                  ble
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Star className="h-4 w-4 mr-2" />
                  Submit Evaluations
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="text-sm">
                        <p className="text-foreground">{activity.activity}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};