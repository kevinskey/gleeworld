import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Pin } from "lucide-react";

export const ChaplainAnnouncements = () => {
  const announcements = [
    {
      id: 1,
      title: "Prayer Chain for Summer Concert",
      content: "Join us in a special prayer chain leading up to our summer concert this Friday. Each member will take a 30-minute slot to pray for our performance and the hearts of our audience.",
      type: "Prayer Request",
      isPinned: true,
      date: "2024-07-30"
    },
    {
      id: 2,
      title: "Spiritual Retreat Planning",
      content: "We're planning our annual spiritual retreat for September. Please submit your availability and any topic suggestions for our devotional sessions.",
      type: "Event",
      isPinned: false,
      date: "2024-07-28"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chaplain Announcements</h3>
          <p className="text-sm text-muted-foreground">Share spiritual reminders and messages</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      <div className="grid gap-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className={announcement.isPinned ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {announcement.title}
                    {announcement.isPinned && (
                      <Pin className="h-4 w-4 text-primary" />
                    )}
                  </CardTitle>
                  <Badge variant="outline">{announcement.type}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {announcement.content}
              </p>
              <div className="text-xs text-muted-foreground">
                Posted on {new Date(announcement.date).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};