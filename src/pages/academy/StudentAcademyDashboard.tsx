// /academy — student home, slimmed down from the previous variant so it
// doesn't duplicate the Command Center.
// Layout:
//   • Greeting header
//   • Array of enrolled classes (the main thing — clickable into each course)
//   • 2×3 grid of utility cards: Office Hours / Due Soon / Recent Activity
//     and Practice Log / How to Read Music / Quick Links.

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, Activity, Timer, BookOpen, ChevronRight, CalendarClock,
  GraduationCap, LifeBuoy, MessageCircle, Lightbulb, Shield, Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function StudentAcademyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['academy-home-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Enrolled classes (array, not just a count).
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['academy-home-courses-list', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_enrollments')
        .select('course_id, gw_courses!inner(id, course_code, title, instructor_name, semester)')
        .eq('user_id', user!.id)
        .in('enrollment_status', ['enrolled', 'active', 'in_progress', 'registered'])
        .limit(20);
      return ((data ?? []).map((e: any) => e.gw_courses).filter(Boolean)) as any[];
    },
  });

  // Due Soon — assignment titles + due_at within 21 days.
  const { data: dueSoon = [], isLoading: dueLoading } = useQuery({
    queryKey: ['academy-home-due-list'],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 21);
      const { data } = await supabase
        .from('gw_assignments')
        .select('id, title, due_at')
        .gte('due_at', new Date().toISOString())
        .lte('due_at', cutoff.toISOString())
        .order('due_at', { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  // Recent Activity — last 5 announcements.
  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['academy-home-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_announcements')
        .select('id, title, content, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const greeting = greetingFor(new Date());

  return (
    <DashboardPageShell
      title={`${greeting}, ${firstName}! 👋`}
      subtitle="Here are your classes and what's coming up."
    >
        {/* Classes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5" /> My Classes
            </h2>
            <span className="text-xs text-muted-foreground">
              {coursesLoading ? '' : `${courses.length} enrolled`}
            </span>
          </div>

          {coursesLoading ? (
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  You're not enrolled in any classes yet. Ask your director for a class code.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((c, i) => (
                <ClassTile
                  key={c.id}
                  course={c}
                  accent={CLASS_PALETTE[i % CLASS_PALETTE.length]}
                  onClick={() => navigate(`/academy/c/${(c.course_code || '').toLowerCase()}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Utility row 1: Office Hours / Due Soon / Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <UtilityCard
            icon={CalendarClock}
            iconBg="bg-purple-50"
            iconFg="text-purple-600"
            title="Office Hours"
            subtitle="Book a 1-on-1 with your instructor."
            actionLabel="Open"
            onAction={() => navigate('/dashboard/office-hours')}
          />

          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 inline-flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">Due Soon</h3>
              </div>
              {dueLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto my-6" />
              ) : dueSoon.length === 0 ? (
                <p className="text-sm text-muted-foreground my-3">Nothing due in the next 3 weeks.</p>
              ) : (
                <ul className="space-y-2 flex-1">
                  {dueSoon.map((a: any) => {
                    const due = parseISO(a.due_at);
                    return (
                      <li key={a.id} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="flex-1 truncate">{a.title}</span>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {format(due, 'MMM d')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-between text-amber-700 hover:bg-amber-50"
                onClick={() => navigate('/dashboard/assignments')}
              >
                View all <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 inline-flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">Recent Activity</h3>
              </div>
              {activityLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto my-6" />
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground my-3">You're all caught up.</p>
              ) : (
                <ul className="space-y-2 flex-1">
                  {activity.map((a: any) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span className="flex-1 truncate">{a.title}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-between text-sky-700 hover:bg-sky-50"
                onClick={() => navigate('/dashboard/notifications')}
              >
                View all <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Utility row 2: Practice Log / How to Read Music / Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <UtilityCard
            icon={Timer}
            iconBg="bg-orange-50"
            iconFg="text-orange-600"
            title="Practice Log"
            subtitle="Track your practice and keep a streak."
            actionLabel="Open"
            onAction={() => navigate('/practice/log')}
          />
          <UtilityCard
            icon={BookOpen}
            iconBg="bg-emerald-50"
            iconFg="text-emerald-600"
            title="How to Read Music"
            subtitle="Notation, rhythm, and sight-singing basics."
            actionLabel="Learn"
            onAction={() => navigate('/read-music')}
          />
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-5">
              <h3 className="font-semibold text-lg mb-3">Quick Links</h3>
              <div className="space-y-1">
                <QuickLink icon={<LifeBuoy className="w-4 h-4 text-muted-foreground" />} label="Academy Help Center" onClick={() => navigate('/help')} />
                <QuickLink icon={<MessageCircle className="w-4 h-4 text-muted-foreground" />} label="Submit a Question" onClick={() => navigate('/help/contact')} />
                <QuickLink icon={<Lightbulb className="w-4 h-4 text-muted-foreground" />} label="Practice Tips" onClick={() => navigate('/academy/practice-tips')} />
                <QuickLink icon={<Shield className="w-4 h-4 text-muted-foreground" />} label="Community Guidelines" onClick={() => navigate('/community-guidelines')} />
              </div>
            </CardContent>
          </Card>
        </div>
    </DashboardPageShell>
  );
}

// ── Class tile ────────────────────────────────────────────────────────

const CLASS_PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

function ClassTile({ course, accent, onClick }: { course: any; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden group hover:-translate-y-0.5 transition-all bg-card"
      style={SOFT_CARD_STYLE}
    >
      <div className="h-1.5" style={{ background: accent }} />
      <div className="p-4">
        <div className="text-xs font-mono text-muted-foreground">{course.course_code}</div>
        <div className="font-semibold text-base mt-0.5 line-clamp-2">{course.title || course.course_code}</div>
        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {course.instructor_name && <span>👤 {course.instructor_name}</span>}
          {course.semester && <span>📅 {course.semester}</span>}
        </div>
        <div className="flex items-center justify-end mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition">
          Open <ChevronRight className="w-3 h-3 ml-0.5" />
        </div>
      </div>
    </button>
  );
}

// ── Utility card ──────────────────────────────────────────────────────

function UtilityCard({
  icon: Icon, iconBg, iconFg, title, subtitle, actionLabel, onAction,
}: {
  icon: React.ElementType;
  iconBg: string; iconFg: string;
  title: string; subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn('w-9 h-9 rounded-xl inline-flex items-center justify-center', iconBg)}>
            <Icon className={cn('w-5 h-5', iconFg)} />
          </div>
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4 flex-1">{subtitle}</p>
        <Button onClick={onAction} className="w-full font-semibold">
          {actionLabel} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/40 transition"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <span className="text-sm truncate">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 6) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
