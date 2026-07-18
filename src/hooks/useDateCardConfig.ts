// Reads and writes the tenant's date card choice on gw_branding_settings.
// NEVER send tenant_id — set_tenant_id_default() supplies it. Malformed
// stored JSON degrades to the plain default rather than throwing.
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDateCardModule, DEFAULT_DATE_CARD_TYPE } from '@/components/home/date-card/registry';
import type { DateCardSetting } from '@/components/home/date-card/types';

export const DEFAULT_DATE_CARD_SETTING: DateCardSetting = {
  v: 1, type: DEFAULT_DATE_CARD_TYPE, config: {},
};

export function parseDateCardSetting(raw: unknown): DateCardSetting {
  if (!raw || typeof raw !== 'object') return DEFAULT_DATE_CARD_SETTING;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return DEFAULT_DATE_CARD_SETTING;
  if (typeof o.type !== 'string' || !getDateCardModule(o.type)) return DEFAULT_DATE_CARD_SETTING;
  const config = (o.config && typeof o.config === 'object')
    ? (o.config as Record<string, unknown>)
    : {};
  return { v: 1, type: o.type, config };
}

export function useDateCardConfig() {
  const qc = useQueryClient();

  const { data: setting = DEFAULT_DATE_CARD_SETTING, isLoading, refetch } = useQuery<DateCardSetting>({
    queryKey: ['date-card-setting'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_branding_settings')
        .select('date_card')
        .maybeSingle();
      if (error) throw error;
      return parseDateCardSetting((data as { date_card?: unknown } | null)?.date_card);
    },
  });

  const save = useCallback(async (next: DateCardSetting) => {
    const { error } = await supabase
      .from('gw_branding_settings')
      .upsert({ date_card: next, updated_at: new Date().toISOString() });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['date-card-setting'] });
  }, [qc]);

  return { setting, loading: isLoading, save, refetch };
}
