// React Query hooks for the Auctions module. Thin wrappers over
// src/lib/auctions/*Api.ts, keyed under ['auctions', …] so a mutation can
// invalidate the whole module coarsely.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createAuction,
  deleteAuction,
  getAuction,
  listAuctions,
  updateAuction,
  type AuctionInput,
  type ListAuctionsOptions,
} from '@/lib/auctions/auctionsApi';
import {
  createSource,
  deleteSource,
  listSources,
  touchSourceRefreshed,
  updateSource,
  type SourceInput,
} from '@/lib/auctions/sourcesApi';
import {
  addToWatchlist,
  getLot,
  listLots,
  listWatchlist,
  removeFromWatchlist,
  type ListLotsOptions,
} from '@/lib/auctions/lotsApi';
import {
  getWhatsAppOptIn,
  optInToWhatsApp,
  optOutOfWhatsApp,
} from '@/lib/auctions/whatsappApi';
import {
  createSavedSearch,
  deleteSavedSearch,
  dismissMatch,
  listMatches,
  listSavedSearches,
  restoreMatch,
  updateSavedSearch,
  type SavedSearchInput,
} from '@/lib/auctions/searchesApi';

const KEY = 'auctions';

function reportError(action: string) {
  return (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    toast.error(`Could not ${action}`, { description: message });
  };
}

export function useAuctionSources(includeInactive = false) {
  return useQuery({
    queryKey: [KEY, 'sources', { includeInactive }],
    queryFn: () => listSources(includeInactive),
  });
}

export function useAuctions(opts: ListAuctionsOptions = {}) {
  return useQuery({
    queryKey: [KEY, 'auctions', opts],
    queryFn: () => listAuctions(opts),
  });
}

export function useAuction(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'auction', id],
    queryFn: () => getAuction(id as string),
    enabled: Boolean(id),
  });
}

export function useSourceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY] });

  const create = useMutation({
    mutationFn: (input: SourceInput) => createSource(input),
    onSuccess: () => { invalidate(); toast.success('Auction house added'); },
    onError: reportError('add that auction house'),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SourceInput> }) => updateSource(id, patch),
    onSuccess: () => { invalidate(); toast.success('Auction house updated'); },
    onError: reportError('update that auction house'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: () => { invalidate(); toast.success('Auction house deleted'); },
    onError: reportError('delete that auction house'),
  });

  const markRefreshed = useMutation({
    mutationFn: (id: string) => touchSourceRefreshed(id),
    onSuccess: () => { invalidate(); toast.success('Marked as checked just now'); },
    onError: reportError('update that auction house'),
  });

  return { create, update, remove, markRefreshed };
}

export function useLots(opts: ListLotsOptions = {}) {
  return useQuery({
    queryKey: [KEY, 'lots', opts],
    queryFn: () => listLots(opts),
  });
}

export function useLot(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'lot', id],
    queryFn: () => getLot(id as string),
    enabled: Boolean(id),
  });
}

export function useWatchlist() {
  return useQuery({
    queryKey: [KEY, 'watchlist'],
    queryFn: () => listWatchlist(),
  });
}

export function useWatchlistMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY, 'watchlist'] });

  const add = useMutation({
    mutationFn: (lotId: string) => addToWatchlist(lotId),
    onSuccess: () => { invalidate(); toast.success('Added to your watchlist'); },
    onError: reportError('add that lot to your watchlist'),
  });

  const remove = useMutation({
    mutationFn: (lotId: string) => removeFromWatchlist(lotId),
    onSuccess: () => { invalidate(); toast.success('Removed from your watchlist'); },
    onError: reportError('remove that lot from your watchlist'),
  });

  return { add, remove };
}

export function useSavedSearches() {
  return useQuery({
    queryKey: [KEY, 'saved-searches'],
    queryFn: () => listSavedSearches(),
  });
}

export function useSavedSearchMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY] });

  const create = useMutation({
    mutationFn: (input: SavedSearchInput) => createSavedSearch(input),
    onSuccess: () => { invalidate(); toast.success('Saved search created'); },
    onError: reportError('save that search'),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SavedSearchInput> }) =>
      updateSavedSearch(id, patch),
    onSuccess: () => { invalidate(); toast.success('Saved search updated'); },
    onError: reportError('update that saved search'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSavedSearch(id),
    onSuccess: () => { invalidate(); toast.success('Saved search deleted'); },
    onError: reportError('delete that saved search'),
  });

  return { create, update, remove };
}

export function useWhatsAppOptIn() {
  return useQuery({
    queryKey: [KEY, 'whatsapp-optin'],
    queryFn: () => getWhatsAppOptIn(),
  });
}

export function useWhatsAppMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY, 'whatsapp-optin'] });

  const optIn = useMutation({
    mutationFn: (phoneE164: string) => optInToWhatsApp(phoneE164),
    onSuccess: () => { invalidate(); toast.success('WhatsApp alerts turned on'); },
    onError: reportError('turn on WhatsApp alerts'),
  });

  const optOut = useMutation({
    mutationFn: () => optOutOfWhatsApp(),
    onSuccess: () => { invalidate(); toast.success('WhatsApp alerts turned off'); },
    onError: reportError('turn off WhatsApp alerts'),
  });

  return { optIn, optOut };
}

export function useMatches(includeDismissed = false) {
  return useQuery({
    queryKey: [KEY, 'matches', { includeDismissed }],
    queryFn: () => listMatches(includeDismissed),
  });
}

export function useMatchMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY, 'matches'] });

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissMatch(id),
    onSuccess: () => { invalidate(); toast.success('Match dismissed'); },
    onError: reportError('dismiss that match'),
  });

  const restore = useMutation({
    mutationFn: (id: string) => restoreMatch(id),
    onSuccess: () => { invalidate(); toast.success('Match restored'); },
    onError: reportError('restore that match'),
  });

  return { dismiss, restore };
}

export function useAuctionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY] });

  const create = useMutation({
    mutationFn: (input: AuctionInput) => createAuction(input),
    onSuccess: () => { invalidate(); toast.success('Auction added'); },
    onError: reportError('add that auction'),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AuctionInput> }) => updateAuction(id, patch),
    onSuccess: () => { invalidate(); toast.success('Auction updated'); },
    onError: reportError('update that auction'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAuction(id),
    onSuccess: () => { invalidate(); toast.success('Auction deleted'); },
    onError: reportError('delete that auction'),
  });

  return { create, update, remove };
}
