import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  useCourseProducts,
  useOwnedProductIds,
  useTemplateCourses,
  useTenantCourses,
  useAdoptCourse,
  LEVEL_LABEL,
} from '@/hooks/useCourseStore';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { Loader2, BookOpen, Check, Gift } from 'lucide-react';
import { toast } from 'sonner';

export function CourseLibrarySection({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const navigate = useNavigate();
  const { enabled } = useFeatureFlag('COURSE_STORE');
  const { data: templates = [], isLoading: loadingTemplates } = useTemplateCourses();
  const { data: products = [] } = useCourseProducts();
  const { data: owned = new Set<string>() } = useOwnedProductIds();
  const { data: adopted = [] } = useTenantCourses();
  const adopt = useAdoptCourse();
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const productByCourseId = useMemo(() => {
    const m = new Map<string, (typeof products)[number]>();
    products.forEach((p) => { if (p.template_course_id) m.set(p.template_course_id, p); });
    return m;
  }, [products]);

  const adoptedSourceIds = useMemo(
    () => new Set(adopted.map((c) => c.template_source_id).filter(Boolean)),
    [adopted]
  );

  if (!enabled || (templates.length === 0 && !loadingTemplates)) return null;

  async function handleAdopt(templateId: string, title: string) {
    setAdoptingId(templateId);
    try {
      await adopt.mutateAsync(templateId);
      toast.success(`"${title}" added to your workspace. Find it under My Courses.`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not adopt course');
    } finally {
      setAdoptingId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2
          className="text-lg md:text-xl font-semibold text-foreground"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", textTransform: 'none', letterSpacing: 0 }}
        >
          Course Library
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground">
          Ready-made curriculum you can adopt and customize. Purchased courses copy into your workspace.
        </p>
      </div>

      {loadingTemplates ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((t) => {
            const product = productByCourseId.get(t.id);
            const isOwned = product ? owned.has(product.id) : false;
            const isAdopted = adoptedSourceIds.has(t.id);
            const isAdopting = adoptingId === t.id;
            return (
              <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className="bg-sky-600 text-white border-0 text-[10px]">
                    {t.level ? (LEVEL_LABEL[t.level] ?? t.level) : 'Course'}
                  </Badge>
                  {isAdopted ? (
                    <Badge className="bg-emerald-600 text-white border-0 text-[10px]">
                      <Check className="w-3 h-3 mr-0.5" /> Adopted
                    </Badge>
                  ) : isOwned ? (
                    <Badge className="bg-emerald-600 text-white border-0 text-[10px]">Owned</Badge>
                  ) : null}
                </div>
                <div className="font-semibold text-white mb-1 line-clamp-2">{t.title}</div>
                <div className="text-[11px] text-slate-400 mb-2">
                  {t.unit_count} units · {t.lesson_count} lessons{t.grades ? ` · Grades ${t.grades}` : ''}
                </div>
                {t.description && (
                  <div className="text-xs text-slate-300 line-clamp-3 mb-3">{t.description}</div>
                )}
                <div className="mt-auto pt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-200 hover:bg-slate-700"
                    onClick={() => navigate(`/academy/templates/${t.id}`)}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-sky-600 hover:bg-sky-500 text-white"
                    disabled={isAdopting}
                    onClick={() => handleAdopt(t.id, t.title)}
                  >
                    {isAdopting ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <BookOpen className="w-4 h-4 mr-1.5" />
                    )}
                    {isAdopted ? 'Adopt Again' : 'Adopt'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isSuperAdmin && <GrantCoursePanel />}
    </section>
  );
}

function GrantCoursePanel() {
  const { data: products = [] } = useCourseProducts();
  const { data: tenants = [] } = useQuery({
    queryKey: ['grant-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tenants')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string | null; slug: string }[];
    },
  });
  const [tenantId, setTenantId] = useState('');
  const [sku, setSku] = useState('');
  const [granting, setGranting] = useState(false);

  async function grant() {
    if (!tenantId || !sku) return;
    setGranting(true);
    try {
      const { data, error } = await supabase.rpc('grant_course_entitlement', {
        p_tenant_id: tenantId,
        p_sku: sku,
      });
      if (error) throw error;
      toast.success(`Granted ${sku} (${data} entitlement${data === 1 ? '' : 's'} added)`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Grant failed');
    } finally {
      setGranting(false);
    }
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 border-dashed rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-2">
        <Gift className="w-3.5 h-3.5 text-sky-400" /> Comp a course (super admin)
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5"
        >
          <option value="">Select tenant…</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name || t.slug}</option>
          ))}
        </select>
        <select
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1.5"
        >
          <option value="">Select course…</option>
          {products.map((p) => (
            <option key={p.id} value={p.sku}>{p.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={grant} disabled={!tenantId || !sku || granting} className="bg-sky-600 hover:bg-sky-500 text-white">
          {granting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Gift className="w-4 h-4 mr-1.5" />}
          Grant
        </Button>
      </div>
    </div>
  );
}
