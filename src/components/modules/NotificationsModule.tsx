import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Send, Users, Calendar } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";

export const NotificationsModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const notifications = [
    { id: 1, title: "Rehearsal Reminder", message: "Don't forget about tonight's rehearsal at 7pm", type: "reminder", time: "2 hours ago" },
    { id: 2, title: "New Sheet Music", message: "Spring concert music has been uploaded", type: "update", time: "1 day ago" },
    { id: 3, title: "Attendance Alert", message: "3 members marked absent today", type: "alert", time: "3 hours ago" }
  ];

  if (isFullPage) {
    return (
      <div className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3 p-3 border rounded">
                  <Bell className="h-4 w-4 mt-1 text-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium">{notif.title}</div>
                    <div className="text-sm text-muted-foreground">{notif.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">{notif.time}</div>
                  </div>
                  <Badge variant={notif.type === 'alert' ? 'destructive' : 'secondary'}>
                    {notif.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Send to All Members
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Email Notification
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Notification
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold">47</div>
                <div className="text-sm text-muted-foreground">Notifications sent today</div>
              </div>
              <div>
                <div className="text-2xl font-bold">92%</div>
                <div className="text-sm text-muted-foreground">Read rate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>Manage system notifications and alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.slice(0, 3).map((notif) => (
            <div key={notif.id} className="text-sm">{notif.title}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};