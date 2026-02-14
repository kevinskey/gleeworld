import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, MapPin, Users, ClipboardCheck, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface AttendeeRecord {
  id: string;
  user_id: string;
  status: string;
  check_in_time: string | null;
  notes: string | null;
  display_name: string;
}

interface EventAttendanceDialogProps {
  event: GleeWorldEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: "Present", color: "#16a34a", bg: "#f0fdf4" },
  absent: { label: "Absent", color: "#dc2626", bg: "#fef2f2" },
  excused: { label: "Excused", color: "#ca8a04", bg: "#fefce8" },
  late: { label: "Late", color: "#2563eb", bg: "#eff6ff" },
  checked_in: { label: "Present", color: "#16a34a", bg: "#f0fdf4" },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status?.toLowerCase()] || { label: status || "Unknown", color: "#64748b", bg: "#f8fafc" };

export const EventAttendanceDialog = ({
  event,
  open,
  onOpenChange,
}: EventAttendanceDialogProps) => {
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !event) {
      setAttendees([]);
      return;
    }
    fetchAttendance();
  }, [open, event?.id]);

  const fetchAttendance = async () => {
    if (!event) return;
    setLoading(true);

    try {
      // Fetch from gw_event_attendance joined with profiles
      const [gwResult, legacyResult] = await Promise.all([
        supabase
          .from("gw_event_attendance")
          .select(`
            id, user_id, attendance_status, check_in_time, notes,
            gw_profiles!gw_event_attendance_user_id_fkey(display_name, first_name, last_name)
          `)
          .eq("event_id", event.id),
        supabase
          .from("attendance")
          .select(`
            id, user_id, status, recorded_at, notes,
            gw_profiles!attendance_user_id_fkey(display_name, first_name, last_name)
          `)
          .eq("event_id", event.id),
      ]);

      const seenUserIds = new Set<string>();
      const combined: AttendeeRecord[] = [];

      // Process gw_event_attendance records first (newer system)
      for (const r of gwResult.data || []) {
        if (seenUserIds.has(r.user_id)) continue;
        seenUserIds.add(r.user_id);
        const profile = r.gw_profiles as any;
        combined.push({
          id: r.id,
          user_id: r.user_id,
          status: r.attendance_status,
          check_in_time: r.check_in_time,
          notes: r.notes,
          display_name:
            profile?.display_name ||
            [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
            "Unknown Member",
        });
      }

      // Then legacy records
      for (const r of legacyResult.data || []) {
        if (seenUserIds.has(r.user_id)) continue;
        seenUserIds.add(r.user_id);
        const profile = r.gw_profiles as any;
        combined.push({
          id: r.id,
          user_id: r.user_id,
          status: r.status,
          check_in_time: r.recorded_at,
          notes: r.notes,
          display_name:
            profile?.display_name ||
            [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
            "Unknown Member",
        });
      }

      combined.sort((a, b) => a.display_name.localeCompare(b.display_name));
      setAttendees(combined);
    } catch (error) {
      console.error("Error fetching event attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  // Compute stats
  const stats = {
    present: attendees.filter((a) => ["present", "checked_in"].includes(a.status?.toLowerCase())).length,
    absent: attendees.filter((a) => a.status?.toLowerCase() === "absent").length,
    excused: attendees.filter((a) => a.status?.toLowerCase() === "excused").length,
    late: attendees.filter((a) => a.status?.toLowerCase() === "late").length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Navy header */}
        <div className="bg-[#003366] text-white px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Attendance
            </DialogTitle>
          </DialogHeader>
          {event && (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-white/90">{event.title}</p>
              <div className="flex items-center gap-3 text-xs text-white/70">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(event.start_date), "MMM d, yyyy · h:mm a")}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="sm" text="Loading attendance..." />
          </div>
        ) : attendees.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">No attendance recorded</p>
            <p className="text-slate-400 text-xs mt-1">
              Use QR check-in or manual entry to record attendance
            </p>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 bg-slate-50 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs font-semibold border-0"
                style={{ color: "#16a34a", backgroundColor: "#f0fdf4" }}
              >
                {stats.present} Present
              </Badge>
              <Badge
                variant="outline"
                className="text-xs font-semibold border-0"
                style={{ color: "#dc2626", backgroundColor: "#fef2f2" }}
              >
                {stats.absent} Absent
              </Badge>
              <Badge
                variant="outline"
                className="text-xs font-semibold border-0"
                style={{ color: "#ca8a04", backgroundColor: "#fefce8" }}
              >
                {stats.excused} Excused
              </Badge>
              <Badge
                variant="outline"
                className="text-xs font-semibold border-0"
                style={{ color: "#2563eb", backgroundColor: "#eff6ff" }}
              >
                {stats.late} Late
              </Badge>
              <span className="ml-auto text-xs text-slate-400">
                {attendees.length} total
              </span>
            </div>

            {/* Attendee list */}
            <ScrollArea className="max-h-[340px]">
              <div className="divide-y divide-slate-100">
                {attendees.map((a) => {
                  const sc = getStatusConfig(a.status);
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {a.display_name}
                        </p>
                        {a.check_in_time && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {format(new Date(a.check_in_time), "h:mm a")}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-semibold border-0 flex-shrink-0"
                        style={{ color: sc.color, backgroundColor: sc.bg }}
                      >
                        {sc.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
