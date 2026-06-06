// /academy — student daily home. Class cards as primary tiles, urgency-colored
// "due soon" tags, big date chips on events. Built to feel like a place, not a list.
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen, Calendar, ClipboardList, Timer, Megaphone, ChevronRight,
  Music, Sparkles, MapPin, LogOut,
} from 'lucide-react';

export default function AcademyHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useBrandingSettings();
  const accent = settings?.primary_color || '#7c3aed';
  const orgName = (settings as any)?.org_name || 'your program';

  const { data: profile } = useQuery({
    queryKey: ['student-home-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('gw_profiles')
        .select('full_name, voice_part, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['student-home-courses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('gw_course_enrollments')
        .select('course_id, gw_courses!inner(id, course_code, title, instructor_name, semester)')
        .eq('user_id', user.id)
        .in('enrollment_status', ['enrolled', 'active'])
        .limit(10);
      if (error) throw error;
      return (data ?? []).map((e: any) => e.gw_courses).filter(Boolean);
    },
    enabled: !!user,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['student-home-events'],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 14);
      const { data } = await supabase
        .from('gw_events')
        .select('id, title, start_date, venue_name, location, event_type')
        .gte('start_date', new Date().toISOString())
        .lte('start_date', cutoff.toISOString())
        .order('start_date', { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: dueAssignments = [] } = useQuery({
    queryKey: ['student-home-due', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 21);
      const { data } = await supabase
        .from('gw_assignments')
        .select('id, title, due_at, course_id')
        .gte('due_at', new Date().toISOString())
        .lte('due_at', cutoff.toISOString())
        .order('due_at', { ascending: true })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const greeting = greetingFor(new Date());

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background pb-16">
      {/* Hero greeting */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, ${shade(accent, -25)} 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px, 60px 60px',
        }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-10 sm:pb-14 text-white">
          {/* Slim top bar — logo + sign out */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/90 hover:text-white">
              {settings?.logo_url && <img src={settings.logo_url} alt={orgName} className="h-7 w-auto object-contain" />}
              <span className="font-semibold text-sm">{orgName}</span>
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}
              className="text-xs text-white/80 hover:text-white flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Avatar name={profile?.full_name || 'You'} url={profile?.avatar_url} />
            <div>
              <div className="text-xs sm:text-sm uppercase tracking-widest text-white/70">{greeting}</div>
              <h1 className="text-3xl sm:text-4xl font-bold mt-0.5">{firstName || 'Welcome'}.</h1>
              <p className="text-sm text-white/80 mt-1">
                {profile?.voice_part && <>Voice part: <span className="font-medium">{profile.voice_part}</span> · </>}
                {courses.length} active class{courses.length === 1 ? '' : 'es'} at {orgName}
              </p>
            </div>
          </div>

          {/* Stat strip removed. */}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 space-y-6 relative">
        {/* Your classes — big colorful cards */}
        <section>
          <SectionTitle icon={<BookOpen className="w-4 h-4" />} title="Your classes" />
          {courses.length === 0 ? (
            <EmptyCard text="You're not enrolled in any classes yet. Ask your director for a class code." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.map((c: any, i: number) => (
                <ClassCard key={c.id} course={c} accent={paletteColor(i, accent)} onClick={() => navigate(`/academy/c/${(c.course_code || '').toLowerCase()}`)} />
              ))}
            </div>
          )}
        </section>

        {/* Due soon — color-urgency tags */}
        <section>
          <SectionTitle icon={<ClipboardList className="w-4 h-4" />} title="Due soon" />
          {dueAssignments.length === 0 ? (
            <EmptyCard text="Nothing due in the next 3 weeks. Enjoy the calm." />
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {dueAssignments.map((a: any) => (
                  <AssignmentRow key={a.id} a={a} onClick={() => navigate(`/academy/assignments/${a.id}`)} />
                ))}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Events */}
        <section>
          <SectionTitle icon={<Calendar className="w-4 h-4" />} title="What's coming up" />
          {upcomingEvents.length === 0 ? (
            <EmptyCard text="Nothing on the calendar in the next 2 weeks." />
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((e: any) => (
                <EventRow key={e.id} e={e} onClick={() => navigate(`/calendar?event=${e.id}`)} />
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <SectionTitle icon={<Sparkles className="w-4 h-4" />} title="Jump to…" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickTile label="Log practice" icon={<Timer />} accent="bg-orange-500" onClick={() => navigate('/practice/log')} />
            <QuickTile label="Announcements" icon={<Megaphone />} accent="bg-sky-500" onClick={() => navigate('/academy/announcements')} />
            <QuickTile label="Music Library" icon={<Music />} accent="bg-rose-500" onClick={() => navigate('/music-library')} />
            <QuickTile label="Calendar" icon={<Calendar />} accent="bg-violet-500" onClick={() => navigate('/calendar')} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-3">
      {icon} {title}
    </h2>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">{text}</CardContent></Card>;
}

function ClassCard({ course, accent, onClick }: { course: any; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden group hover:shadow-lg transition-all hover:-translate-y-0.5 border bg-card"
    >
      <div className="h-1.5" style={{ background: accent }} />
      <div className="p-4">
        <div className="text-xs font-mono text-muted-foreground">{course.course_code}</div>
        <div className="font-semibold text-lg mt-0.5 line-clamp-2">{course.title || course.course_code}</div>
        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {course.instructor_name && <span>👤 {course.instructor_name}</span>}
          {course.semester && <span>📅 {course.semester}</span>}
        </div>
        <div className="flex items-center justify-end mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ChevronRight className="w-3 h-3 ml-0.5" />
        </div>
      </div>
    </button>
  );
}

function AssignmentRow({ a, onClick }: { a: any; onClick: () => void }) {
  const due = new Date(a.due_at);
  const now = new Date();
  const hoursLeft = (due.getTime() - now.getTime()) / 3_600_000;
  let badge: string, badgeClass: string;
  if (hoursLeft < 24) { badge = 'Today'; badgeClass = 'bg-red-100 text-red-700'; }
  else if (hoursLeft < 24 * 7) { badge = 'This week'; badgeClass = 'bg-amber-100 text-amber-700'; }
  else { badge = 'Later'; badgeClass = 'bg-slate-100 text-slate-600'; }
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{a.title}</div>
        <div className="text-xs text-muted-foreground">Due {due.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
    </button>
  );
}

function EventRow({ e, onClick }: { e: any; onClick: () => void }) {
  const d = new Date(e.start_date);
  const day = d.getDate();
  const month = d.toLocaleString([], { month: 'short' });
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <button onClick={onClick} className="w-full text-left bg-card border rounded-xl p-3 flex items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="shrink-0 w-14 text-center rounded-lg bg-primary/10 text-primary py-1">
        <div className="text-[10px] uppercase font-bold tracking-wide">{month}</div>
        <div className="text-2xl font-bold leading-none">{day}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{e.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <span>{time}</span>
          {(e.venue_name || e.location) && <><span>·</span><MapPin className="w-3 h-3" /><span className="truncate">{e.venue_name || e.location}</span></>}
        </div>
      </div>
    </button>
  );
}

function QuickTile({ label, icon, accent, onClick }: { label: string; icon: React.ReactNode; accent: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl bg-card border p-3 sm:p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-full ${accent} text-white flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-xs sm:text-sm font-medium text-center">{label}</span>
    </button>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white/50" />;
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white text-lg font-bold flex items-center justify-center ring-2 ring-white/50">
      {initials || '?'}
    </div>
  );
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 6) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function shade(hex: string, percent: number): string {
  // Lighten/darken a hex color. positive = lighter, negative = darker.
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 * percent) / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round((255 * percent) / 100)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round((255 * percent) / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
function paletteColor(i: number, fallback: string) {
  return PALETTE[i % PALETTE.length] || fallback;
}
