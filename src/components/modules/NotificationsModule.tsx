import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Send, Users, Calendar } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";
import { SimplifiedNotificationsPanel } from "@/components/communication/SimplifiedNotificationsPanel";
import { useState } from "react";

export const NotificationsModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const [showFullPanel, setShowFullPanel] = useState(false);
  const notifications = [
    { id: 1, title: "Rehearsal Reminder", message: "Don't forget about tonight's rehearsal at 7pm", type: "reminder", time: "2 hours ago" },
    { id: 2, title: "New Sheet Music", message: "Spring concert music has been uploaded", type: "update", time: "1 day ago" },
    { id: 3, title: "Attendance Alert", message: "3 members marked absent today", type: "alert", time: "3 hours ago" }
  ];

  if (isFullPage || showFullPanel) {
    return (
      <div className="space-y-4">
        {showFullPanel && (
          <Button 
            variant="outline" 
            onClick={() => setShowFullPanel(false)}
            className="mb-4"
          >
            ← Back to Summary
          </Button>
        )}
        <SimplifiedNotificationsPanel />
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
        <div className="mt-4">
          <Button size="sm" onClick={() => setShowFullPanel(true)}>
            Open Notifications Panel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};