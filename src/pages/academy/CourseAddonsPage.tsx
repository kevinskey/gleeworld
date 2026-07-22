// /academy/c/:code/addons — per-course add-ons toggle. Each course is a
// container; teachers flip on the features that class actually needs
// (Tour for touring choirs, QR for attendance check-in, YouTube for video
// lecture courses, etc.). Writes to gw_course_addons.
//
// Available add-ons are defined in the catalog below — match the slugs
// the rest of the app will read to render each feature inside a course.

import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Plane, QrCode, Youtube, ListMusic, FileText, Music, Mic, Shirt,
  Ticket, Heart, Brain, Sparkles, LibraryBig, Megaphone, Award, Newspaper,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type AddonDef = {
  slug: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tone: string; // tailwind bg + fg class for the icon tile
};

// The course add-on catalog. Adding new ones is just appending to this list
// + matching slug used by the corresponding course feature renderer.
const ADDONS: AddonDef[] = [
  { slug: 'tour-manager',         title: 'Tour Manager',           description: 'Itinerary, transportation, lodging for touring ensembles.', icon: Plane,      tone: 'bg-sky-50 text-sky-600' },
  { slug: 'qr-attendance',        title: 'QR Attendance',          description: 'Generate codes students scan to check in.',                  icon: QrCode,     tone: 'bg-purple-50 text-purple-600' },
  { slug: 'polls',                title: 'Polls',                  description: 'Live or async polls inside this class.',                     icon: ListMusic,  tone: 'bg-amber-50 text-amber-600' },
  { slug: 'sight-reading',        title: 'Sight Reading',          description: 'Sight-singing drills + generator.',                          icon: Mic,        tone: 'bg-violet-50 text-violet-600' },
  { slug: 'student-practice',     title: 'Practice',               description: 'Students record practice takes; teachers review and leave feedback.', icon: Music,  tone: 'bg-rose-50 text-rose-600' },
  { slug: 'wardrobe',             title: 'Wardrobe',               description: 'Concert attire requirements for performance ensembles.',     icon: Shirt,      tone: 'bg-pink-50 text-pink-600' },
  { slug: 'ai-grading',           title: 'AI Grading Assist',      description: 'AI rubric evaluation on submissions.',                       icon: Brain,      tone: 'bg-indigo-50 text-indigo-600' },
  { slug: 'ai-hub',               title: 'AI Hub',                 description: 'Course-specific assistants.',                                icon: Sparkles,   tone: 'bg-teal-50 text-teal-600' },
];

export default function CourseAddonsPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-by-code', code],
    enabled: !!code,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, instructor_id, created_by')
        .ilike('course_code', code!)
        .maybeSingle();
      return data;
    },
  });

  const { data: addons = [] } = useQuery({
    queryKey: ['course-addons', course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_addons')
        .select('addon_slug, is_enabled, config')
        .eq('course_id', course!.id);
      return data ?? [];
    },
  });

  const enabledMap = new Map<string, boolean>(addons.map((a: any) => [a.addon_slug, !!a.is_enabled]));

  const toggle = useMutation({
    mutationFn: async ({ slug, enable }: { slug: string; enable: boolean }) => {
      if (!course?.id || !user) return;
      const { error } = await supabase
        .from('gw_course_addons')
        .upsert({
          course_id: course.id,
          addon_slug: slug,
          is_enabled: enable,
          enabled_by: user.id,
          enabled_at: new Date().toISOString(),
        }, { onConflict: 'course_id,addon_slug' });
      if (error) throw error;
    },
    // Optimistic: flip the switch in the cache immediately so the UI
    // doesn't wait for the write + refetch round trips; roll back on error.
    onMutate: async ({ slug, enable }) => {
      await qc.cancelQueries({ queryKey: ['course-addons', course?.id] });
      const prev = qc.getQueryData(['course-addons', course?.id]);
      qc.setQueryData(['course-addons', course?.id], (old: any) => {
        const rows = Array.isArray(old) ? old : [];
        return rows.some((r: any) => r.addon_slug === slug)
          ? rows.map((r: any) => (r.addon_slug === slug ? { ...r, is_enabled: enable } : r))
          : [...rows, { addon_slug: slug, is_enabled: enable, config: null }];
      });
      return { prev };
    },
    onError: (e: any, _vars, ctx) => {
      qc.setQueryData(['course-addons', course?.id], ctx?.prev);
      toast.error(e?.message || 'Failed.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['course-addons', course?.id] }),
  });

  if (courseLoading) {
    return <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell><div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div></DashboardShell>
    </UniversalLayout>;
  }
  if (!course) {
    return (
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="px-6 py-10 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground text-center">Course not found.</p>
      </div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  const canManage = course.instructor_id === user?.id || course.created_by === user?.id;
  const enabledCount = addons.filter((a: any) => a.is_enabled).length;

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      maxWidth="4xl"
      title={`Add-ons for ${course.title}`}
      subtitle={`Toggle features specific to this class. ${enabledCount} active.`}
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/academy/c/${code}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-xs font-mono text-muted-foreground">{course.course_code}</div>
      </div>

      {!canManage && (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-4 text-sm text-amber-700 bg-amber-50/50 rounded-2xl">
            Only the course instructor can change add-ons. You're viewing read-only.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ADDONS.map((a) => {
          const Icon = a.icon;
          const enabled = enabledMap.get(a.slug) ?? false;
          return (
            <Card key={a.slug} className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0', a.tone)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{a.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  disabled={!canManage}
                  onCheckedChange={(c) => toggle.mutate({ slug: a.slug, enable: c })}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}
