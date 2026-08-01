import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Partner {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  website_url: string | null;
  contact_email: string | null;
  logo_storage_path: string | null;
  stripe_connect_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  status: 'invited' | 'onboarding' | 'active' | 'suspended';
  invited_at: string | null;
  activated_at: string | null;
  created_at: string;
  owner_photo_storage_path: string | null;
  history: string | null;
  featured_order: number | null;
}

export interface PartnerScore {
  id: string;
  partner_id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  ensemble_type: string | null;
  difficulty_grade: string | null;
  language: string | null;
  description: string | null;
  tags: string[] | null;
  price_cents: number;
  currency: string;
  master_storage_path: string;
  thumbnail_storage_path: string | null;
  sample_audio_storage_path: string | null;
  page_count: number | null;
  status: 'draft' | 'published' | 'unlisted' | 'removed';
  created_at: string;
  updated_at: string;
  partner_featured_order: number | null;
  gw_featured_order: number | null;
}

export interface PartnerInvite {
  id: string;
  email: string;
  display_name: string | null;
  invited_by: string | null;
  token: string;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
  created_at: string;
}

// Flat 50% platform fee. Payout absorbs any 1-cent remainder so
// platform_fee + partner_payout ALWAYS equals price.
export function platformFeeCents(priceCents: number): number {
  return Math.floor(priceCents / 2);
}
export function partnerPayoutCents(priceCents: number): number {
  return priceCents - platformFeeCents(priceCents);
}

export function useMyPartner(): UseQueryResult<Partner | null> {
  return useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => {
      const { data: partnerId, error: idErr } = await supabase.rpc('my_partner_id');
      if (idErr) throw idErr;
      if (!partnerId) return null;
      const { data, error } = await supabase
        .from('gw_partners')
        .select('*')
        .eq('id', partnerId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as Partner | null) ?? null;
    },
  });
}

export function useMyPartnerScores(status?: PartnerScore['status']): UseQueryResult<PartnerScore[]> {
  return useQuery({
    queryKey: ['my-partner-scores', status ?? 'all'],
    queryFn: async () => {
      const { data: partnerId, error: idErr } = await supabase.rpc('my_partner_id');
      if (idErr) throw idErr;
      if (!partnerId) return [];
      let q = supabase
        .from('gw_partner_scores')
        .select('*')
        .eq('partner_id', partnerId as string)
        .order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PartnerScore[];
    },
  });
}

interface UpdateSelfArgs {
  display_name: string;
  bio: string | null;
  website_url: string | null;
  contact_email: string | null;
  logo_storage_path: string | null;
  owner_photo_storage_path: string | null;
  history: string | null;
}

export function useUpdateMyPartner(): UseMutationResult<Partner, Error, UpdateSelfArgs> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      const { data, error } = await supabase.rpc('partner_update_self', {
        p_display_name: args.display_name,
        p_bio: args.bio,
        p_website_url: args.website_url,
        p_contact_email: args.contact_email,
        p_logo_storage_path: args.logo_storage_path,
        p_owner_photo_storage_path: args.owner_photo_storage_path,
        p_history: args.history,
      });
      if (error) throw error;
      return data as Partner;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner'] }),
  });
}

export function useInvitePartner(): UseMutationResult<{ id: string; token: string }, Error, { email: string; display_name?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      const { data, error } = await supabase.functions.invoke<{ id: string; token: string }>(
        'partner-invite-send', { body: args }
      );
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-invites'] }),
  });
}

export function useListPartnerInvites(): UseQueryResult<PartnerInvite[]> {
  return useQuery({
    queryKey: ['partner-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_partner_invites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PartnerInvite[];
    },
  });
}

export function useListPartners(): UseQueryResult<Partner[]> {
  return useQuery({
    queryKey: ['partners-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_partners')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Partner[];
    },
  });
}

export function useStartConnectOnboarding(): UseMutationResult<{ onboarding_url: string }, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'partner-connect-onboarding', { body: {} });
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data as { onboarding_url: string };
    },
  });
}

