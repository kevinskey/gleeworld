import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModuleProps } from '@/types/unified-modules';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Calendar,
  ClipboardCheck,
  BookOpen,
  Megaphone,
  FileText,
  Users,
  PenSquare,
  Plus,
  Search,
  ArrowRight,
  Loader2,
  Pencil,
  Trash2,
  MoreVertical,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  semester: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  meeting_patterns: any;
}

interface Stats {
  classes: number;
  students: number;
  assignmentsDueWeek: number;
  pendingSubmissions: number;
}

const QUICK_TOOLS = [
  { label: 'Assessments',     icon: PenSquare,      route: '/control-center?module=assessment-hub' },
  { label: 'Attendance',      icon: ClipboardCheck, route: '/control-center?module=attendance' },
  { label: 'Calendar',        icon: Calendar,       route: '/control-center?module=calendar' },
  { label: 'Announcements',   icon: Megaphone,      route: '/control-center?module=communications-hub' },
  { label: 'Roster',          icon: Users,          route: '/control-center?module=member-dossiers' },
  { label: 'Syllabi',         icon: BookOpen,       route: '/academy/printable-syllabi' },
];

function classRoute(code: string): string {
  const slug = code.trim().toLowerCase().replace(/\s+/g, '-');
  // /academy/c/:code → new Canvas-style course shell. Legacy MUS-070/MUS-240/
  // LH-100 pages still live at /academy/:code unchanged.
  return `/academy/c/${slug}`;
}

