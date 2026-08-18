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
