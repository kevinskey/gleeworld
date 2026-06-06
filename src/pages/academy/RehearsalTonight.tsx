/**
 * Rehearsal Tonight — Scene 1 of the integrated LMS spine.
 *
 * One screen, one moment in a director's life. Pulls together:
 *   - Today's calendar event (or the next upcoming rehearsal)
 *   - Roster from gw_course_enrollments
 *   - Live attendance grid → gw_course_attendance
 *   - Setlist / repertoire for tonight
 *   - Post-rehearsal announcement composer → gw_course_announcements
 *   - Post-rehearsal journal/notes
 *
 * The whole thing is scoped to ONE course at /academy/:courseCode/rehearsal-today.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Megaphone, BookOpen,
  Music, Check, X, AlertCircle, Loader2, Send,
} from "lucide-react";
import { format } from "date-fns";

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
}

interface Enrollment {
  id: string;
  user_id: string;
  role: string;
  enrollment_status: string;
  // joined profile
  full_name: string | null;
  email: string | null;
  voice_part: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  event_type: string | null;
}

type Status = "present" | "absent" | "excused" | "late";
const STATUS_COLORS: Record<Status, string> = {
  present: "#10b981",
  absent:  "#ef4444",
  late:    "#f59e0b",
  excused: "#0ea5e9",
};
const STATUS_LABELS: Record<Status, string> = {
  present: "Present",
  absent:  "Absent",
  late:    "Late",
  excused: "Excused",
};

export default function RehearsalTonight() {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Status>>({});
  const [setlist, setSetlist] = useState<string>("");
  const [announcement, setAnnouncement] = useState<string>("");
  const [journal, setJournal] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState<Record<string, boolean>>({});
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseCode) return;
      setLoading(true);

      const slug = courseCode.replace(/-/g, " ").toUpperCase();
      const slugAlt = courseCode.toUpperCase();
      const { data: courses } = await supabase
        .from("gw_courses")
        .select("id, course_code, title")
        .or(`course_code.ilike.%${slug}%,course_code.ilike.%${slugAlt}%`)
        .eq("is_active", true)
        .limit(1);
      const c = courses?.[0] as CourseRow | undefined;
      if (cancelled) return;
      if (!c) {
        setLoading(false);
        return;
      }
      setCourse(c);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 14);

      const { data: events } = await supabase
        .from("gw_course_calendar")
        .select("id, title, description, start_time, end_time, location, event_type")
        .eq("course_id", c.id)
        .gte("start_time", startOfToday.toISOString())
        .lte("start_time", horizon.toISOString())
        .order("start_time", { ascending: true })
        .limit(1);
      const evt = events?.[0] as CalendarEvent | undefined;

      let { data: enrolls } = await supabase
        .from("gw_course_enrollments")
        .select("id, user_id, role, enrollment_status")
        .eq("course_id", c.id)
        .eq("enrollment_status", "enrolled")
        .order("created_at", { ascending: true });

      enrolls = enrolls || [];
      const ids = enrolls.map((e) => e.user_id);

      let profileByUserId = new Map<string, { full_name: string | null; email: string | null; voice_part: string | null }>();
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("gw_profiles")
          .select("user_id, full_name, email, voice_part")
          .in("user_id", ids);
        (profiles || []).forEach((p: any) => {
          profileByUserId.set(p.user_id, {
            full_name: p.full_name,
            email: p.email,
            voice_part: p.voice_part,
          });
        });
      }

      const rosterRows: Enrollment[] = enrolls.map((e: any) => {
        const p = profileByUserId.get(e.user_id) || { full_name: null, email: null, voice_part: null };
        return {
          id: e.id,
          user_id: e.user_id,
          role: e.role,
          enrollment_status: e.enrollment_status,
          full_name: p.full_name,
          email: p.email,
          voice_part: p.voice_part,
        };
      }).filter((e) => e.role !== "instructor" && e.role !== "ta");

      // Existing attendance for today
      const { data: att } = await supabase
        .from("gw_course_attendance")
        .select("student_id, status")
        .eq("course_id", c.id)
        .eq("attendance_date", today);
      const attMap: Record<string, Status> = {};
      (att || []).forEach((a: any) => { attMap[a.student_id] = a.status as Status; });

      if (cancelled) return;
      setEvent(evt || null);
      setEnrollments(rosterRows);
      setAttendance(attMap);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [courseCode, today]);

  async function setStatus(studentId: string, status: Status) {
    if (!course || !user) return;
    setSavingAttendance((s) => ({ ...s, [studentId]: true }));
    const prev = attendance[studentId];
    setAttendance((a) => ({ ...a, [studentId]: status })); // optimistic

    const { error } = await supabase
      .from("gw_course_attendance")
      .upsert(
        {
          course_id: course.id,
          student_id: studentId,
          attendance_date: today,
          status,
          recorded_by: user.id,
        },
        { onConflict: "course_id,student_id,attendance_date" }
      );

    setSavingAttendance((s) => { const n = { ...s }; delete n[studentId]; return n; });
    if (error) {
      setAttendance((a) => ({ ...a, [studentId]: prev as Status }));
      toast.error(`Couldn't save: ${error.message}`);
    }
  }

  async function postAnnouncement() {
    if (!course || !user) return;
    const text = announcement.trim();
    if (!text) return;
    setPostingAnnouncement(true);
    const { error } = await supabase
      .from("gw_course_announcements")
      .insert({
        course_id: course.id,
        title: event ? `${event.title} — ${format(new Date(), "MMM d")}` : `Rehearsal note — ${format(new Date(), "MMM d")}`,
        content: text,
        created_by: user.id,
        is_pinned: false,
        send_email: false,
      });
    setPostingAnnouncement(false);
    if (error) {
      toast.error(`Couldn't post: ${error.message}`);
      return;
    }
    setAnnouncement("");
    toast.success("Posted to the class");
  }

  async function saveJournal() {
    if (!course || !user) return;
    const text = journal.trim();
    if (!text) return;
    setSavingJournal(true);
    const { error } = await supabase
      .from("gw_course_announcements")
      .insert({
        course_id: course.id,
        title: `Rehearsal journal — ${format(new Date(), "EEEE MMM d")}`,
        content: text,
        created_by: user.id,
        is_pinned: false,
        send_email: false,
      } as any);
    setSavingJournal(false);
    if (error) {
      toast.error(`Couldn't save: ${error.message}`);
      return;
    }
    setJournal("");
    toast.success("Journal entry saved");
  }

  function markAllPresent() {
    if (!course || !user) return;
    enrollments.forEach((e) => {
      if (!attendance[e.user_id]) setStatus(e.user_id, "present");
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,10%,96%)]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,10%,96%)]">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Class not found.</p>
          <Button onClick={() => navigate("/control-center?module=glee-academy")}>Back to Glee Academy</Button>
        </div>
      </div>
    );
  }

  const present = enrollments.filter((e) => attendance[e.user_id] === "present").length;
  const total = enrollments.length;
  const pct = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[hsl(40,10%,96%)] pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
              Rehearsal Tonight
            </h1>
            <Badge className="bg-slate-700 text-slate-200 border-slate-600">{course.course_code}</Badge>
            <span className="text-sm text-slate-300">{course.title}</span>
          </div>
          {event ? (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{format(new Date(event.start_time), "EEEE, MMM d")}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{format(new Date(event.start_time), "h:mm a")}{event.end_time ? ` – ${format(new Date(event.end_time), "h:mm a")}` : ""}</span>
              {event.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              No upcoming event on the calendar. You can still take attendance, post notes, and journal — they'll be tagged with today's date.
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">

        {/* MAIN — attendance grid */}
        <Card className="bg-white">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-slate-700" />
                  <h2 className="text-xl font-bold">Attendance</h2>
                </div>
                <p className="text-sm text-slate-500">
                  {present} of {total} marked present ({pct}%)
                </p>
              </div>
              <Button
                size="sm"
                onClick={markAllPresent}
                disabled={total === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Mark all present
              </Button>
            </div>

            {total === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-300 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No students enrolled yet.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {enrollments.map((e) => {
                  const status = attendance[e.user_id];
                  const saving = savingAttendance[e.user_id];
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        {(e.full_name?.[0] || e.email?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate text-sm sm:text-base">
                          {e.full_name || e.email || "(no name)"}
                        </div>
                        {e.voice_part && (
                          <div className="text-[10px] sm:text-xs text-slate-500">{e.voice_part}</div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {(["present", "late", "excused", "absent"] as Status[]).map((s) => {
                          const active = status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setStatus(e.user_id, s)}
                              disabled={saving}
                              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all ${
                                active
                                  ? "text-white shadow-sm"
                                  : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                              }`}
                              style={active ? { backgroundColor: STATUS_COLORS[s] } : undefined}
                              title={STATUS_LABELS[s]}
                            >
                              {s === "present" && <Check className="w-3 h-3 sm:hidden inline" />}
                              {s === "late" && <Clock className="w-3 h-3 sm:hidden inline" />}
                              {s === "excused" && <AlertCircle className="w-3 h-3 sm:hidden inline" />}
                              {s === "absent" && <X className="w-3 h-3 sm:hidden inline" />}
                              <span className="hidden sm:inline">{STATUS_LABELS[s]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* SIDEBAR — setlist, announcement, journal */}
        <div className="space-y-6">
          {/* Setlist */}
          <Card className="bg-white">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-5 h-5 text-slate-700" />
                <h2 className="text-base font-bold">Tonight's repertoire</h2>
              </div>
              <Textarea
                value={setlist}
                onChange={(e) => setSetlist(e.target.value)}
                placeholder={"e.g.\n1. Lift Every Voice and Sing\n2. Ave Verum Corpus\n3. Total Praise"}
                rows={6}
                className="text-sm font-mono resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-2">
                Local only — link to the Music Library for full search.
              </p>
            </div>
          </Card>

          {/* Announcement */}
          <Card className="bg-white">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="w-5 h-5 text-slate-700" />
                <h2 className="text-base font-bold">Quick announcement</h2>
              </div>
              <Textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Something to tell the whole class right now…"
                rows={3}
                className="text-sm resize-none"
              />
              <Button
                onClick={postAnnouncement}
                disabled={!announcement.trim() || postingAnnouncement}
                className="w-full mt-3"
                size="sm"
              >
                {postingAnnouncement ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                Post to class
              </Button>
            </div>
          </Card>

          {/* Post-rehearsal journal */}
          <Card className="bg-white">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-slate-700" />
                <h2 className="text-base font-bold">Post-rehearsal notes</h2>
              </div>
              <Textarea
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder="What worked, what didn't, what to fix Thursday…"
                rows={5}
                className="text-sm resize-none"
              />
              <Button
                onClick={saveJournal}
                disabled={!journal.trim() || savingJournal}
                className="w-full mt-3"
                size="sm"
                variant="outline"
              >
                {savingJournal ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <BookOpen className="w-4 h-4 mr-1.5" />}
                Save journal
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
