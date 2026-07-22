// /academy/store — browse course templates and adopt them into the
// teacher's tenant. Free templates clone immediately via the adopt RPC;
// paid templates route through Stripe checkout (existing flow).

import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store, GraduationCap, Loader2, Plus, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function CourseStorePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Templates live on the `main` platform tenant, so a direct gw_courses
  // SELECT would be filtered out by tenant_isolation_select. The
  // list_course_templates RPC is SECURITY DEFINER and returns the catalog
  // regardless of which tenant the caller belongs to.
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['course-templates'],
    queryFn: async () => {
      const { data } = await supabase.rpc('list_course_templates');
      return data ?? [];
    },
  });

  const adopt = useMutation({
    mutationFn: async (templateId: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc('adopt_course_template', { p_template_id: templateId });
      if (error) throw error;
      return data as string | null;
    },
    onSuccess: async (newCourseId) => {
      toast.success('Course adopted into your tenant.');
      qc.invalidateQueries({ queryKey: ['teacher-academy-courses'] });
      // Look up the new course's code so we can drop the teacher right into it.
      if (newCourseId) {
        const { data } = await supabase
          .from('gw_courses')
          .select('course_code')
          .eq('id', newCourseId)
          .maybeSingle();
        if (data?.course_code) {
          navigate(`/academy/c/${data.course_code.toLowerCase()}`);
          return;
        }
      }
      navigate('/academy');
    },
    onError: (e: any) => {
      const code = (e?.message || '').toLowerCase();
      if (code.includes('demo_viewer_cannot_adopt')) {
        toast.error("This is a read-only demo account — adopting templates isn't available here.");
      } else if (code.includes('admin_required_to_adopt')) {
        toast.error('Only an admin can add a class. Ask your director to adopt this template.');
      } else if (code.includes('not_authenticated')) {
        toast.error('Please sign in to adopt a template.');
      } else if (code.includes('template_not_found')) {
        toast.error('This template is no longer available.');
      } else {
        toast.error(e?.message || 'Adopt failed.');
      }
    },
  });

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Course Store"
      subtitle="Adopt a pre-built course into your tenant. You can edit everything after."
      actions={
        <Button size="sm" onClick={() => navigate('/academy/new')}>
          <Plus className="w-4 h-4 mr-1.5" /> Build from scratch
        </Button>
      }
    >
      {isLoading ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center space-y-3">
            <Store className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No course templates published yet. Check back soon, or build your own from scratch.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: any) => (
            <Card key={t.id} className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 inline-flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-muted-foreground">{t.course_code}</div>
                    <div className="font-semibold leading-tight">{t.title}</div>
                  </div>
                </div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">{t.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-3 border-t">
                  <Badge variant="outline" className="text-xs">Free</Badge>
                  <Button
                    size="sm"
                    onClick={() => adopt.mutate(t.id)}
                    disabled={adopt.isPending}
                  >
                    {adopt.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                    Adopt
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}
