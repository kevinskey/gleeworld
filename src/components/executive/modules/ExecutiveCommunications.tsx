import { MessageSquare, Send, Bell } from "lucide-react";

interface ExecutiveCommunicationsProps {
  preview?: boolean;
  execRole?: string;
}

export const ExecutiveCommunications = ({ preview = false }: ExecutiveCommunicationsProps) => {
  if (preview) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 border rounded text-sm">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span>Board Meeting Notes</span>
        </div>
        <div className="flex items-center gap-2 p-2 border rounded text-sm">
          <Bell className="h-4 w-4 text-yellow-600" />
          <span>Announcement Draft</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Executive Communications module coming soon...</p>
    </div>
  );
};