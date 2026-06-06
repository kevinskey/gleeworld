/**
 * CourseShell — Canvas-style unified course page.
 *
 * Every class has the same 8 tabs:
 *   Overview · Modules · Assignments · Quizzes · Discussions
 *   People   · Grades  · Attendance
 *
 * Route: /academy/c/:code  (with optional ?tab=people etc.)
 *
 * Each tab is a small self-contained component below. Where a solid
 * existing component exists (gradebook, attendance grid, modules), we
 * wrap it. Where none does, we render a clean fresh implementation.
 */
import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Home, BookOpen, FileText, ClipboardCheck, MessagesSquare,
  Users, BarChart3, CalendarCheck, Loader2, Calendar, Clock, Plus, Zap,
  ChevronRight, Megaphone, Send, AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// Lazy-load the heavier existing components so the shell stays light.
// These export named — adapt to default.
const ExistingGradebook = lazy(() =>
  import("@/components/academy/CourseGradebook").then((m) => ({ default: m.CourseGradebook }))
);
const ExistingAttendance = lazy(() =>
  import("@/components/academy/CourseAttendance").then((m) => ({ default: m.CourseAttendance }))
);

interface CourseRow {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  semester: string | null;
}

type TabKey =
  | "overview" | "modules" | "assignments" | "quizzes"
  | "discussions" | "people" | "grades" | "attendance";

const TABS: { key: TabKey; label: string; Icon: typeof Home }[] = [
  { key: "overview",    label: "Overview",    Icon: Home },
  { key: "modules",     label: "Modules",     Icon: BookOpen },
  { key: "assignments", label: "Assignments", Icon: FileText },
  { key: "quizzes",     label: "Quizzes",     Icon: ClipboardCheck },
  { key: "discussions", label: "Discussions", Icon: MessagesSquare },
  { key: "people",      label: "People",      Icon: Users },
  { key: "grades",      label: "Grades",      Icon: BarChart3 },
  { key: "attendance",  label: "Attendance",  Icon: CalendarCheck },
];