function fmtSemester(s: string | null): string {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const GleeAcademyModule = ({ user: _user, isFullPage = false }: ModuleProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserRole();
  const isAdmin = !!(profile?.is_super_admin || profile?.is_admin || profile?.role === 'super-admin' || profile?.role === 'admin' || profile?.role === 'director');

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [instructing, setInstructing] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats>({ classes: 0, students: 0, assignmentsDueWeek: 0, pendingSubmissions: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: coursesData, error: coursesErr } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, description, instructor_id, instructor_name, semester, is_active, start_date, end_date, meeting_patterns')
        .eq('is_active', true)
        .order('course_code', { ascending: true });

      if (coursesErr) {
        console.error('[GleeAcademy] courses error', coursesErr);
      }
      if (cancelled) return;

      const list = (coursesData || []) as Course[];
      setCourses(list);

      // Enrollment lookups (only if logged in)
      if (user?.id) {
        const { data: enrData } = await supabase
          .from('gw_course_enrollments')
          .select('course_id, role')
          .eq('user_id', user.id);

        const en = new Set<string>();
        const ins = new Set<string>();
        (enrData || []).forEach((r: any) => {
          if (r.role === 'instructor' || r.role === 'ta') ins.add(r.course_id);
          else en.add(r.course_id);
        });
        // Instructor-of-record from gw_courses.instructor_id
        list.forEach((c) => {
          if (c.instructor_id === user.id) ins.add(c.id);
        });
        if (!cancelled) {
          setEnrolled(en);
          setInstructing(ins);
        }
      }

      // Stats (best-effort; RLS may filter)
      const [{ count: studentCount }, { count: dueCount }, { count: pendingCount }] = await Promise.all([
        supabase.from('gw_course_enrollments').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('enrollment_status', 'enrolled'),
        supabase.from('gw_course_assignments').select('id', { count: 'exact', head: true }).gte('due_date', new Date().toISOString()).lte('due_date', new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()),
        supabase.from('gw_course_submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      ]);

      if (!cancelled) {
        setStats({
          classes: list.length,
          students: studentCount ?? 0,
          assignmentsDueWeek: dueCount ?? 0,
          pendingSubmissions: pendingCount ?? 0,
        });
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      c.course_code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.instructor_name || '').toLowerCase().includes(q)
    );
  }, [courses, query]);

  const myClasses = useMemo(
    () => courses.filter((c) => instructing.has(c.id) || enrolled.has(c.id)),
    [courses, instructing, enrolled]
  );

  async function handleDelete(c: Course) {
    if (!confirm(`Delete ${c.course_code} — "${c.title}"?\n\nThis archives the class (sets is_active = false). All assignments, attendance, and grades are preserved.`)) {
      return;
    }
    const { error } = await supabase
      .from('gw_courses')
      .update({ is_active: false })
      .eq('id', c.id);
    if (error) {
      toast.error(`Couldn't archive class: ${error.message}`);
      return;
    }
    setCourses((prev) => prev.filter((x) => x.id !== c.id));
    toast.success(`Archived ${c.course_code}`);
  }

  async function handleEditSave(updated: Course) {
    const { error } = await supabase
      .from('gw_courses')
      .update({
        course_code: updated.course_code,
        code: updated.course_code,
        title: updated.title,
        description: updated.description,
        semester: updated.semester,
      } as any)
      .eq('id', updated.id);
    if (error) {
      toast.error(`Couldn't save: ${error.message}`);
      return;
    }
    setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditing(null);
    toast.success(`Saved ${updated.course_code}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div
            className="text-3xl md:text-4xl font-bold text-foreground"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", textTransform: 'none', letterSpacing: 0 }}
          >
            Glee Academy
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Your learning management system — classes, students, assignments, grades.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)} className="bg-sky-600 hover:bg-sky-500 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Create Class
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Classes" value={stats.classes} loading={loading} />
        <StatCard label="Students Enrolled" value={stats.students} loading={loading} />
        <StatCard label="Assignments Due (7d)" value={stats.assignmentsDueWeek} loading={loading} />
        <StatCard label="Pending Submissions" value={stats.pendingSubmissions} loading={loading} />
      </div>

      {/* My Classes */}
      {user && (
        <Section title={instructing.size > 0 ? 'My Classes' : 'Enrolled'} subtitle="Jump back into a class you teach or take.">
          {loading ? (
            <Loading />
          ) : myClasses.length === 0 ? (
            <EmptyHint>
              {isAdmin
                ? 'You aren\'t teaching any classes yet. Click "Create Class" to add your first one.'
                : 'You aren\'t enrolled in any classes yet.'}
            </EmptyHint>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myClasses.map((c) => (
                <ClassCard
                  key={c.id}
                  course={c}
                  role={instructing.has(c.id) ? 'Instructor' : 'Student'}
                  canManage={isAdmin || c.instructor_id === user?.id}
                  onOpen={() => navigate(classRoute(c.course_code))}
                  onEdit={() => setEditing(c)}
                  onDelete={() => handleDelete(c)}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* All Classes */}
      <Section
        title="All Classes"
        subtitle="Every active class in the system."
        right={
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search classes..."
              className="pl-8 w-56"
            />
          </div>
        }
      >
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <EmptyHint>No classes match your search.</EmptyHint>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <ClassCard
                key={c.id}
                course={c}
                canManage={isAdmin || c.instructor_id === user?.id}
                onOpen={() => navigate(classRoute(c.course_code))}
                onEdit={() => setEditing(c)}
                onDelete={() => handleDelete(c)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Quick Tools */}
      <Section title="Tools" subtitle="Cross-class admin tools.">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.label}
                onClick={() => navigate(t.route)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-3 transition-colors text-center"
              >
                <Icon className="w-5 h-5 text-sky-400 mx-auto mb-1.5" />
                <div className="text-xs font-medium text-white">{t.label}</div>
              </button>
            );
          })}
        </div>
      </Section>

      {showCreate && (
        <CreateClassDialog
          onClose={() => setShowCreate(false)}
          onCreated={(newCourse) => {
            setCourses((prev) => [newCourse, ...prev]);
            setShowCreate(false);
            navigate(classRoute(newCourse.course_code));
          }}
          instructorId={user?.id ?? null}
          instructorName={(profile as any)?.full_name ?? null}
        />
      )}

      {editing && (
        <EditClassDialog
          course={editing}
          onClose={() => setEditing(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
};

// ─── helpers ───────────────────────────────────────────────────────────────

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="text-xs text-slate-300 uppercase tracking-wide">{label}</div>
      <div className="text-2xl md:text-3xl font-bold text-white mt-1">
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : value}
      </div>
    </div>
  );
}

function Section({
  title, subtitle, right, children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", textTransform: 'none', letterSpacing: 0 }}>
            {title}
          </h2>
          {subtitle && <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function ClassCard({
  course, role, canManage, onOpen, onEdit, onDelete,
}: {
  course: Course;
  role?: string;
  canManage?: boolean;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="relative bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors group">
      <button
        onClick={onOpen}
        className="w-full text-left p-5 pb-12 flex flex-col"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-xs font-mono text-sky-400">{course.course_code}</div>
          {role && (
            <Badge className="bg-sky-600 text-white border-0 text-[10px]">
              {role}
            </Badge>
          )}
        </div>
        <div className="font-semibold text-white mb-1 line-clamp-2 pr-16">{course.title}</div>
        {course.description && (
          <div className="text-xs text-slate-300 line-clamp-2 mb-3">{course.description}</div>
        )}
        <div className="mt-auto flex items-center justify-between text-[11px] text-slate-400">
          <span>{course.instructor_name || ''}</span>
          <span className="flex items-center gap-1">
            {fmtSemester(course.semester)}
            <ArrowRight className="w-3 h-3 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </button>
      {/* Rehearsal-tonight quick action — always visible, the highest-frequency thing a director does */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); window.location.href = `/academy/${course.course_code.toLowerCase().replace(/\s+/g, '-')}/rehearsal-today`; }}
        className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold shadow"
        title="Open Rehearsal Tonight"
      >
        <Zap className="w-3 h-3" /> Rehearsal tonight
      </button>
      {canManage && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-1.5 rounded-md bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700"
            title="Edit class"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="p-1.5 rounded-md bg-slate-900/80 hover:bg-red-900 text-slate-300 hover:text-white border border-slate-700"
            title="Archive class"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function EditClassDialog({
  course, onClose, onSave,
}: {
  course: Course;
  onClose: () => void;
  onSave: (c: Course) => Promise<void> | void;
}) {
  const [code, setCode] = useState(course.course_code);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || '');
  const [semester, setSemester] = useState(course.semester || '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!code.trim() || !title.trim()) {
      toast.error('Course code and title are required.');
      return;
    }
    setSaving(true);
    await onSave({
      ...course,
      course_code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim() || null,
      semester: semester.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-lg font-semibold text-white">Edit Class</h3>
          <p className="text-xs text-slate-400">Update the class details below.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300">Code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Semester</label>
            <Input value={semester} onChange={(e) => setSemester(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:bg-slate-800">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-sky-600 hover:bg-sky-500 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 h-36 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700 border-dashed rounded-xl p-6 text-sm text-slate-300">
      {children}
    </div>
  );
}

// ─── create class dialog ───────────────────────────────────────────────────

function CreateClassDialog({
  onClose, onCreated, instructorId, instructorName,
}: {
  onClose: () => void;
  onCreated: (c: Course) => void;
  instructorId: string | null;
  instructorName: string | null;
}) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState(defaultSemester());
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!code.trim() || !title.trim()) {
      toast.error('Course code and title are required.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('gw_courses')
      .insert({
        course_code: code.trim().toUpperCase(),
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim() || null,
        semester,
        instructor_id: instructorId,
        instructor_name: instructorName,
        is_active: true,
      })
      .select('id, course_code, title, description, instructor_id, instructor_name, semester, is_active, start_date, end_date, meeting_patterns')
      .single();
    setSaving(false);

    if (error || !data) {
      console.error('[GleeAcademy] create failed', error);
      toast.error(`Couldn't create class: ${error?.message || 'unknown error'}`);
      return;
    }
    toast.success(`Created ${data.course_code}`);
    onCreated(data as Course);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-lg font-semibold text-white">Create Class</h3>
          <p className="text-xs text-slate-400">Add a new class to Glee Academy.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300">Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MUS 240"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced Choir"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300">Semester</label>
            <Input
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:bg-slate-800">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-sky-600 hover:bg-sky-500 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function defaultSemester(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const term = m <= 5 ? 'spring' : m <= 7 ? 'summer' : 'fall';
  return `${term}_${y}`;
}
