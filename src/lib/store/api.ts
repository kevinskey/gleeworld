import { useMutation, useQuery, type Query, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreScoreRow {
  id: string;
  partner_id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  ensemble_type: string | null;
  difficulty_grade: string | null;
  description: string | null;
  tags: string[] | null;
  price_cents: number;
  currency: string;
  thumbnail_storage_path: string | null;
  sample_audio_storage_path: string | null;
  page_count: number | null;
  status: string;
  partner: { display_name: string; logo_storage_path: string | null } | null;
}

export interface StorePartner {
  id: string;
  display_name: string;
  bio: string | null;
  website_url: string | null;
  logo_storage_path: string | null;
  status: string;
}

export interface OrderStatusRow {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  items: Array<{
    id: string;
    partner_score_id: string;
    watermarked_storage_path: string | null;
    title?: string | null;
  }>;
}

export function platformFeeCents(priceCents: number): number {
  return Math.floor(priceCents / 2);
}

export function useStoreScores(params?: { partnerId?: string }): UseQueryResult<StoreScoreRow[]> {
  return useQuery({
    queryKey: ['store-scores', params?.partnerId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('gw_partner_scores')
        .select('*, partner:gw_partners(display_name, logo_storage_path)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (params?.partnerId) q = q.eq('partner_id', params.partnerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StoreScoreRow[];
    },
  });
}

export function useStoreScore(id: string | undefined): UseQueryResult<StoreScoreRow | null> {
  return useQuery({
    queryKey: ['store-score', id ?? ''],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('gw_partner_scores')
        .select('*, partner:gw_partners(display_name, logo_storage_path)')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      return (data as StoreScoreRow | null) ?? null;
    },
  });
}

export function useStorePartner(id: string | undefined): UseQueryResult<StorePartner | null> {
  return useQuery({
    queryKey: ['store-partner', id ?? ''],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('gw_partners_public')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as StorePartner | null) ?? null;
    },
  });
}

export function useCreateCheckout(): UseMutationResult<{ url: string; order_id: string }, Error, { partner_score_ids: string[] }> {
  return useMutation({
    mutationFn: async ({ partner_score_ids }) => {
      const { data, error } = await supabase.functions.invoke(
        'partner-checkout-create',
        { body: { items: partner_score_ids.map((id) => ({ partner_score_id: id })) } },
      );
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data as { url: string; order_id: string };
    },
  });
}

export function useOrderStatus(orderId: string | undefined): UseQueryResult<OrderStatusRow | null> {
  return useQuery({
    queryKey: ['order-status', orderId ?? ''],
    enabled: !!orderId,
    refetchInterval: (query: Query<OrderStatusRow | null, Error>) => {
      const d = query.state.data as OrderStatusRow | null | undefined;
      if (!d) return 3000;
      const allReady = d.status === 'paid' && d.items.every((i) => !!i.watermarked_storage_path);
      return allReady ? false : 3000;
    },
    queryFn: async () => {
      if (!orderId) return null;
      const { data: order, error } = await supabase
        .from('gw_partner_orders')
        .select('id, status')
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw error;
      if (!order) return null;
      const { data: items, error: itemsError } = await supabase
        .from('gw_partner_order_items')
        .select('id, partner_score_id, watermarked_storage_path')
        .eq('order_id', orderId);
      if (itemsError) throw itemsError;
      const enriched = (items ?? []).map((i) => ({ ...i }));
      return {
        id: order.id,
        status: order.status as OrderStatusRow['status'],
        items: enriched as OrderStatusRow['items'],
      };
    },
  });
}

export function useDownloadUrl(): UseMutationResult<{ url: string }, Error, { order_item_id: string }> {
  return useMutation({
    mutationFn: async ({ order_item_id }) => {
      const { data, error } = await supabase.functions.invoke(
        'partner-download-url',
        { body: { order_item_id } },
      );
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data as { url: string };
    },
  });
}
