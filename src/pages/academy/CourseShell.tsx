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
import React, { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery as useQueryReactQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffectivePreviewRole } from "@/hooks/useEffectivePreviewRole";
import { StudentAssignmentDialog } from "@/components/academy/StudentAssignmentDialog";
import { InstructorSubmissionsDialog } from "@/components/academy/InstructorSubmissionsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Home, BookOpen, FileText, ClipboardCheck, MessagesSquare,
  Users, BarChart3, CalendarCheck, Loader2, Calendar, Clock, Plus, Zap,
  ChevronRight, ChevronDown, ChevronUp, Megaphone, Send, AlertCircle, Settings,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ModuleResources } from "@/components/academy/ModuleResources";
import { useEnabledAddonTabs, type AddonSlug } from "@/hooks/useCourseAddons";
import { StudentDetailDialog } from "@/components/academy/StudentDetailDialog";
import { CourseCohortsPanel } from "@/components/academy/CourseCohortsPanel";
import { SimpleMarkdown } from "@/components/markdown/SimpleMarkdown";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { publishCourse } from "@/lib/academy/publishCourse";
const PollsAddon = lazy(() => import("@/components/academy/addons/PollsAddon"));
const QRAttendanceAddon = lazy(() => import("@/components/academy/addons/QRAttendanceAddon"));
const TourAddon = lazy(() => import("@/components/academy/addons/TourAddon"));
const WardrobeAddon = lazy(() => import("@/components/academy/addons/WardrobeAddon"));
const AiGradingAddon = lazy(() => import("@/components/academy/addons/AiGradingAddon"));
// Workspace modules embedded inside their corresponding course add-on so
// the in-course view has the same feature depth as the workspace module.
const WardrobeHubEmbed = lazy(() =>
  import("@/components/wardrobe/WardrobeManagementHub").then(m => ({ default: m.WardrobeManagementHub }))
);
const TourDashboardEmbed = lazy(() =>
  import("@/components/tour-manager/TourManagerDashboard").then(m => ({ default: m.TourManagerDashboard }))
);
const AIHubEmbed = lazy(() =>
  import("@/components/modules/AIHub").then(m => ({ default: (m as any).AIHub ?? (m as any).default }))
);
const AuditionsEmbed = lazy(() =>
  import("@/components/modules/AuditionsModule").then(m => ({ default: (m as any).AuditionsModule ?? (m as any).default }))
);
const BucketsOfLoveEmbed = lazy(() =>
  import("@/components/modules/BucketsOfLoveModule").then(m => ({ default: (m as any).BucketsOfLoveModule ?? (m as any).default }))
);
import {
  Plane, Shirt, Ticket, Heart, Brain, Sparkles, LibraryBig,
  Award as AwardIcon, Newspaper, Music as MusicIcon,
  Mic as MicIcon,
} from "lucide-react";
const CoursePracticeTab = lazy(() => import("@/components/academy/CoursePracticeTab"));

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
  status: string | null;
  pending_enrollments: Array<{ user_id?: string; name: string }> | null;
}

type TabKey =
  | "overview" | "modules" | "assignments" | "quizzes"
  | "discussions" | "people" | "grades" | "attendance"
  | "practice"
  | `addon:${string}`;

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

// Courses where the Practice tab should appear. Includes both the seeded
// "GLEE 000" sight-singing institute and the auto-provisioned Student
// Practice course (course_code = STUDENT-PRACTICE).
function isPracticeCourse(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = code.replace(/\s+/g, '').toUpperCase();
  return normalized === 'STUDENT-PRACTICE' || normalized === 'GLEE000';
}

