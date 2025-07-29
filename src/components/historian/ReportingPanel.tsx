import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  Download, 
  Calendar, 
  FileText, 
  Users, 
  Camera,
  Video,
  Upload,
  TrendingUp,
  PieChart
} from "lucide-react";

interface ReportData {
  period: string;
  eventsDocumented: number;
  totalEvents: number;
  mediaUploaded: number;
  interviewsCompleted: number;
  blogPostsPublished: number;
  archiveItemsAdded: number;
}

export const ReportingPanel = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("current-year");
  const [reportType, setReportType] = useState("summary");

  // Mock data for different periods
  const reportData: Record<string, ReportData> = {
    "current-year": {
      period: "2024 Academic Year",
      eventsDocumented: 25,
      totalEvents: 28,
      mediaUploaded: 156,
      interviewsCompleted: 8,
      blogPostsPublished: 12,
      archiveItemsAdded: 89
    },
    "fall-semester": {
      period: "Fall 2024 Semester",
      eventsDocumented: 15,
      totalEvents: 16,
      mediaUploaded: 87,
      interviewsCompleted: 5,
      blogPostsPublished: 7,
      archiveItemsAdded: 52
    },
    "spring-semester": {
      period: "Spring 2024 Semester",
      eventsDocumented: 10,
      totalEvents: 12,
      mediaUploaded: 69,
      interviewsCompleted: 3,
      blogPostsPublished: 5,
      archiveItemsAdded: 37
    }
  };

  const data = reportData[selectedPeriod];
  const completionRate = Math.round((data.eventsDocumented / data.totalEvents) * 100);

  const recentActivity = [
    { date: "2024-11-21", activity: "Uploaded Fall Concert media", type: "media" },
    { date: "2024-11-20", activity: "Published Centennial blog post", type: "blog" },
    { date: "2024-11-18", activity: "Completed Dr. Johnson interview", type: "interview" },
    { date: "2024-11-15", activity: "Documented Homecoming performance", type: "event" },
    { date: "2024-11-10", activity: "Added 15 historical photos to archive", type: "archive" }
  ];

  const mediaBreakdown = [
    { type: "Photos", count: 89, percentage: 57 },
    { type: "Videos", count: 34, percentage: 22 },
    { type: "Audio", count: 18, percentage: 12 },
    { type: "Documents", count: 15, percentage: 9 }
  ];

  const monthlyProgress = [
    { month: "Aug", events: 3, media: 12 },
    { month: "Sep", events: 4, media: 18 },
    { month: "Oct", events: 5, media: 25 },
    { month: "Nov", events: 8, media: 32 },
    { month: "Dec", events: 5, media: 20 }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "media": return <Camera className="h-4 w-4" />;
      case "blog": return <FileText className="h-4 w-4" />;
      case "interview": return <Users className="h-4 w-4" />;
      case "event": return <Calendar className="h-4 w-4" />;
      case "archive": return <Upload className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const exportReport = (format: string) => {
    // Mock export functionality
    console.log(`Exporting ${reportType} report for ${data.period} as ${format}`);
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reporting Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-year">2024 Academic Year</SelectItem>
                  <SelectItem value="fall-semester">Fall 2024 Semester</SelectItem>
                  <SelectItem value="spring-semester">Spring 2024 Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Analysis</SelectItem>
                  <SelectItem value="media">Media Report</SelectItem>
                  <SelectItem value="interviews">Interview Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => exportReport('PDF')}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => exportReport('CSV')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Events Documented</p>
                    <p className="text-2xl font-bold">{data.eventsDocumented}/{data.totalEvents}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={completionRate >= 90 ? "default" : completionRate >= 75 ? "secondary" : "destructive"}>
                      {completionRate}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Media Uploads</p>
                    <p className="text-2xl font-bold">{data.mediaUploaded}</p>
                  </div>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Interviews</p>
                    <p className="text-2xl font-bold">{data.interviewsCompleted}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Blog Posts</p>
                    <p className="text-2xl font-bold">{data.blogPostsPublished}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Media Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Media Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mediaBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary" style={{ opacity: 1 - (index * 0.2) }} />
                    <span className="font-medium">{item.type}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{item.count}</span>
                    <span className="text-sm text-muted-foreground ml-2">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="mt-1">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.activity}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyProgress.map((month, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 items-center">
                <div className="font-medium">{month.month}</div>
                <div className="col-span-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Events: {month.events}</div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(month.events / 8) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Media: {month.media}</div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-secondary h-2 rounded-full" 
                          style={{ width: `${(month.media / 32) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline">
                    {Math.round(((month.events + month.media) / 40) * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span>Detailed Report</span>
              <span className="text-xs text-muted-foreground">PDF Format</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>Data Export</span>
              <span className="text-xs text-muted-foreground">CSV Format</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Video className="h-6 w-6" />
              <span>Media List</span>
              <span className="text-xs text-muted-foreground">Excel Format</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};