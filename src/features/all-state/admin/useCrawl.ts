// Crawl pipeline hooks: run crawls, list pending changes, review them.
// Platform-staff surface; RLS on the pipeline tables is is_platform_owner().

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

export interface PendingChange {
  id: string;
  change_type: 'date_not_found' | 'season_rollover' | 'source_error';
  previous_value: string | null;
  new_value: string | null;
  detail: string | null;
  detected_at: string;
  date_id: string | null;
  state?: { name: string; slug: string } | null;
  source?: { url: string } | null;
}

const KEY = 'all-state-crawl';

export function usePendingChanges() {
  return useQuery<PendingChange[]>({
    queryKey: [KEY, 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_all_state_changes')
        .select('*, state:gw_all_state_states(name,slug), source:gw_all_state_sources(url)')
        .eq('status', 'pending')
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PendingChange[];
    },
  });
}

export function useRunCrawl() {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { state_slug?: string; source_id?: string; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke('all-state-crawl', { body: args });
      if (error) throw error;
      return data as { crawled: number; report: Array<{ status: string; missing?: number }> };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      const changed = d.report.filter((r) => r.status === 'changed').length;
      const missing = d.report.reduce((a, r) => a + (r.missing ?? 0), 0);
      toast({
        title: `Crawled ${d.crawled} source${d.crawled === 1 ? '' : 's'}`,
        description: missing
          ? `${missing} published claim${missing === 1 ? '' : 's'} could not be found — see the review queue.`
          : changed
            ? `${changed} page${changed === 1 ? '' : 's'} changed; all published claims still present.`
            : 'No content changes.',
      });
    },
    onError: (e: Error) => toast({ title: 'Crawl failed', description: e.message, variant: 'destructive' }),
  });
}

/**
 * Review a change. The two verbs mirror the brief:
 * - dismiss: false alarm; the claim stands.
 * - accept, WITH a proposed value: the extractor found the new date on the
 *   page and both verifications passed (its evidence quote appears in the
 *   content, and the date itself is independently findable there). Accepting
 *   applies it — this is the one path by which crawled data reaches the
 *   canon, and it runs through a human every time.
 * - accept, WITHOUT a proposal: the date genuinely vanished. The claim is
 *   DOWNGRADED to 'unverified' — the honest state until re-sourced. Nothing
 *   is deleted; crawls and reviews never overwrite with guesses.
 */
export function useReviewChange() {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ change, action }: { change: PendingChange; action: 'accept' | 'dismiss' }) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (action === 'accept' && change.change_type === 'date_not_found' && change.date_id) {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (change.new_value && /^\d{4}-\d{2}-\d{2}$/.test(change.new_value)) {
          // Apply at local midnight in the claim's own timezone — the same
          // all_day convention the canon uses everywhere else.
          patch.start_at = `${change.new_value}T00:00:00`;
          patch.retrieved_at = new Date().toISOString();
          patch.confidence = 'official_source';
        } else {
          patch.confidence = 'unverified';
        }
        const { error: dErr } = await supabase
          .from('gw_all_state_dates').update(patch).eq('id', change.date_id);
        if (dErr) throw dErr;
      }
      const { data, error } = await supabase
        .from('gw_all_state_changes')
        .update({
          status: action === 'accept' ? 'verified' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userRes?.user?.id ?? null,
        })
        .eq('id', change.id).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Rejected — platform staff only.');
      trackEvent('all_state_change_reviewed', { change_type: change.change_type, action });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['all-state'] });
      toast({
        title: v.action === 'accept' ? 'Accepted' : 'Dismissed',
        description: v.action === 'accept' && v.change.change_type === 'date_not_found'
          ? (v.change.new_value
              ? `Date updated to ${v.change.new_value} from the page's own text.`
              : 'The claim is downgraded to unverified until it is re-sourced.')
          : undefined,
      });
    },
    onError: (e: Error) => toast({ title: "Couldn't review", description: e.message, variant: 'destructive' }),
  });
}
