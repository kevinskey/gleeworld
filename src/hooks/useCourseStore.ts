import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CourseProduct = {
  id: string;
  sku: string;
  name: string;
  level: string | null;
  price_cents: number;
  bundle_key: string | null;
  template_course_id: string | null;
  stripe_price_id: string | null;
};

export type TemplateCourse = {
  id: string;
  slug: string;
  title: string;
  level: string | null;
  grades: string | null;
  description: string | null;
  unit_count: number;
  lesson_count: number;
};

export type AdoptedCourse = {
  id: string;
  title: string;
  level: string | null;
  template_source_id: string | null;
  created_at: string;
};

export function useCourseProducts() {
  return useQuery({
    queryKey: ['course-products'],
    queryFn: async (): Promise<CourseProduct[]> => {
      const { data, error } = await supabase
        .from('gw_course_product')
        .select('id, sku, name, level, price_cents, bundle_key, template_course_id, stripe_price_id')
        .eq('active', true)
        .order('price_cents');
      if (error) throw error;
      return (data ?? []) as CourseProduct[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Product ids the current tenant owns (RLS scopes to tenant). */
export function useOwnedProductIds() {
  return useQuery({
    queryKey: ['course-entitlements'],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.from('gw_tenant_entitlement').select('product_id');
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.product_id as string));
    },
  });
}

export function useTemplateCourses() {
  return useQuery({
    queryKey: ['template-courses'],
    queryFn: async (): Promise<TemplateCourse[]> => {
      const { data, error } = await supabase
        .from('gw_academy_courses')
        .select('id, slug, title, level, grades, description, gw_academy_units(id, gw_academy_lessons(id))')
        .eq('is_template', true)
        .order('created_at');
      if (error) throw error;
      return (data ?? []).map((c) => {
        const units = (c.gw_academy_units ?? []) as { gw_academy_lessons: { id: string }[] }[];
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          level: c.level,
          grades: c.grades,
          description: c.description,
          unit_count: units.length,
          lesson_count: units.reduce((n, u) => n + (u.gw_academy_lessons?.length ?? 0), 0),
        };
      });
    },
    staleTime: 5 * 60_000,
  });
}

/** Courses already adopted into (or created in) this tenant's workspace. */
export function useTenantCourses() {
  return useQuery({
    queryKey: ['tenant-academy-courses'],
    queryFn: async (): Promise<AdoptedCourse[]> => {
      const { data, error } = await supabase
        .from('gw_academy_courses')
        .select('id, title, level, template_source_id, created_at')
        .eq('is_template', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdoptedCourse[];
    },
  });
}

export function useAdoptCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateCourseId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('adopt_template_course', {
        p_template_course_id: templateCourseId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-academy-courses'] }),
  });
}

export async function startCourseCheckout(sku: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-course-checkout', {
    body: {
      sku,
      success_url: `${window.location.origin}/dashboard?course_purchased=${sku}`,
      cancel_url: `${window.location.origin}/dashboard?course_cancelled=${sku}`,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No checkout URL returned');
  return data.url as string;
}

export const LEVEL_LABEL: Record<string, string> = {
  elementary: 'Elementary',
  middle_school: 'Middle School',
  high_school: 'High School',
  college: 'College',
};

export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
