import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronRight } from "lucide-react";

interface AttendanceRecord {
  date: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
}

interface ParticipationCardProps {
  attendanceLog?: AttendanceRecord[];
  rehearsalNotes?: string;
  repertoireCheckOff?: { title: string; completed: boolean }[];
  isEditing?: boolean;
  onRehearsalNotesChange?: (value: string) => void;
  onRepertoireChange?: (title: string, completed: boolean) => void;
}

const defaultRepertoire = [
  { title: "Lift Every Voice and Sing", completed: true },
  { title: "I'll Be On My Way", completed: true },
  { title: "Ad Astra", completed: true },
];

const defaultAttendance: AttendanceRecord[] = [
  { date: "04/20/2024", status: "Present" },
  { date: "04/19/2024", status: "Late" },
  { date: "04/16/2024", status: "Absent" },
];

export const ParticipationCard = ({
  attendanceLog = defaultAttendance,
  rehearsalNotes = "",
  repertoireCheckOff = defaultRepertoire,
  isEditing = false,
  onRehearsalNotesChange,
  onRepertoireChange,
}: ParticipationCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'text-green-600';
      case 'Late': return 'text-yellow-600';
      case 'Absent': return 'text-red-600';
      case 'Excused': return 'text-blue-600';
      default: return 'text-foreground';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Participation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attendance Log */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Attendance Log</h4>
          <div className="space-y-1">
            {attendanceLog.slice(0, 3).map((record, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{record.date}</span>
                <span className="mx-2 text-muted-foreground">—</span>
                <span className={getStatusColor(record.status)}>{record.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rehearsal Notes */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Rehearsal Notes</h4>
          <Input
            value={rehearsalNotes}
            onChange={(e) => onRehearsalNotesChange?.(e.target.value)}
            disabled={!isEditing}
            className="h-20 text-sm"
            placeholder="Add rehearsal notes..."
          />
        </div>

        {/* Repertoire Check-Off */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Repertoire Check-Off</h4>
          <div className="space-y-2">
            {repertoireCheckOff.map((piece) => (
              <div key={piece.title} className="flex items-center gap-2">
                <Checkbox
                  checked={piece.completed}
                  onCheckedChange={(checked) => onRepertoireChange?.(piece.title, !!checked)}
                  disabled={!isEditing}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm text-foreground">{piece.title}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Compact version for left column
export const ParticipationCompactCard = ({
  attendanceLog = defaultAttendance,
  repertoireCheckOff = defaultRepertoire,
}: Pick<ParticipationCardProps, 'attendanceLog' | 'repertoireCheckOff'>) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Participation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Attendance Log */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Attendance Log</h4>
          <div className="flex items-center justify-between border border-border rounded-md px-3 py-2">
            <span className="text-sm text-muted-foreground">
              {attendanceLog[0]?.date || 'No records'}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Rehearsal Notes */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Rehearsal Notes</h4>
          <div className="space-y-1">
            {repertoireCheckOff.map((piece) => (
              <div key={piece.title} className="flex items-center gap-2">
                <Checkbox
                  checked={piece.completed}
                  disabled
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm text-foreground">{piece.title}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