export default function CourseShell() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useUserRole();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const activeTab = (searchParams.get("tab") as TabKey) || "overview";

  const isAdmin = !!(profile?.is_super_admin || profile?.is_admin || profile?.role === "super-admin" || profile?.role === "admin");
  const isInstructor = course?.instructor_id === user?.id;
  // Preview-as-role gate: when a super-admin opens "Preview as Students"
  // (Workspace Settings → Navigation), collapse canEdit so the assignment
  // list opens the student submission dialog instead of the instructor
  // editor. Preview is sessionStorage-only, so refreshing or opening a
  // new tab restores full instructor capability.
  const previewRole = useEffectivePreviewRole();
  const previewingAsStudent = previewRole && previewRole !== 'admin' && previewRole !== 'super_admin';
  const canEdit = (isAdmin || isInstructor) && !previewingAsStudent;

  // Guards against a late-resolving fetch from a previous `code` clobbering
  // fresher state: this route (/academy/c/:code) has no key prop, so React
  // reuses the CourseShell instance across code changes rather than remounting.
  // A monotonic request id covers both the effect and the Publish-button paths.
  const loadReqId = useRef(0);
  const loadCourse = useCallback(async () => {
    if (!code) return;
    const reqId = ++loadReqId.current;
    setLoading(true);
    // Two encoding conventions exist in the wild:
    //   legacy: "MUS 101" stored, URL is "mus-101" (hyphen→space)
    //   templates / new: "TPL-CHOIR101" stored, URL is "tpl-choir101" (hyphen kept)
    // Try both — exact match on the as-is uppercase first, then the
    // hyphen-as-space variant. Don't use .or() with raw user input
    // because spaces break PostgREST's filter parser.
    const asIs = code.toUpperCase();
    const spaced = code.replace(/-/g, " ").toUpperCase();
    const select =
      "id, course_code, title, description, instructor_id, instructor_name, semester, status, pending_enrollments";
    const tryFetch = async (codeValue: string) => {
      const { data, error } = await supabase
        .from("gw_courses")
        .select(select)
        .eq("course_code", codeValue)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    };
    let row = await tryFetch(asIs);
    if (!row && spaced !== asIs) row = await tryFetch(spaced);
    if (loadReqId.current !== reqId) return; // a newer load superseded this one
    setCourse((row || null) as CourseRow | null);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  function switchTab(t: TabKey) {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", t);
    setSearchParams(sp, { replace: true });
  }

  // Hooks must run in the same order on every render — call useEnabledAddonTabs
  // BEFORE any early returns. Pass undefined while course is still loading;
  // the hook handles that (enabled=false).
  const addonTabs = useEnabledAddonTabs(course?.id);

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
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
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

      {course.status === 'draft' && canEdit && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-950/30">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Draft — review and publish. Students can’t see this course yet.
            </p>
            <Button
              size="sm"
              disabled={publishing}
              onClick={async () => {
                setPublishing(true);
                try {
                  const r = await publishCourse(supabase, {
                    id: course.id,
                    pending_enrollments: course.pending_enrollments ?? null,
                  });
                  if (r.ok) {
                    toast.success(r.message);
                    await loadCourse();
                  } else {
                    toast.error(r.message);
                  }
                } finally {
                  setPublishing(false);
                }
              }}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-6">
        {/* Left rail */}
        <nav className="lg:sticky lg:top-6 lg:self-start">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Conditionally injected Practice tab — legacy Student Practice
                courses (by course code). Courses that enable the
                'student-practice' add-on get the tab via addonTabs below
                instead, so skip the hardcoded one to avoid a duplicate. */}
            {[
              ...TABS,
              ...(isPracticeCourse(course.course_code) &&
              !addonTabs.some((t) => t.slug === 'student-practice')
                ? [{ key: "practice" as TabKey, label: "Practice", Icon: MicIcon }]
                : []),
            ].map(({ key, label, Icon }) => {
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
            {/* Dynamic add-on tabs (per the course's gw_course_addons) */}
            {addonTabs.length > 0 && <div className="border-t border-slate-200" />}
            {addonTabs.map(({ slug, label, Icon }) => {
              const key = `addon:${slug}` as TabKey;
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
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-card hover:bg-accent hover:text-accent-foreground text-foreground border border-border text-sm font-semibold transition-colors"
          >
            <Zap className="w-4 h-4" />
            Rehearsal tonight
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => navigate(`/academy/c/${code}/addons`)}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Manage add-ons
              </button>
              <button
                onClick={() => navigate(`/academy/c/${code}/settings`)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Course settings
              </button>
            </>
          )}
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
          {activeTab === "practice"    && (
            <Suspense fallback={<div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-slate-400" /></div>}>
              <CoursePracticeTab courseId={course.id} canEdit={canEdit} />
            </Suspense>
          )}
          {typeof activeTab === "string" && activeTab.startsWith("addon:") && (
            <Suspense fallback={<div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-slate-400" /></div>}>
              <AddonDispatch slug={activeTab.slice(6) as AddonSlug} courseId={course.id} canEdit={canEdit} />
            </Suspense>
          )}
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

function OverviewTab({ course, canEdit }: TabProps) {
  const [announcements, setAnns] = useState<any[]>([]);
  const [assignments, setAssigns] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  function reloadAnnouncements() {
    supabase
      .from("gw_course_announcements")
      .select("id,title,content,created_at,cohort_id,gw_course_cohorts(name,color)")
      .eq("course_id", course.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setAnns(data || []));
  }

  useEffect(() => {
    let c = false;
    Promise.all([
      supabase.from("gw_course_announcements").select("id,title,content,created_at,cohort_id,gw_course_cohorts(name,color)").eq("course_id", course.id).order("created_at", { ascending: false }).limit(10),
      // Pivoted to gw_assignments to stay in sync with what AssignmentsTab
      // writes (and what the calendar-sync trigger reads).
      supabase.from("gw_assignments").select("id,title,due_at,points").eq("course_id", course.id).eq("is_active", true).gte("due_at", new Date().toISOString()).order("due_at", { ascending: true }).limit(5),
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
      <SectionCard
        title="Announcements"
        icon={<Megaphone className="w-4 h-4" />}
        action={canEdit ? (
          <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New announcement
          </Button>
        ) : null}
      >
        {loading ? <Loader /> : announcements.length === 0 ? (
          <Empty>No announcements yet.</Empty>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    {a.title}
                    {a.cohort_id && a.gw_course_cohorts && (
                      <Badge variant="outline" className="text-xs" style={{ borderColor: a.gw_course_cohorts.color, color: a.gw_course_cohorts.color }}>
                        {a.gw_course_cohorts.name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                </div>
                <div className="text-sm text-slate-700 mt-1">
                  <SimpleMarkdown source={a.content || ''} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <AnnouncementComposeDialog
        open={composeOpen}
        courseId={course.id}
        onClose={() => setComposeOpen(false)}
        onPosted={() => { reloadAnnouncements(); setComposeOpen(false); }}
      />

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
                      Due {format(new Date(a.due_at || a.due_date), "EEE MMM d")} · {a.points || 0} pts
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

function ModulesTab({ course, canEdit }: TabProps) {
  const { user } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newWeek, setNewWeek] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function reload() {
    supabase
      .from("gw_course_modules")
      .select("id, module_id, title, description, week_number, learning_objectives, is_locked, display_order, prerequisite_module_id")
      .eq("course_id", course.id)
      .order("display_order", { ascending: true })
      .then(({ data }) => setModules(data || []));
  }

  function reloadCompletions() {
    if (!user?.id) return;
    supabase
      .from("gw_course_module_completions")
      .select("module_id")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .then(({ data }) => setCompletedIds(new Set((data || []).map((r: any) => r.module_id))));
  }

  useEffect(() => {
    let c = false;
    Promise.all([
      supabase
        .from("gw_course_modules")
        .select("id, module_id, title, description, week_number, learning_objectives, is_locked, display_order, prerequisite_module_id")
        .eq("course_id", course.id)
        .order("display_order", { ascending: true }),
      user?.id
        ? supabase
            .from("gw_course_module_completions")
            .select("module_id")
            .eq("course_id", course.id)
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] } as any),
    ]).then(([modulesResult, completionsResult]: any[]) => {
      if (c) return;
      setModules(modulesResult.data || []);
      setCompletedIds(new Set((completionsResult.data || []).map((r: any) => r.module_id)));
      setLoading(false);
    });
    return () => { c = true; };
  }, [course.id, user?.id]);

  async function submit() {
    if (!newTitle.trim()) return;
    setSaving(true);
    // module_id is a required text "code" — auto-generate a tenant-safe slug.
    const slug = `mod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const week = newWeek ? Number(newWeek) : null;
    const { data, error } = await supabase
      .from("gw_course_modules")
      .insert({
        course_id: course.id,
        module_id: slug,
        title: newTitle.trim(),
        week_number: Number.isFinite(week as number) ? week : null,
        is_active: true,
        is_locked: false,
        display_order: modules.length,
      })
      .select("id, module_id, title, description, week_number, learning_objectives, is_locked")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(`Couldn't add module: ${error?.message || "unknown error"}`);
      return;
    }
    setModules((prev) => [...prev, data]);
    setNewTitle("");
    setNewWeek("");
    setAddOpen(false);
    toast.success(`Added "${data.title}"`);
  }

  return (
    <SectionCard
      title="Weekly modules"
      icon={<BookOpen className="w-4 h-4" />}
      action={canEdit ? (
        <Button size="sm" variant="outline" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />{addOpen ? "Cancel" : "New module"}
        </Button>
      ) : null}
    >
      {canEdit && addOpen && (
        <div className="border border-border rounded-lg p-3 mb-3 space-y-2 bg-muted/40">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Input
              placeholder="Module title — e.g. Week 1: Introduction"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              type="number"
              placeholder="Week #"
              value={newWeek}
              onChange={(e) => setNewWeek(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setAddOpen(false); setNewTitle(""); setNewWeek(""); }}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={saving || !newTitle.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Add module
            </Button>
          </div>
        </div>
      )}
      {loading ? <Loader /> : modules.length === 0 ? (
        <Empty>
          No modules yet.
          {canEdit && !addOpen && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />Add the first module
              </Button>
            </div>
          )}
        </Empty>
      ) : (
        <div className="space-y-2">
          {modules.map((m, i) => (
            <ModuleCard
              key={m.id}
              module={m}
              courseId={course.id}
              canEdit={!!canEdit}
              allModules={modules}
              isFirst={i === 0}
              isLast={i === modules.length - 1}
              onChanged={reload}
              completedIds={completedIds}
              onCompletionChanged={reloadCompletions}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ModuleCard({
  module: m, courseId, canEdit, allModules, isFirst, isLast, onChanged,
  completedIds, onCompletionChanged,
}: {
  module: any;
  courseId: string;
  canEdit: boolean;
  allModules: any[];
  isFirst: boolean;
  isLast: boolean;
  onChanged: () => void;
  completedIds: Set<string>;
  onCompletionChanged: () => void;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  // Gating rules:
  //   • Instructors always see content (can preview locked modules)
  //   • Student is gated if:
  //       a) is_locked is set on this module, OR
  //       b) module has a prereq AND that prereq isn't in completedIds
  const isCompleted = completedIds.has(m.id);
  const prereqMet = !m.prerequisite_module_id || completedIds.has(m.prerequisite_module_id);
  const gated = !canEdit && (!!m.is_locked || !prereqMet);

  const prereq = allModules.find((x) => x.id === m.prerequisite_module_id);

  // Swap display_order with the neighbor (up = previous, down = next).
  async function move(direction: 'up' | 'down') {
    const idx = allModules.findIndex((x) => x.id === m.id);
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    const neighbor = allModules[neighborIdx];
    if (!neighbor) return;
    const myOrder = m.display_order ?? idx;
    const theirOrder = neighbor.display_order ?? neighborIdx;
    await supabase.from('gw_course_modules').update({ display_order: theirOrder }).eq('id', m.id);
    await supabase.from('gw_course_modules').update({ display_order: myOrder }).eq('id', neighbor.id);
    onChanged();
  }

  async function setPrereq(prereqId: string | null) {
    await supabase.from('gw_course_modules').update({ prerequisite_module_id: prereqId }).eq('id', m.id);
    onChanged();
  }

  async function toggleLock() {
    await supabase.from('gw_course_modules').update({ is_locked: !m.is_locked }).eq('id', m.id);
    onChanged();
  }

  async function remove() {
    const { error } = await supabase.from('gw_course_modules').delete().eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  }

  async function markComplete() {
    if (!user?.id) return;
    const { error } = await supabase.from('gw_course_module_completions').insert({
      course_id: courseId,
      module_id: m.id,
      user_id: user.id,
    });
    if (error && !error.message.toLowerCase().includes('duplicate')) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked "${m.title}" complete.`);
    onCompletionChanged();
  }
  async function markIncomplete() {
    if (!user?.id) return;
    const { error } = await supabase
      .from('gw_course_module_completions')
      .delete()
      .eq('module_id', m.id)
      .eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    onCompletionChanged();
  }

  return (
    <div className="border border-border rounded-lg bg-card transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-2 p-4">
        {canEdit && (
          <div className="flex flex-col gap-0.5 -mt-1">
            <button
              disabled={isFirst}
              onClick={() => move('up')}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={isLast}
              onClick={() => move('down')}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => !gated && setExpanded((v) => !v)}
          className={`flex-1 min-w-0 text-left ${gated ? 'cursor-not-allowed opacity-70' : ''}`}
          aria-disabled={gated}
          title={gated ? 'This module is locked. Your instructor will release it when ready.' : undefined}
        >
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <div className="font-semibold text-card-foreground">
              {m.week_number ? `Week ${m.week_number} · ` : ""}{m.title}
            </div>
            {isCompleted && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">✓ Completed</Badge>}
            {m.is_locked && <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">🔒 Locked</Badge>}
            {prereq && !prereqMet && <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">Complete "{prereq.title}" first</Badge>}
            {prereq && prereqMet && <Badge variant="outline" className="text-xs text-muted-foreground">After: {prereq.title}</Badge>}
          </div>
          {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
          {Array.isArray(m.learning_objectives) && m.learning_objectives.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
              {m.learning_objectives.slice(0, 3).map((o: string, i: number) => <li key={i}>{o}</li>)}
            </ul>
          )}
        </button>
        <ChevronDown
          className={`w-4 h-4 mt-1 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>
      {expanded && !gated && (
        <div className="border-t border-border p-4 bg-background/40 space-y-3">
          {!canEdit && (
            <div className="flex items-center justify-end pb-3 border-b">
              {isCompleted ? (
                <Button size="sm" variant="ghost" onClick={markIncomplete}>
                  ✓ Completed — undo
                </Button>
              ) : (
                <Button size="sm" onClick={markComplete}>
                  Mark complete
                </Button>
              )}
            </div>
          )}
          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap pb-3 border-b">
              <label className="text-xs font-medium">Prereq:</label>
              <select
                value={m.prerequisite_module_id || ''}
                onChange={(e) => setPrereq(e.target.value || null)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">— none —</option>
                {allModules.filter((x) => x.id !== m.id).map((x) => (
                  <option key={x.id} value={x.id}>{x.title}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={toggleLock}>
                {m.is_locked ? 'Unlock' : 'Lock'}
              </Button>
              <div className="flex-1" />
              <ConfirmDeleteButton
                confirmKey="delete-course-module"
                title={`Delete "${m.title}"?`}
                description="The module and its ordering will be removed."
                onConfirm={remove}
                ariaLabel="Delete module"
                className="inline-flex items-center justify-center rounded-md h-8 px-3 text-sm text-rose-600 hover:text-rose-700 hover:bg-muted"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </ConfirmDeleteButton>
            </div>
          )}
          <ModuleResources moduleId={m.id} courseId={courseId} canEdit={canEdit} />
        </div>
      )}
    </div>
  );
}

// ─── Assignments ──────────────────────────────────────────────────────────

function AssignmentsTab({ course, canEdit }: TabProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPoints, setNewPoints] = useState("100");
  const [newDue, setNewDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  // Student view: dialog + per-assignment submission state so each row
  // can show a "Submitted" / "Graded 85/100" badge and open a submission
  // view instead of the instructor edit form.
  const [studentViewing, setStudentViewing] = useState<any | null>(null);
  const [subsByAssignment, setSubsByAssignment] = useState<Record<string, { status: string; score_value: number | null; submitted_at: string | null }>>({});

  // Pivoted from gw_course_assignments → gw_assignments so the
  // calendar-sync trigger (gw_assignment_sync_event) fires and new
  // assignments land on the main calendar automatically. Field names:
  //   due_date     → due_at
  //   is_published → is_active (false = draft)
  function reload() {
    supabase
      .from("gw_assignments")
      .select("id, title, description, due_at, points, is_active")
      .eq("course_id", course.id)
      .order("due_at", { ascending: true })
      .then(({ data }) => setItems((data || []).map((r: any) => ({
        ...r, due_date: r.due_at, is_published: r.is_active,
      }))));
  }

  useEffect(() => {
    let c = false;
    supabase
      .from("gw_assignments")
      .select("id, title, description, due_at, points, is_active")
      .eq("course_id", course.id)
      .order("due_at", { ascending: true })
      .then(async ({ data }) => {
        if (c) return;
        const rows = (data || []).map((r: any) => ({
          ...r, due_date: r.due_at, is_published: r.is_active,
        }));
        setItems(rows);
        setLoading(false);

        // Load the current user's submissions for these assignments so
        // rows can show status badges without opening the dialog first.
        if (user && rows.length > 0) {
          const ids = rows.map((r: any) => r.id);
          const { data: subs } = await supabase
            .from("gw_assignment_submissions" as any)
            .select("assignment_id, status, score_value, submitted_at")
            .eq("user_id", user.id)
            .in("assignment_id", ids);
          if (c) return;
          const map: Record<string, { status: string; score_value: number | null; submitted_at: string | null }> = {};
          for (const s of (subs as any[] | null) ?? []) {
            map[s.assignment_id] = { status: s.status, score_value: s.score_value, submitted_at: s.submitted_at };
          }
          setSubsByAssignment(map);
        }
      });
    return () => { c = true; };
  }, [course.id, user]);

  // Callback so the dialog can bump the row badge without a full reload.
  async function refreshMySubmission(assignmentId: string) {
    if (!user) return;
    const { data } = await supabase
      .from("gw_assignment_submissions" as any)
      .select("assignment_id, status, score_value, submitted_at")
      .eq("user_id", user.id)
      .eq("assignment_id", assignmentId)
      .maybeSingle();
    if (data) {
      const s = data as any;
      setSubsByAssignment((prev) => ({
        ...prev,
        [assignmentId]: { status: s.status, score_value: s.score_value, submitted_at: s.submitted_at },
      }));
    }
  }

  async function submit() {
    if (!newTitle.trim()) return;
    setSaving(true);
    // Publish by default. The old behaviour (is_active: false) surprised
    // teachers who then couldn't understand why the assignment did not
    // reach students. If a teacher wants a draft, they can toggle
    // Published off from the row's edit dialog before students see it.
    const { data, error } = await supabase
      .from("gw_assignments")
      .insert({
        course_id: course.id,
        title: newTitle.trim(),
        points: Number(newPoints) || 0,
        due_at: newDue ? new Date(newDue).toISOString() : null,
        is_active: true,
        assignment_type: 'standard',
        category: 'general',
        created_by: user?.id,
      })
      .select("id, title, description, due_at, points, is_active")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(`Couldn't add assignment: ${error?.message || "unknown error"}`);
      return;
    }
    const ui = { ...data, due_date: data.due_at, is_published: data.is_active };
    setItems((prev) => [...prev, ui].sort((a, b) => (a.due_date || "z").localeCompare(b.due_date || "z")));
    setNewTitle(""); setNewPoints("100"); setNewDue("");
    setAddOpen(false);
    toast.success(`Published "${data.title}" — visible to students`);
  }

  return (
    <SectionCard
      title="Assignments"
      icon={<FileText className="w-4 h-4" />}
      action={canEdit ? (
        <Button size="sm" variant="outline" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />{addOpen ? "Cancel" : "New"}
        </Button>
      ) : null}
    >
      {canEdit && addOpen && (
        <div className="border border-border rounded-lg p-3 mb-3 space-y-2 bg-muted/40">
          <Input
            placeholder="Assignment title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Points"
              value={newPoints}
              onChange={(e) => setNewPoints(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              type="datetime-local"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={saving || !newTitle.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Add assignment
            </Button>
          </div>
        </div>
      )}
      {loading ? <Loader /> : items.length === 0 ? (
        <Empty>No assignments yet.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => {
            const due = a.due_date ? new Date(a.due_date) : null;
            const overdue = due && due < new Date();
            const mySub = subsByAssignment[a.id];
            const isGraded = mySub?.status === 'graded' || mySub?.status === 'ai_graded';
            const isSubmitted = mySub?.status === 'submitted' || mySub?.status === 'revision_submitted' || isGraded;
            const rowClickable = canEdit || (a.is_published && !!user);
            return (
              <li
                key={a.id}
                className={`py-3 flex items-center justify-between gap-2 hover:bg-slate-50 px-2 -mx-2 rounded ${rowClickable ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (canEdit) setEditing(a);
                  else if (a.is_published) setStudentViewing(a);
                }}
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                    {a.title}
                    {!a.is_published && <Badge variant="outline" className="text-xs">Draft</Badge>}
                    {/* Student submission-state pills — instructors ignore these. */}
                    {!canEdit && isGraded && mySub?.score_value != null && (
                      <Badge className="text-xs bg-green-600 hover:bg-green-600">
                        Graded {mySub.score_value}/{a.points ?? '?'}
                      </Badge>
                    )}
                    {!canEdit && isSubmitted && !isGraded && (
                      <Badge className="text-xs bg-blue-600 hover:bg-blue-600">Submitted</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {due ? `Due ${format(due, "EEE MMM d, h:mm a")}` : "No due date"}
                    {" · "}{a.points || 0} pts
                    {overdue && !isSubmitted && <span className="text-red-600 font-semibold"> · OVERDUE</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </li>
            );
          })}
        </ul>
      )}
      <AssignmentEditDialog
        open={!!editing}
        assignment={editing}
        courseId={course.id}
        onClose={() => setEditing(null)}
        onChanged={() => { reload(); setEditing(null); }}
      />
      <StudentAssignmentDialog
        open={!!studentViewing}
        assignment={studentViewing}
        courseId={course.id}
        onClose={() => setStudentViewing(null)}
        onSubmitted={() => { if (studentViewing) void refreshMySubmission(studentViewing.id); }}
      />
    </SectionCard>
  );
}

// ─── Assignment editor ────────────────────────────────────────────────────
// Inline dialog reached by clicking an assignment row. Lets the
// instructor edit title/description/points/due, toggle publish, or delete.

function AssignmentEditDialog({
  open, assignment, courseId, onClose, onChanged,
}: {
  open: boolean;
  assignment: any | null;
  courseId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gradingOpen, setGradingOpen] = useState(false);

  useEffect(() => {
    if (assignment) {
      setForm({
        ...assignment,
        due_date_local: assignment.due_date ? toLocalInput(assignment.due_date) : '',
      });
    } else {
      setForm(null);
    }
  }, [assignment]);

  if (!open || !form) return null;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('gw_assignments')
      .update({
        title: form.title,
        description: form.description || null,
        points: Number(form.points) || 0,
        due_at: form.due_date_local ? new Date(form.due_date_local).toISOString() : null,
        is_active: !!form.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', form.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved.');
    onChanged();
  }
  async function del() {
    setDeleting(true);
    const { error } = await supabase.from('gw_assignments').delete().eq('id', form.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted.');
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-lg">Edit assignment</h3>
            <p className="text-xs text-muted-foreground">Changes are visible to students once you save with "Published" on.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Title</label>
            <Input value={form.title || ''} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Description / instructions</label>
            <Textarea
              value={form.description || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
              rows={5}
              placeholder="What students need to do, materials they'll need, rubric…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Points</label>
              <Input
                type="number"
                value={form.points ?? ''}
                onChange={(e) => setForm((f: any) => ({ ...f, points: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Due date</label>
              <Input
                type="datetime-local"
                value={form.due_date_local || ''}
                onChange={(e) => setForm((f: any) => ({ ...f, due_date_local: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <label className="text-sm font-medium">Published</label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.is_published}
                onChange={(e) => setForm((f: any) => ({ ...f, is_published: e.target.checked }))}
                className="rounded"
              />
              <span className="text-xs text-muted-foreground">{form.is_published ? 'Visible to students' : 'Draft — hidden'}</span>
            </label>
          </div>

          {/* Grade submissions — opens the per-student grading dialog.
              Kept in the same modal flow so instructors do not have to
              hunt for a separate route. Disabled while the assignment
              is a draft (nobody would have submitted yet). */}
          <div className="pt-3 border-t">
            <Button
              variant="outline"
              className="w-full gap-1.5"
              onClick={() => setGradingOpen(true)}
              disabled={!form.is_published}
              title={form.is_published ? undefined : 'Publish before grading'}
            >
              <FileText className="w-4 h-4" />
              Grade student submissions
            </Button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <Button variant="destructive" size="sm" onClick={del} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
      <InstructorSubmissionsDialog
        open={gradingOpen}
        assignment={form}
        courseId={courseId}
        onClose={() => setGradingOpen(false)}
      />
    </div>
  );
}

function toLocalInput(iso: string): string {
  // datetime-local expects "YYYY-MM-DDTHH:mm". Drop seconds/tz.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Quizzes ──────────────────────────────────────────────────────────────

function QuizzesTab({ course, canEdit }: TabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { code } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPoints, setNewPoints] = useState("100");
  const [newDuration, setNewDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  function reload() {
    supabase
      .from("gw_course_tests")
      .select("id, title, description, instructions, total_points, duration_minutes, available_from, available_until, allow_retakes, max_attempts, show_results_immediately, randomize_questions, is_published")
      .eq("course_id", course.id)
      .order("available_from", { ascending: true })
      .then(({ data }) => setItems(data || []));
  }

  useEffect(() => {
    let c = false;
    supabase
      .from("gw_course_tests")
      .select("id, title, description, instructions, total_points, duration_minutes, available_from, available_until, allow_retakes, max_attempts, show_results_immediately, randomize_questions, is_published")
      .eq("course_id", course.id)
      .order("available_from", { ascending: true })
      .then(({ data }) => {
        if (!c) { setItems(data || []); setLoading(false); }
      });
    return () => { c = true; };
  }, [course.id]);

  async function submit() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("gw_course_tests")
      .insert({
        course_id: course.id,
        title: newTitle.trim(),
        total_points: Number(newPoints) || 0,
        duration_minutes: newDuration ? Number(newDuration) : null,
        is_published: false,
        created_by: user?.id,
      })
      .select("id, title, description, instructions, total_points, duration_minutes, available_from, available_until, allow_retakes, max_attempts, show_results_immediately, randomize_questions, is_published")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(`Couldn't add quiz: ${error?.message || "unknown error"}`);
      return;
    }
    setItems((prev) => [...prev, data]);
    setNewTitle(""); setNewPoints("100"); setNewDuration("");
    setAddOpen(false);
    toast.success(`Added "${data.title}" (draft)`);
  }

  return (
    <SectionCard
      title="Quizzes &amp; tests"
      icon={<ClipboardCheck className="w-4 h-4" />}
      action={canEdit ? (
        <Button size="sm" variant="outline" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />{addOpen ? "Cancel" : "New"}
        </Button>
      ) : null}
    >
      {canEdit && addOpen && (
        <div className="border border-border rounded-lg p-3 mb-3 space-y-2 bg-muted/40">
          <Input
            placeholder="Quiz / test title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Total points"
              value={newPoints}
              onChange={(e) => setNewPoints(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              type="number"
              placeholder="Duration (min, optional)"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={saving || !newTitle.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Add quiz
            </Button>
          </div>
        </div>
      )}
      {loading ? <Loader /> : items.length === 0 ? (
        <Empty>No quizzes or tests yet.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((t) => (
            <li
              key={t.id}
              className="py-3 px-2 -mx-2 rounded hover:bg-slate-50 flex items-center justify-between gap-2"
            >
              <button
                onClick={() => canEdit ? setEditing(t) : navigate(`/academy/c/${code}/test/${t.id}/take`)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  {t.title}
                  {!t.is_published && <Badge variant="outline" className="text-xs">Draft</Badge>}
                </div>
                <div className="text-xs text-slate-500">
                  {t.total_points || 0} pts · {t.duration_minutes ? `${t.duration_minutes} min` : "untimed"}
                  {t.available_from && ` · ${format(new Date(t.available_from), "MMM d")}`}
                </div>
              </button>
              {canEdit ? (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/academy/c/${code}/test/${t.id}/attempts`)}>
                    Attempts
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/academy/c/${code}/test/${t.id}/questions`)}>
                    Build questions
                  </Button>
                </div>
              ) : (
                t.is_published && (
                  <Button size="sm" onClick={() => navigate(`/academy/c/${code}/test/${t.id}/take`)}>
                    Take quiz
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      <QuizEditDialog
        open={!!editing}
        quiz={editing}
        onClose={() => setEditing(null)}
        onChanged={() => { reload(); setEditing(null); }}
      />
    </SectionCard>
  );
}

// ─── Quiz / test editor ───────────────────────────────────────────────────
// Mirrors AssignmentEditDialog. The full question-bank UX comes later — for
// now teachers can set scheduling, attempt rules, point value, publish.

function QuizEditDialog({
  open, quiz, onClose, onChanged,
}: {
  open: boolean;
  quiz: any | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (quiz) {
      setForm({
        ...quiz,
        available_from_local: quiz.available_from ? toLocalInput(quiz.available_from) : '',
        available_until_local: quiz.available_until ? toLocalInput(quiz.available_until) : '',
      });
    } else {
      setForm(null);
    }
  }, [quiz]);

  if (!open || !form) return null;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('gw_course_tests')
      .update({
        title: form.title,
        description: form.description || null,
        instructions: form.instructions || null,
        total_points: Number(form.total_points) || 0,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        available_from: form.available_from_local ? new Date(form.available_from_local).toISOString() : null,
        available_until: form.available_until_local ? new Date(form.available_until_local).toISOString() : null,
        allow_retakes: !!form.allow_retakes,
        max_attempts: form.allow_retakes ? Number(form.max_attempts) || 1 : 1,
        show_results_immediately: !!form.show_results_immediately,
        randomize_questions: !!form.randomize_questions,
        is_published: !!form.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', form.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved.');
    onChanged();
  }
  async function del() {
    setDeleting(true);
    const { error } = await supabase.from('gw_course_tests').delete().eq('id', form.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted.');
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-lg">Edit quiz / test</h3>
            <p className="text-xs text-muted-foreground">Set the window students can take it, attempt rules, and whether they see results immediately.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Title</label>
            <Input value={form.title || ''} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Description</label>
            <Textarea
              value={form.description || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Instructions for students</label>
            <Textarea
              value={form.instructions || ''}
              onChange={(e) => setForm((f: any) => ({ ...f, instructions: e.target.value }))}
              rows={3}
              placeholder="Open book? Time limit? Anything they need to know before they start."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Total points</label>
              <Input
                type="number"
                value={form.total_points ?? ''}
                onChange={(e) => setForm((f: any) => ({ ...f, total_points: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Duration (minutes)</label>
              <Input
                type="number"
                value={form.duration_minutes ?? ''}
                onChange={(e) => setForm((f: any) => ({ ...f, duration_minutes: e.target.value }))}
                placeholder="Untimed"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Available from</label>
              <Input
                type="datetime-local"
                value={form.available_from_local || ''}
                onChange={(e) => setForm((f: any) => ({ ...f, available_from_local: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Available until</label>
              <Input
                type="datetime-local"
                value={form.available_until_local || ''}
                onChange={(e) => setForm((f: any) => ({ ...f, available_until_local: e.target.value }))}
              />
            </div>
          </div>
          <div className="pt-2 border-t space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Allow retakes</span>
              <input
                type="checkbox"
                checked={!!form.allow_retakes}
                onChange={(e) => setForm((f: any) => ({ ...f, allow_retakes: e.target.checked }))}
              />
            </label>
            {form.allow_retakes && (
              <div className="space-y-1.5 pl-4">
                <label className="text-xs font-medium">Max attempts</label>
                <Input
                  type="number"
                  value={form.max_attempts ?? 1}
                  onChange={(e) => setForm((f: any) => ({ ...f, max_attempts: e.target.value }))}
                  className="w-24"
                />
              </div>
            )}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Show results immediately</span>
              <input
                type="checkbox"
                checked={!!form.show_results_immediately}
                onChange={(e) => setForm((f: any) => ({ ...f, show_results_immediately: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Randomize question order</span>
              <input
                type="checkbox"
                checked={!!form.randomize_questions}
                onChange={(e) => setForm((f: any) => ({ ...f, randomize_questions: e.target.checked }))}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer pt-2 border-t mt-2">
              <span className="text-sm font-medium">Published</span>
              <span className="inline-flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{form.is_published ? 'Visible to students' : 'Draft — hidden'}</span>
                <input
                  type="checkbox"
                  checked={!!form.is_published}
                  onChange={(e) => setForm((f: any) => ({ ...f, is_published: e.target.checked }))}
                />
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <Button variant="destructive" size="sm" onClick={del} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Discussions ──────────────────────────────────────────────────────────

function DiscussionsTab({ course, canEdit }: TabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { code } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCohortId, setNewCohortId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: cohorts = [] } = useQueryReactQuery({
    queryKey: ['discussions-cohorts', course.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_cohorts')
        .select('id, name, color')
        .eq('course_id', course.id)
        .order('position');
      return data ?? [];
    },
  });

  useEffect(() => {
    let c = false;
    supabase
      .from("gw_course_discussions")
      .select("id, title, content, author_id, is_pinned, view_count, created_at, cohort_id, gw_course_cohorts(name, color)")
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

  async function submit() {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Title and opening message are both required.");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in to start a thread.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("gw_course_discussions")
      .insert({
        course_id: course.id,
        title: newTitle.trim(),
        content: newContent.trim(),
        author_id: user.id,
        is_pinned: false,
        view_count: 0,
        cohort_id: newCohortId || null,
      })
      .select("id, title, content, author_id, is_pinned, view_count, created_at, cohort_id, gw_course_cohorts(name, color)")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(`Couldn't start thread: ${error?.message || "unknown error"}`);
      return;
    }
    setItems((prev) => [data, ...prev]);
    setNewTitle(""); setNewContent(""); setNewCohortId("");
    setAddOpen(false);
    toast.success(newCohortId ? `Posted to cohort.` : `Posted "${data.title}"`);
  }

  return (
    <SectionCard
      title="Discussions"
      icon={<MessagesSquare className="w-4 h-4" />}
      action={
        <Button size="sm" variant="outline" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />{addOpen ? "Cancel" : "New thread"}
        </Button>
      }
    >
      {addOpen && (
        <div className="border border-border rounded-lg p-3 mb-3 space-y-2 bg-muted/40">
          <Input
            placeholder="Thread title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-9 text-sm"
          />
          <textarea
            placeholder="Opening message… markdown supported (**bold**, *italic*, [links](url), - lists)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2"
          />
          {canEdit && cohorts.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Visible to:</label>
              <select
                value={newCohortId}
                onChange={(e) => setNewCohortId(e.target.value)}
                className="flex-1 h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Everyone in this class</option>
                {cohorts.map((c: any) => (
                  <option key={c.id} value={c.id}>Cohort: {c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={saving || !newTitle.trim() || !newContent.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Post thread
            </Button>
          </div>
        </div>
      )}
      {loading ? <Loader /> : items.length === 0 ? (
        <Empty>No discussions yet. Start the first thread.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((d) => (
            <li
              key={d.id}
              onClick={() => navigate(`/academy/c/${code}/discuss/${d.id}`)}
              className="py-3 flex items-center justify-between gap-2 hover:bg-slate-50 px-2 -mx-2 rounded cursor-pointer"
            >
              <div className="min-w-0">
                <div className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                  {d.is_pinned && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pinned</Badge>}
                  {d.title}
                  {d.cohort_id && d.gw_course_cohorts && (
                    <Badge variant="outline" className="text-xs" style={{ borderColor: d.gw_course_cohorts.color, color: d.gw_course_cohorts.color }}>
                      {d.gw_course_cohorts.name}
                    </Badge>
                  )}
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
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [cohortFilter, setCohortFilter] = useState<string>('');

  // Cohorts (for filter dropdown + badges)
  const { data: cohorts = [] } = useQueryReactQuery({
    queryKey: ['people-tab-cohorts', course.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_cohorts')
        .select('id, name, color, position')
        .eq('course_id', course.id)
        .order('position');
      return data ?? [];
    },
  });

  // Cohort memberships joined to students.
  const { data: memberships = [] } = useQueryReactQuery({
    queryKey: ['people-tab-memberships', course.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_cohort_members')
        .select('cohort_id, user_id, gw_course_cohorts!inner(course_id)')
        .eq('gw_course_cohorts.course_id', course.id);
      return data ?? [];
    },
  });

  const cohortMap = useMemo(() => {
    const map = new Map<string, any>();
    cohorts.forEach((c: any) => map.set(c.id, c));
    return map;
  }, [cohorts]);

  const memberCohortIds = useMemo(() => {
    const map = new Map<string, string[]>();
    memberships.forEach((m: any) => {
      const arr = map.get(m.user_id) || [];
      arr.push(m.cohort_id);
      map.set(m.user_id, arr);
    });
    return map;
  }, [memberships]);

  const refreshRoster = useCallback(async () => {
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
        .from("gw_profiles_directory")
        .select("user_id, full_name, email, voice_part")
        .in("user_id", ids);
      (profs || []).forEach((p: any) =>
        pMap.set(p.user_id, { full_name: p.full_name, email: p.email, voice_part: p.voice_part })
      );
    }
    setRows(
      (enrolls || []).map((e: any) => {
        const p = pMap.get(e.user_id) || { full_name: null, email: null, voice_part: null };
        return { ...e, ...p };
      })
    );
    setLoading(false);
  }, [course.id]);

  useEffect(() => {
    refreshRoster();
  }, [refreshRoster]);

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
        .from("gw_profiles_directory").select("user_id, full_name, email, voice_part").in("user_id", ids);
      (profs || []).forEach((p: any) => pMap.set(p.user_id, p));
    }
    setRows((enrolls || []).map((e: any) => ({ ...e, ...(pMap.get(e.user_id) || {}) })));
    setLoading(false);
  }

  const instructors = rows.filter((r) => r.role === "instructor" || r.role === "ta");
  const allStudents = rows.filter((r) => r.role !== "instructor" && r.role !== "ta");
  const students = cohortFilter
    ? allStudents.filter((s) => (memberCohortIds.get(s.user_id) || []).includes(cohortFilter))
    : allStudents;

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
                <PeopleList rows={instructors} canDrillIn={false} onSelect={() => {}} cohortBadges={{}} />
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h4 className="text-xs uppercase tracking-wider text-slate-500">
                  Students ({students.length}{cohortFilter && allStudents.length !== students.length ? ` of ${allStudents.length}` : ''})
                </h4>
                {cohorts.length > 0 && (
                  <select
                    value={cohortFilter}
                    onChange={(e) => setCohortFilter(e.target.value)}
                    className="h-7 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="">All cohorts</option>
                    {cohorts.map((c: any) => <option key={c.id} value={c.id}>Filter: {c.name}</option>)}
                  </select>
                )}
              </div>
              {students.length ? (
                <PeopleList
                  rows={students}
                  canDrillIn={canEdit}
                  onSelect={setSelectedStudent}
                  courseId={course.id}
                  canResend={canEdit}
                  onRemoved={refreshRoster}
                  cohortBadges={students.reduce((acc, s) => {
                    acc[s.user_id] = (memberCohortIds.get(s.user_id) || []).map((cid) => cohortMap.get(cid)).filter(Boolean);
                    return acc;
                  }, {} as Record<string, any[]>)}
                />
              ) : (
                <Empty>{cohortFilter ? 'No students in this cohort.' : 'No students enrolled.'}</Empty>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Cohort sub-grouping inside the course (instructor-managed). */}
      <CourseCohortsPanel
        courseId={course.id}
        canEdit={canEdit}
        students={students}
      />

      {/* Student detail dialog — opens on row click for instructors. */}
      <StudentDetailDialog
        student={selectedStudent}
        courseId={course.id}
        courseCode={course.course_code}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}

function PeopleList({ rows, canDrillIn, onSelect, cohortBadges, courseId, canResend, onRemoved }: {
  rows: any[];
  canDrillIn: boolean;
  onSelect: (r: any) => void;
  cohortBadges?: Record<string, any[]>;
  /** Course these enrollments belong to — passed to the resend edge call. */
  courseId?: string;
  /** Teachers/admins only — hides the resend / remove controls for read-only views. */
  canResend?: boolean;
  /** Called after a successful remove so the parent can refresh the list. */
  onRemoved?: () => void;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => {
        const cohorts = cohortBadges?.[r.user_id] || [];
        return (
          <li
            key={r.id}
            onClick={() => canDrillIn ? onSelect(r) : undefined}
            className={`py-2.5 flex items-center gap-3 px-2 -mx-2 rounded ${
              canDrillIn ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(r.full_name?.[0] || r.email?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-900 truncate">{r.full_name || r.email || "(no name)"}</div>
              <div className="text-xs text-slate-500 truncate flex items-center gap-1.5 flex-wrap">
                <span className="truncate">{r.email}{r.voice_part ? ` · ${r.voice_part}` : ""}</span>
                {cohorts.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full border"
                    style={{ borderColor: c.color, color: c.color }}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">{r.role}</Badge>
            {canResend && r.email && courseId && (
              <ResendInviteButton email={r.email} courseId={courseId} />
            )}
            {canResend && courseId && r.id && (
              <RemoveStudentButton
                enrollmentId={r.id}
                userId={r.user_id}
                email={r.email}
                fullName={r.full_name}
                courseId={courseId}
                onRemoved={onRemoved}
              />
            )}
            {canDrillIn && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
          </li>
        );
      })}
    </ul>
  );
}

// Per-row "remove from class" button. Drops the enrollment row and any
// pending invite record for this course; the student keeps their auth
// account + profile (other classes are unaffected). Uses a single
// confirm dialog because un-enrolling is recoverable (the teacher can
// re-invite from the same People panel).
function RemoveStudentButton({
  enrollmentId,
  userId,
  email,
  fullName,
  courseId,
  onRemoved,
}: {
  enrollmentId: string;
  userId?: string;
  email?: string;
  fullName?: string;
  courseId: string;
  onRemoved?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async (e) => {
        e.stopPropagation();
        const label = fullName || email || 'this student';
        if (!window.confirm(`Remove ${label} from this class? They keep their account and can be re-invited.`)) return;
        setBusy(true);
        try {
          // Drop the active enrollment.
          const { error: enErr } = await supabase
            .from('gw_course_enrollments')
            .delete()
            .eq('id', enrollmentId);
          if (enErr) throw enErr;
          // Best-effort: clear any pending invite rows for this user+course
          // so a Resend later starts fresh.
          if (email) {
            await supabase
              .from('gw_student_invites')
              .delete()
              .eq('email', email)
              .eq('course_id', courseId);
          }
          toast.success(`Removed ${label}`);
          onRemoved?.();
        } catch (err: any) {
          toast.error(`Remove failed: ${err?.message ?? 'unknown error'}`);
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
      title={`Remove ${fullName || email || 'student'} from this class`}
    >
      {busy
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Trash2 className="w-3.5 h-3.5" />}
    </Button>
  );
}

// Per-row "resend invite" button. Re-calls gw-invite-student with the
// same email + course; the edge function is idempotent on the user side
// (skips create if the email already has an account) and re-sends a
// fresh magic-link email.
function ResendInviteButton({ email, courseId }: { email: string; courseId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          const { error } = await supabase.functions.invoke('gw-invite-student', {
            body: { email, courseId, appOrigin: window.location.origin },
          });
          if (error) throw error;
          toast.success(`Invite re-sent to ${email}`);
        } catch (err: any) {
          toast.error(`Resend failed: ${err?.message ?? 'unknown error'}`);
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 shrink-0"
      title={`Resend invite to ${email}`}
    >
      {busy
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <><Send className="w-3.5 h-3.5 mr-1" /> Resend</>}
    </Button>
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
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
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

// ─── Announcement compose dialog ───────────────────────────────────────────
// Lets an instructor post a new announcement, optionally scoped to one
// cohort. Supports markdown (rendered live on Overview).

function AnnouncementComposeDialog({
  open, courseId, onClose, onPosted,
}: {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cohortId, setCohortId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const { data: cohorts = [] } = useQueryReactQuery({
    queryKey: ['compose-cohorts', courseId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_cohorts')
        .select('id, name, color')
        .eq('course_id', courseId)
        .order('position');
      return data ?? [];
    },
  });

  useEffect(() => { if (open) { setTitle(''); setContent(''); setCohortId(''); } }, [open]);

  if (!open) return null;

  async function post() {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and message both required.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('gw_course_announcements').insert({
      course_id: courseId,
      title: title.trim(),
      content: content.trim(),
      created_by: user?.id,
      cohort_id: cohortId || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(cohortId ? 'Posted to cohort.' : 'Posted to class.');
    onPosted();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 space-y-3">
          <div>
            <h3 className="font-semibold text-lg">New announcement</h3>
            <p className="text-xs text-muted-foreground">Markdown supported (headings, **bold**, lists, [links](url)).</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rehearsal cancelled tomorrow" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Message</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="What students need to know…"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Send to</label>
            <select
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Everyone in this class</option>
              {cohorts.map((c: any) => (
                <option key={c.id} value={c.id}>Cohort: {c.name}</option>
              ))}
            </select>
          </div>

          {content && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Preview</div>
              <SimpleMarkdown source={content} className="text-sm" />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={post} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add-on dispatch ──────────────────────────────────────────────────────
// Render the matching add-on component for the active slug. Unknown slugs
// fall through to a "not built yet" message so toggling on a placeholder
// addon doesn't blank the page.

function AddonDispatch({
  slug, courseId, canEdit,
}: {
  slug: AddonSlug | string;
  courseId: string;
  canEdit: boolean;
}) {
  switch (slug) {
    case 'polls':          return <PollsAddon         courseId={courseId} canEdit={canEdit} />;
    case 'qr-attendance':  return <QRAttendanceAddon  courseId={courseId} canEdit={canEdit} />;
    case 'tour-manager':
      // Unified: course-scoped events rollup + embedded TourManagerDashboard.
      return <TourAddon courseId={courseId} canEdit={canEdit} />;
    case 'wardrobe':
      // Unified: addon renders course-scoped rollups (checkouts/orders
      // for this class) on top of the embedded WardrobeManagementHub.
      return <WardrobeAddon courseId={courseId} canEdit={canEdit} />;
    case 'ai-grading':
      return <AiGradingAddon courseId={courseId} canEdit={canEdit} />;
    case 'ai-hub':
      return <EmbeddedWorkspaceModule label="AI Hub"><AIHubEmbed /></EmbeddedWorkspaceModule>;
    case 'student-practice':
      return <CoursePracticeTab courseId={courseId} canEdit={canEdit} />;
    default:
      return (
        <Card className="border-0 rounded-2xl bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            This add-on doesn't have an in-course view yet — the toggle is live, the renderer is on the way.
          </p>
        </Card>
      );
  }
}

// Wraps a workspace-level module embedded inside a course tab so it gets
// a small contextual header ("Workspace tool" pill + label) and survives
// any layout assumptions the module makes about top-of-page real estate.
function EmbeddedWorkspaceModule({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline" className="text-xs">Workspace tool</Badge>
        <span>{label} — same controls as in your workspace settings.</span>
      </div>
      <div className="rounded-2xl bg-card overflow-hidden" style={{
        boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
      }}>
        <Suspense fallback={<div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-slate-400" /></div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
