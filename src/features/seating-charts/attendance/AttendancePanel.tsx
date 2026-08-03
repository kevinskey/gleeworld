// Attendance toolbar panel: counts, reflow toggle, refresh.
import { CheckCircle2, Clock, XCircle, MinusCircle, HelpCircle, Wand2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ATTENDANCE_COLORS, countAttendance, reflowAbsent } from './attendanceStatus';
import type { ChartAttendanceState } from './useChartAttendance';
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';

interface AttendancePanelProps {
  attendance: ChartAttendanceState;
  assignments: SeatingAssignment[];
  objects: SeatingObject[];
  onReflow: (moves: Array<{ id: string; x: number; y: number }>) => void;
  onRefresh: () => void;
}

export function AttendancePanel({ attendance, assignments, objects, onReflow, onRefresh }: AttendancePanelProps) {
  const counts = countAttendance(assignments, attendance.byUserId);
  const canReflow = counts.absent > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Attendance">
          <CheckCircle2 className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Attendance</p>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {!attendance.hasAssociation ? (
          <p className="text-muted-foreground py-2">
            Attach this chart to an event or course from the Associations menu to see attendance here.
          </p>
        ) : !attendance.session ? (
          <p className="text-muted-foreground py-2">
            No attendance session for the linked event or course yet.
          </p>
        ) : (
          <>
            <div className="border rounded p-2 bg-muted/30 space-y-1">
              <p className="font-medium">{attendance.session.title}</p>
              <p className="text-xs text-muted-foreground">
                Opens {new Date(attendance.session.opens_at).toLocaleString()}
              </p>
            </div>
            <ul className="space-y-1">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" style={{ color: ATTENDANCE_COLORS.present }} /> Present</span>
                <span className="font-semibold">{counts.present}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" style={{ color: ATTENDANCE_COLORS.late }} /> Late</span>
                <span className="font-semibold">{counts.late}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4" style={{ color: ATTENDANCE_COLORS.absent }} /> Absent</span>
                <span className="font-semibold">{counts.absent}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><MinusCircle className="w-4 h-4" style={{ color: ATTENDANCE_COLORS.excused }} /> Excused</span>
                <span className="font-semibold">{counts.excused}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-muted-foreground" /> No record</span>
                <span className="font-semibold">{counts.unknown}</span>
              </li>
            </ul>
            <Button
              variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5"
              disabled={!canReflow}
              onClick={() => {
                const moves = reflowAbsent(objects, assignments, attendance.byUserId);
                if (!confirm(`Move ${moves.length} absent people to a hold row above the canvas? Reload to undo.`)) return;
                onReflow(moves);
              }}
            >
              <Wand2 className="w-4 h-4" /> Reflow absent to hold zone
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default AttendancePanel;
