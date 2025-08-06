import { Calendar, Clock, MapPin } from "lucide-react";

interface ExecutiveCalendarProps {
  preview?: boolean;
  execRole?: string;
}

export const ExecutiveCalendar = ({ preview = false }: ExecutiveCalendarProps) => {
  if (preview) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 border rounded text-sm">
          <Calendar className="h-4 w-4 text-purple-600" />
          <span>Board Meeting</span>
        </div>
        <div className="flex items-center gap-2 p-2 border rounded text-sm">
          <Clock className="h-4 w-4 text-orange-600" />
          <span>Planning Session</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Executive Calendar module coming soon...</p>
    </div>
  );
};