export default function CourseShell() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useUserRole();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const activeTab = (searchParams.get("tab") as TabKey) || "overview";

  const isAdmin = !!(profile?.is_super_admin || profile?.is_admin || profile?.role === "super-admin" || profile?.role === "admin");
  const isInstructor = course?.instructor_id === user?.id;
  const canEdit = isAdmin || isInstructor;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!code) return;
      setLoading(true);
      const slug = code.replace(/-/g, " ").toUpperCase();
      const { data } = await supabase
        .from("gw_courses")
        .select("id, course_code, title, description, instructor_id, instructor_name, semester")
        .or(`course_code.ilike.%${slug}%,course_code.eq.${slug}`)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setCourse((data || null) as CourseRow | null);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [code]);

  function switchTab(t: TabKey) {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", t);
    setSearchParams(sp, { replace: true });
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

  const tabProps = { course, canEdit, isInstructor, isAdmin };

  return (
    <div className="min-h-screen bg-[hsl(40,10%,96%)]">
      {/* Top bar */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate("/control-center?module=glee-academy")}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Glee Academy
          </button>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
              {course.title}
            </h1>
            <Badge className="bg-slate-700 text-slate-200 border-slate-600">{course.course_code}</Badge>
            {course.semester && (
              <span className="text-sm text-slate-300">{fmtSemester(course.semester)}</span>
            )}
          </div>
          {course.instructor_name && (
            <p className="mt-1 text-sm text-slate-400">
              Instructor: {course.instructor_name}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-6">
        {/* Left rail */}
        <nav className="lg:sticky lg:top-6 lg:self-start">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {TABS.map(({ key, label, Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2 ${
                    active
                      ? "bg-slate-50 text-slate-900 font-semibold border-l-sky-600"
                      : "text-slate-700 hover:bg-slate-50 border-l-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Quick action — Rehearsal tonight */}
          <button
            onClick={() => navigate(`/academy/${code}/rehearsal-today`)}
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 border border-amber-500/40 text-sm font-semibold transition-colors"
          >
            <Zap className="w-4 h-4" />
            Rehearsal tonight
          </button>
        </nav>

        {/* Main content */}
        <main className="min-w-0">
          {activeTab === "overview"    && <OverviewTab    {...tabProps} />}
          {activeTab === "modules"     && <ModulesTab     {...tabProps} />}
          {activeTab === "assignments" && <AssignmentsTab {...tabProps} />}
          {activeTab === "quizzes"     && <QuizzesTab     {...tabProps} />}
          {activeTab === "discussions" && <DiscussionsTab {...tabProps} />}
          {activeTab === "people"      && <PeopleTab      {...tabProps} />}
          {activeTab === "grades"      && <GradesTab      {...tabProps} />}
          {activeTab === "attendance"  && <AttendanceTab  {...tabProps} />}
        </main>
      </div>
    </div>
  );
}

// ─── tab interface ────────────────────────────────────────────────────────

interface TabProps {
  course: CourseRow;
  canEdit: boolean;
  isInstructor: boolean;
  isAdmin: boolean;
}

// ─── Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ course }: TabProps) {
  const [announcements, setAnns] = useState<any[]>([]);
  const [assignments, setAssigns] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    Promise.all([
      supabase.from("gw_course_announcements").select("id,title,content,created_at").eq("course_id", course.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("gw_course_assignments").select("id,title,due_date,points").eq("course_id", course.id).gte("due_date", new Date().toISOString()).order("due_date", { ascending: true }).limit(5),
      supabase.from("gw_course_calendar").select("id,title,start_time,location").eq("course_id", course.id).gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }).limit(5),
    ]).then(([a, as, e]) => {
      if (c) return;
      setAnns(a.data || []);
      setAssigns(as.data || []);
      setEvents(e.data || []);
      setLoading(false);
    });
    return () => { c = true; };
  }, [course.id]);

  return (
    <div className="space-y-6">
      <SectionCard title="Announcements" icon={<Megaphone className="w-4 h-4" />}>
        {loading ? <Loader /> : announcements.length === 0 ? (
          <Empty>No announcements yet.</Empty>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-semibold text-slate-900">{a.title}</div>
                  <div className="text-[10px] text-slate-500 whitespace-nowrap">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                </div>
                <p className="text-sm text-slate-700 mt-1 line-clamp-3 whitespace-pre-wrap">{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Coming due" icon={<FileText className="w-4 h-4" />}>
          {loading ? <Loader /> : assignments.length === 0 ? (
            <Empty>Nothing due in the next month.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{a.title}</div>
                    <div className="text-xs text-slate-500">
                      Due {format(new Date(a.due_date), "EEE MMM d")} · {a.points || 0} pts
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Upcoming events" icon={<Calendar className="w-4 h-4" />}>
          {loading ? <Loader /> : events.length === 0 ? (
            <Empty>No events on the calendar.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li key={e.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{e.title}</div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(e.start_time), "EEE MMM d · h:mm a")}
                      {e.location && ` · ${e.location}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Modules ──────────────────────────────────────────────────────────────

function ModulesTab({ course }: TabProps) {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    supabase
      .from("gw_course_modules")
      .select("id, module_id, title, description, week_number, learning_objectives, is_locked")
      .eq("course_id", course.id)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (!c) { setModules(data || []); setLoading(false); }
      });
    return () => { c = true; };
  }, [course.id]);

  return (
    <SectionCard title="Weekly modules" icon={<BookOpen className="w-4 h-4" />}>
      {loading ? <Loader /> : modules.length === 0 ? (
        <Empty>
          No modules yet.
          <div className="mt-3"><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1.5" />Add the first module</Button></div>
        </Empty>
      ) : (
        <div className="space-y-2">
          {modules.map((m) => (
            <div key={m.id} className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-semibold text-slate-900">
                  {m.week_number ? `Week ${m.week_number} · ` : ""}{m.title}
                </div>
                {m.is_locked && <Badge variant="outline" className="text-xs">Locked</Badge>}
              </div>
              {m.description && <p className="text-sm text-slate-600">{m.description}</p>}
              {Array.isArray(m.learning_objectives) && m.learning_objectives.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-slate-500 space-y-0.5">
                  {m.learning_objectives.slice(0, 3).map((o: string, i: number) => <li key={i}>{o}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Assignments ──────────────────────────────────────────────────────────

function AssignmentsTab({ course, canEdit }: TabProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    supabase
      .from("gw_course_assignments")
      .select("id, title, description, due_date, points, is_published")
      .eq("course_id", course.id)
      .order("due_date", { ascending: true })
      .then(({ data }) => {
        if (!c) { setItems(data || []); setLoading(false); }
      });
    return () => { c = true; };
  }, [course.id]);

  return (
    <SectionCard
      title="Assignments"
      icon={<FileText className="w-4 h-4" />}
      action={canEdit ? <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1.5" />New</Button> : null}
    >
      {loading ? <Loader /> : items.length === 0 ? (
        <Empty>No assignments yet.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => {
            const due = a.due_date ? new Date(a.due_date) : null;
            const overdue = due && due < new Date();
            return (
              <li key={a.id} className="py-3 flex items-center justify-between gap-2 hover:bg-slate-50 px-2 -mx-2 rounded">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 flex items-center gap-2">
                    {a.title}
                    {!a.is_published && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {due ? `Due ${format(due, "EEE MMM d, h:mm a")}` : "No due date"}
                    {" · "}{a.points || 0} pts
                    {overdue && <span className="text-red-600 font-semibold"> · OVERDUE</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

// ─── Quizzes ──────────────────────────────────────────────────────────────

function QuizzesTab({ course, canEdit }: TabProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    supabase
      .from("gw_course_tests")
      .select("id, title, description, total_points, duration_minutes, available_from, available_until, is_published")
      .eq("course_id", course.id)
      .order("available_from", { ascending: true })
      .then(({ data }) => {
        if (!c) { setItems(data || []); setLoading(false); }
      });
    return () => { c = true; };
  }, [course.id]);

  return (
    <SectionCard
      title="Quizzes &amp; tests"
      icon={<ClipboardCheck className="w-4 h-4" />}
      action={canEdit ? <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1.5" />New</Button> : null}
    >
      {loading ? <Loader /> : items.length === 0 ? (
        <Empty>No quizzes or tests yet.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((t) => (
            <li key={t.id} className="py-3 flex items-center justify-between gap-2 hover:bg-slate-50 px-2 -mx-2 rounded">
              <div>
                <div className="font-medium text-slate-900">{t.title}</div>
                <div className="text-xs text-slate-500">
                  {t.total_points || 0} pts · {t.duration_minutes ? `${t.duration_minutes} min` : "untimed"}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ─── Discussions ──────────────────────────────────────────────────────────

function DiscussionsTab({ course, canEdit }: TabProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    supabase
      .from("gw_course_discussions")
      .select("id, title, content, author_id, is_pinned, view_count, created_at")
      .eq("course_id", course.id)
      .is("parent_id", null)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!c) { setItems(data || []); setLoading(false); }
      });
    return () => { c = true; };
  }, [course.id]);

  return (
    <SectionCard
      title="Discussions"
      icon={<MessagesSquare className="w-4 h-4" />}
      action={<Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1.5" />New thread</Button>}
    >
      {loading ? <Loader /> : items.length === 0 ? (
        <Empty>No discussions yet. Start the first thread.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((d) => (
            <li key={d.id} className="py-3 flex items-center justify-between gap-2 hover:bg-slate-50 px-2 -mx-2 rounded">
              <div className="min-w-0">
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  {d.is_pinned && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Pinned</Badge>}
                  {d.title}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })} · {d.view_count || 0} views
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ─── People ───────────────────────────────────────────────────────────────

function PeopleTab({ course, canEdit }: TabProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    let c = false;
    async function load() {
      const { data: enrolls } = await supabase
        .from("gw_course_enrollments")
        .select("id, user_id, role, enrollment_status, created_at")
        .eq("course_id", course.id)
        .order("role", { ascending: true })
        .order("created_at", { ascending: true });
      const ids = (enrolls || []).map((e) => e.user_id);
      let pMap = new Map<string, { full_name: string | null; email: string | null; voice_part: string | null }>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("gw_profiles")
          .select("user_id, full_name, email, voice_part")
          .in("user_id", ids);
        (profs || []).forEach((p: any) =>
          pMap.set(p.user_id, { full_name: p.full_name, email: p.email, voice_part: p.voice_part })
        );
      }
      if (c) return;
      setRows(
        (enrolls || []).map((e: any) => {
          const p = pMap.get(e.user_id) || { full_name: null, email: null, voice_part: null };
          return { ...e, ...p };
        })
      );
      setLoading(false);
    }
    load();
    return () => { c = true; };
  }, [course.id]);

  async function inviteByEmail() {
    const emails = inviteEmails
      .split(/[\s,;\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
    if (!emails.length) {
      toast.error("Enter one or more valid emails.");
      return;
    }
    setInviting(true);
    let added = 0;
    const failures: string[] = [];
    for (const email of emails) {
      const { data, error } = await supabase.functions.invoke("gw-invite-student", {
        body: { email, courseId: course.id, appOrigin: window.location.origin },
      });
      if (error) {
        failures.push(`${email} — ${error.message || 'unknown error'}`);
      } else if ((data as any)?.error) {
        failures.push(`${email} — ${(data as any).error}`);
      } else {
        added++;
      }
    }
    setInviting(false);
    if (added > 0) {
      setInviteEmails("");
      setInviteOpen(false);
      toast.success(`Invited ${added}${failures.length ? ` · ${failures.length} failed` : ""}`);
    }
    if (failures.length > 0) {
      console.error('Invite failures:', failures);
      toast.error(failures[0], { description: failures.length > 1 ? `${failures.length - 1} more failed — see console.` : undefined });
    }
    // refresh
    setLoading(true);
    const { data: enrolls } = await supabase
      .from("gw_course_enrollments")
      .select("id, user_id, role, enrollment_status, created_at")
      .eq("course_id", course.id)
      .order("role", { ascending: true })
      .order("created_at", { ascending: true });
    const ids = (enrolls || []).map((e: any) => e.user_id);
    const pMap = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("gw_profiles").select("user_id, full_name, email, voice_part").in("user_id", ids);
      (profs || []).forEach((p: any) => pMap.set(p.user_id, p));
    }
    setRows((enrolls || []).map((e: any) => ({ ...e, ...(pMap.get(e.user_id) || {}) })));
    setLoading(false);
  }

  const instructors = rows.filter((r) => r.role === "instructor" || r.role === "ta");
  const students = rows.filter((r) => r.role !== "instructor" && r.role !== "ta");

  return (
    <div className="space-y-6">
      <SectionCard
        title="People"
        icon={<Users className="w-4 h-4" />}
        action={canEdit ? (
          <Button size="sm" variant="outline" onClick={() => setInviteOpen((v) => !v)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Enroll students
          </Button>
        ) : null}
      >
        {inviteOpen && (
          <div className="mb-5 border border-slate-200 rounded-lg p-4 bg-slate-50">
            <p className="text-xs text-slate-600 mb-2">
              Paste student emails — one per line or comma-separated. New emails get an account + sign-in link emailed to them automatically.
            </p>
            <Textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              rows={4}
              placeholder="alice@example.com&#10;ben@example.com"
              className="text-sm bg-white"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setInviteOpen(false)} className="text-slate-700">Cancel</Button>
              <Button size="sm" onClick={inviteByEmail} disabled={inviting} className="bg-sky-600 hover:bg-sky-500 text-white">
                {inviting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                Send invites
              </Button>
            </div>
          </div>
        )}

        {loading ? <Loader /> : rows.length === 0 ? (
          <Empty>No one is enrolled yet.</Empty>
        ) : (
          <div className="space-y-5">
            {instructors.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Instructors &amp; TAs</h4>
                <PeopleList rows={instructors} />
              </div>
            )}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Students ({students.length})</h4>
              {students.length ? <PeopleList rows={students} /> : <Empty>No students enrolled.</Empty>}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function PeopleList({ rows }: { rows: any[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => (
        <li key={r.id} className="py-2.5 flex items-center gap-3 hover:bg-slate-50 px-2 -mx-2 rounded">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(r.full_name?.[0] || r.email?.[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-slate-900 truncate">{r.full_name || r.email || "(no name)"}</div>
            <div className="text-xs text-slate-500 truncate">
              {r.email}{r.voice_part ? ` · ${r.voice_part}` : ""}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">{r.role}</Badge>
        </li>
      ))}
    </ul>
  );
}

// ─── Grades ───────────────────────────────────────────────────────────────

function GradesTab({ course, isInstructor, isAdmin }: TabProps) {
  return (
    <SectionCard title="Gradebook" icon={<BarChart3 className="w-4 h-4" />}>
      <Suspense fallback={<Loader />}>
        <ExistingGradebook courseId={course.id} isEnrolled={true} />
      </Suspense>
    </SectionCard>
  );
}

// ─── Attendance ───────────────────────────────────────────────────────────

function AttendanceTab({ course, canEdit }: TabProps) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-amber-50 border-amber-200 flex items-center justify-between gap-3">
        <div className="text-sm text-amber-900">
          <strong>Taking attendance right now?</strong> Use the one-screen Rehearsal Tonight view.
        </div>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-500 text-white"
          onClick={() => navigate(`/academy/${course.course_code.toLowerCase().replace(/\s+/g, "-")}/rehearsal-today`)}
        >
          <Zap className="w-4 h-4 mr-1.5" />
          Rehearsal tonight
        </Button>
      </Card>

      <SectionCard title="Attendance history" icon={<CalendarCheck className="w-4 h-4" />}>
        <Suspense fallback={<Loader />}>
          <ExistingAttendance courseId={course.id} isEnrolled={true} isAdmin={canEdit} />
        </Suspense>
      </SectionCard>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────

function SectionCard({
  title, icon, action, children,
}: {
  title: React.ReactNode;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-700">
          {icon}
          <h2 className="font-bold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Loader() {
  return (
    <div className="py-8 flex justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-200 rounded-lg">
      {children}
    </div>
  );
}

function fmtSemester(s: string | null): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
