import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeeTemplateInstallment {
  id: string;
  template_id: string;
  sequence: number;
  amount: number;
  due_date: string;
}

export interface FeeTemplate {
  id: string;
  tenant_id: string;
  category: 'dues' | 'wardrobe' | 'trip' | 'travel' | 'other';
  name: string;
  description: string | null;
  total_amount: number;
  currency: string;
  due_date: string | null;
  allow_self_serve_split: boolean;
  context_type: 'trip' | 'wardrobe_item' | 'semester' | null;
  context_id: string | null;
  installments: FeeTemplateInstallment[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateFeeTemplateInput {
  category: FeeTemplate['category'];
  name: string;
  description?: string;
  total_amount: number;
  due_date?: string;
  allow_self_serve_split?: boolean;
  context_type?: FeeTemplate['context_type'];
  context_id?: string;
  installments?: { sequence: number; amount: number; due_date: string }[];
}

export const useFeeTemplates = () => {
  const [loading, setLoading] = useState(false);

  const listTemplates = useCallback(async (filters?: {
    category?: FeeTemplate['category'];
    contextType?: string;
    contextId?: string;
    includeArchived?: boolean;
  }): Promise<FeeTemplate[]> => {
    let query = supabase
      .from('gw_fee_templates')
      .select('*, installments:gw_fee_template_installments(*)')
      .order('created_at', { ascending: false });

    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.contextType) query = query.eq('context_type', filters.contextType);
    if (filters?.contextId) query = query.eq('context_id', filters.contextId);
    if (!filters?.includeArchived) query = query.is('archived_at', null);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as FeeTemplate[];
  }, []);

  const createTemplate = useCallback(async (input: CreateFeeTemplateInput): Promise<FeeTemplate> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: tpl, error: tplErr } = await supabase
        .from('gw_fee_templates')
        .insert({
          category: input.category,
          name: input.name,
          description: input.description ?? null,
          total_amount: input.total_amount,
          due_date: input.due_date ?? null,
          allow_self_serve_split: input.allow_self_serve_split ?? true,
          context_type: input.context_type ?? null,
          context_id: input.context_id ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (tplErr || !tpl) throw tplErr ?? new Error('Template insert failed');

      let installments: FeeTemplateInstallment[] = [];
      if (input.installments?.length) {
        const rows = input.installments.map(i => ({ template_id: tpl.id, ...i }));
        const { data: ins, error: insErr } = await supabase
          .from('gw_fee_template_installments')
          .insert(rows)
          .select();
        if (insErr) throw insErr;
        installments = (ins ?? []) as FeeTemplateInstallment[];
      }

      return { ...(tpl as object), installments } as FeeTemplate;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTemplate = useCallback(async (
    id: string,
    patch: Partial<CreateFeeTemplateInput>,
  ): Promise<FeeTemplate> => {
    const { data, error } = await supabase.rpc('update_fee_template', {
      p_template_id: id,
      p_patch: patch as Record<string, unknown>,
    });

    if (error || !data) throw error ?? new Error('Update failed');

    const { data: installments } = await supabase
      .from('gw_fee_template_installments')
      .select('*')
      .eq('template_id', id);

    return { ...(data as object), installments: installments ?? [] } as FeeTemplate;
  }, []);

  const archiveTemplate = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('gw_fee_templates')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }, []);

  const refetch = useCallback(() => {
    // Signals callers to re-invoke listTemplates; actual data re-fetch is
    // caller-driven because listTemplates returns a Promise rather than
    // managing its own reactive state.
  }, []);

  return { loading, listTemplates, createTemplate, updateTemplate, archiveTemplate, refetch };
};
