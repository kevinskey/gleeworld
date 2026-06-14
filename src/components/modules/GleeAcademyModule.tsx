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
} from 'lucide-react';
import { toast } from 'sonner';
import { CourseLibrarySection } from '@/components/academy/CourseLibrarySection';
import { CreateClassDialog } from '@/components/modules/CreateClassDialog';

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
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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

      {/* Course Library (premium templates) */}
      <CourseLibrarySection isSuperAdmin={!!profile?.is_super_admin} />

      {/* Quick Tools */}
      <Section title="Tools" subtitle="Cross-class admin tools.">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.label}
                onClick={() => navigate(t.route)}
                className="bg-card hover:bg-muted border border-border rounded-xl p-3 transition-colors text-center"
              >
                <Icon className="w-5 h-5 text-sky-400 mx-auto mb-1.5" />
                <div className="text-xs font-medium text-card-foreground">{t.label}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <CreateClassDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={async (newCourseId) => {
          // Re-fetch the new course row so the local card list updates with
          // its full shape (the dialog only returns the id).
          const { data } = await supabase
            .from('gw_courses')
            .select('id, course_code, title, description, instructor_id, instructor_name, semester, is_active, start_date, end_date, meeting_patterns')
            .eq('id', newCourseId)
            .single();
          if (data) {
            setCourses((prev) => [data as Course, ...prev]);
            navigate(classRoute((data as Course).course_code));
          }
        }}
      />


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
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl md:text-3xl font-bold text-card-foreground mt-1">
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : value}
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
    <div className="relative bg-card hover:bg-muted border border-border rounded-xl transition-colors group">
      <button
        onClick={onOpen}
        className="w-full text-left p-5 flex flex-col"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-xs font-mono text-sky-400">{course.course_code}</div>
          {role && (
            <Badge className="bg-primary text-primary-foreground border-0 text-[10px]">
              {role}
            </Badge>
          )}
        </div>
        <div className="font-semibold text-card-foreground mb-1 line-clamp-2 pr-16">{course.title}</div>
        {course.description && (
          <div className="text-xs text-muted-foreground line-clamp-2 mb-3">{course.description}</div>
        )}
        <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{course.instructor_name || ''}</span>
          <span className="flex items-center gap-1">
            {fmtSemester(course.semester)}
            <ArrowRight className="w-3 h-3 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </button>
      {canManage && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
            title="Edit class"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="p-1.5 rounded-md bg-muted/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive border border-border"
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
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Edit Class</h3>
          <p className="text-xs text-muted-foreground">Update the class details below.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="bg-background border-input text-foreground" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background border-input text-foreground" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background border-input text-foreground" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Semester</label>
            <Input value={semester} onChange={(e) => setSemester(e.target.value)} className="bg-background border-input text-foreground" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:bg-muted">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
        <div key={i} className="bg-muted/50 border border-border rounded-xl p-5 h-36 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 border border-border border-dashed rounded-xl p-6 text-sm text-muted-foreground">
      {children}
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
