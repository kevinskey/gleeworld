import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Upload, 
  FileText, 
  Users, 
  Camera, 
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from "lucide-react";

export const DashboardOverview = () => {
  // Mock data for demonstration
  const stats = {
    upcomingEvents: 3,
    mediaUploadsNeeded: 5,
    draftPosts: 2,
    pendingInterviews: 1,
    eventsDocumented: 85,
    totalEvents: 100
  };

  const recentActivity = [
    { type: "upload", description: "Uploaded photos from MLK Convocation", time: "2 hours ago" },
    { type: "journal", description: "Drafted blog post for Fall Concert", time: "1 day ago" },
    { type: "interview", description: "Completed interview with Class of '95", time: "3 days ago" },
    { type: "event", description: "Documented Homecoming performance", time: "1 week ago" },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "upload": return <Upload className="h-4 w-4" />;
      case "journal": return <FileText className="h-4 w-4" />;
      case "interview": return <Users className="h-4 w-4" />;
      case "event": return <Calendar className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Upcoming Events</span>
            <Badge variant="secondary">{stats.upcomingEvents}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Media Uploads Due</span>
            <Badge variant="destructive">{stats.mediaUploadsNeeded}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Draft Posts</span>
            <Badge variant="outline">{stats.draftPosts}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pending Interviews</span>
            <Badge variant="secondary">{stats.pendingInterviews}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Documentation Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Events Documented</span>
              <span>{stats.eventsDocumented}/{stats.totalEvents}</span>
            </div>
            <Progress value={(stats.eventsDocumented / stats.totalEvents) * 100} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="font-semibold">{stats.eventsDocumented}</div>
              <div className="text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="font-semibold">{stats.totalEvents - stats.eventsDocumented}</div>
              <div className="text-muted-foreground">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Urgent Tasks */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Urgent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Holiday Concert Photos</span>
              </div>
              <p className="text-sm text-muted-foreground">Upload and tag photos from last weekend's performance</p>
              <Badge variant="destructive" className="mt-2">Due Today</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Spring Tour Blog</span>
              </div>
              <p className="text-sm text-muted-foreground">Draft blog post about upcoming spring tour plans</p>
              <Badge variant="secondary" className="mt-2">Due Tomorrow</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="font-medium">Alumni Interview</span>
              </div>
              <p className="text-sm text-muted-foreground">Schedule follow-up with Dr. Johnson</p>
              <Badge variant="outline" className="mt-2">This Week</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};