interface ConnectRefreshResult {
  status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  express_dashboard_url: string | null;
}
export function useRefreshConnectStatus(): UseMutationResult<ConnectRefreshResult, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'partner-connect-refresh', { body: {} });
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data as ConnectRefreshResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner'] }),
  });
}

export interface CreateScoreArgs {
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  ensemble_type: string | null;
  difficulty_grade: string | null;
  description: string | null;
  tags: string[] | null;
  price_cents: number;
  master_storage_path: string;
}

export function useCreatePartnerScore(): UseMutationResult<{ id: string }, Error, CreateScoreArgs> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      // Partner id resolves via RLS (partner_id = my_partner_id()).
      // Explicit partner_id fetch avoids the client sending a wrong value.
      const { data: me } = await supabase.rpc('my_partner_id');
      const partnerId = me as string | null;
      if (!partnerId) throw new Error('not a partner');

      const { data, error } = await supabase.from('gw_partner_scores').insert({
        partner_id: partnerId,
        title: args.title,
        composer: args.composer,
        arranger: args.arranger,
        voicing: args.voicing,
        ensemble_type: args.ensemble_type,
        difficulty_grade: args.difficulty_grade,
        description: args.description,
        tags: args.tags,
        price_cents: args.price_cents,
        master_storage_path: args.master_storage_path,
        status: 'draft',
      }).select('id').single();
      if (error) throw error;

      // Fire-and-forget postprocess. Errors don't block the create.
      supabase.functions.invoke('partner-score-postprocess', { body: { score_id: data.id } }).catch(() => {});
      return { id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner-scores'] }),
  });
}

export function useUpdatePartnerScoreStatus(): UseMutationResult<{ id: string; status: string }, Error, { id: string; status: 'draft' | 'published' | 'unlisted' | 'removed' }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .update({ status })
        .eq('id', id)
        .select('id, status')
        .single();
      if (error) throw error;
      return data as { id: string; status: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner-scores'] }),
  });
}

// Links the signed-in user to an unclaimed partner row matching their auth
// email. Returns the partner id (existing or newly claimed) or null.
export async function claimPartnerByEmail(): Promise<string | null> {
  const { data, error } = await supabase.rpc('partner_claim_by_email');
  if (error) throw error;
  return (data as string | null) ?? null;
}

// Same as claimPartnerByEmail, but races the rpc against a timeout so a
// hung socket degrades to "not a partner" rather than stranding a caller
// waiting forever. Never throws — errors and timeouts both resolve null.
// Shared by useRoleBasedRedirect and SignInDialog so both post-login paths
// treat a partner claim identically.
export async function claimPartnerByEmailWithTimeout(timeoutMs = 4000): Promise<string | null> {
  try {
    return await Promise.race([
      claimPartnerByEmail(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

export function useSetPartnerScoreFeatured(): UseMutationResult<{ id: string }, Error, { id: string; partner_featured_order: number | null }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, partner_featured_order }) => {
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .update({ partner_featured_order })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-partner-scores'] }),
  });
}

export function useSetPartnerFeatured(): UseMutationResult<{ id: string }, Error, { id: string; featured_order: number | null }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, featured_order }) => {
      const { data, error } = await supabase
        .from('gw_partners')
        .update({ featured_order })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners-admin'] }),
  });
}

export function useSetGwFeaturedScore(): UseMutationResult<{ id: string }, Error, { id: string; gw_featured_order: number | null }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, gw_featured_order }) => {
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .update({ gw_featured_order })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gw-featured-admin'] }),
  });
}

export function useCreatePartnerByEmail(): UseMutationResult<{ id: string }, Error, { display_name: string; contact_email: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      const { data, error } = await supabase
        .from('gw_partners')
        .insert({ display_name: args.display_name, contact_email: args.contact_email, status: 'invited' })
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners-admin'] }),
  });
}
