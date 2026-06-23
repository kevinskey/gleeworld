// Shared editor hook used by both PublicPageEditor (/admin/public-page) and
// FanPageEditor (/admin/fan-page). The two pages have the same block builder
// UI but talk to different Supabase tables + RPCs; this hook isolates that
// difference so the UI component stays clean.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { arrayMove } from '@dnd-kit/sortable';
import { getBlockModule } from '@/components/public-site/registry';
import { themeSchema, type SiteBlock, type SiteTheme } from '@/components/public-site/types';

// Returns true when any value in the config tree is a browser blob: URL.
// Lets the editor skip DB persistence during an in-progress upload.
function containsBlobUrl(v: unknown): boolean {
  if (typeof v === 'string') return v.startsWith('blob:');
  if (Array.isArray(v)) return v.some(containsBlobUrl);
  if (v && typeof v === 'object') return Object.values(v as Record<string, unknown>).some(containsBlobUrl);
  return false;
}

export interface BlockPageEditorOptions {
  /** Postgres table holding the published-site row (with theme/published_blocks). */
  pageTable: string;
  /** Postgres table holding the draft block rows. */
  blocksTable: string;
  /** SECURITY DEFINER RPC that creates the row + seeds starter blocks. */
  activateRpc: string;
  /** React Query keys so cache invalidation stays scoped to this page. */
  pageQueryKey: string;
  blocksQueryKey: string;
}

export interface BlockPageRow {
  id: string;
  tenant_id: string;
  theme: Record<string, unknown>;
  is_published: boolean;
  published_at: string | null;
}

export function useBlockPageEditor(opts: BlockPageEditorOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Single debounced auto-republish handle. Any mutation while
  // `is_published` is already true triggers a re-snapshot to
  // `published_blocks` so anonymous visitors see edits within ~600ms
  // without the admin having to click Publish for every typo.
  const autoPublishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: page, isLoading: pageLoading } = useQuery<BlockPageRow | null>({
    queryKey: [opts.pageQueryKey],
    queryFn: async () => {
      const { data, error } = await supabase.from(opts.pageTable).select('*').maybeSingle();
      if (error) throw error;
      return data as BlockPageRow | null;
    },
  });

  const { data: dbBlocks } = useQuery<SiteBlock[]>({
    queryKey: [opts.blocksQueryKey],
    enabled: !!page,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(opts.blocksTable)
        .select('id, block_type, position, config, is_visible')
        .order('position');
      if (error) throw error;
      return data as SiteBlock[];
    },
  });

  useEffect(() => {
    if (dbBlocks) setBlocks(dbBlocks);
  }, [dbBlocks]);

  const [pendingTheme, setPendingTheme] = useState<SiteTheme | null>(null);
  const themeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme: SiteTheme = useMemo(() => {
    if (pendingTheme) return pendingTheme;
    const parsed = themeSchema.safeParse(page?.theme ?? {});
    return parsed.success ? parsed.data : themeSchema.parse({});
  }, [page?.theme, pendingTheme]);

  const activate = async () => {
    setActivating(true);
    try {
      const { error } = await supabase.rpc(opts.activateRpc);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: [opts.pageQueryKey] });
      await queryClient.invalidateQueries({ queryKey: [opts.blocksQueryKey] });
      toast({ title: 'Page created', description: 'Starter blocks were added.' });
    } catch (e: any) {
      toast({ title: 'Could not create page', description: e.message, variant: 'destructive' });
    } finally {
      setActivating(false);
    }
  };

  const persistPositions = async (ordered: SiteBlock[]) => {
    await Promise.all(
      ordered.map((b, i) =>
        b.position === i ? null : supabase.from(opts.blocksTable).update({ position: i }).eq('id', b.id),
      ),
    );
    scheduleAutoRepublish();
  };

  // Debounced re-snapshot of draft blocks → published_blocks. Only fires
  // when the page is already published — unpublished pages stay drafts
  // until the admin explicitly hits Publish. The delay collapses bursts
  // of edits (typing in a Hero headline, dragging blocks around) into a
  // single DB write.
  function scheduleAutoRepublish() {
    if (!page?.is_published) return;
    if (autoPublishTimer.current) clearTimeout(autoPublishTimer.current);
    autoPublishTimer.current = setTimeout(async () => {
      try {
        // Read the latest blocks fresh from the DB so we don't snapshot
        // stale in-memory state if multiple edits raced.
        const { data: latest, error: readErr } = await supabase
          .from(opts.blocksTable)
          .select('id, block_type, position, config, is_visible')
          .order('position');
        if (readErr) throw readErr;
        const snapshot = (latest ?? []).map((b: any, i: number) => ({ ...b, position: i }));
        const { error: writeErr } = await supabase
          .from(opts.pageTable)
          .update({ published_blocks: snapshot, published_at: new Date().toISOString() })
          .eq('id', page.id);
        if (writeErr) throw writeErr;
        queryClient.invalidateQueries({ queryKey: [opts.pageQueryKey] });
      } catch (e: any) {
        // Silent — we don't want a noisy toast on every keystroke.
        // Manual Publish button still surfaces errors loudly.
        console.warn('[useBlockPageEditor] auto-republish failed', e);
      }
    }, 700);
  }

  const onDragEnd = (active: { id: string }, over: { id: string } | null) => {
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      const lockedCount = prev.filter((b) => getBlockModule(b.block_type)?.locked).length;
      if (newIndex < lockedCount) return prev;
      const next = arrayMove(prev, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
      void persistPositions(next);
      return next;
    });
  };

  const updateConfig = (id: string, config: Record<string, unknown>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, config } : b)));
    // Don't persist transient blob: URLs (in-progress uploads). The follow-up
    // call with the real public URL will hit this path and trigger the save.
    if (containsBlobUrl(config)) {
      clearTimeout(saveTimers.current[id]);
      return;
    }
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      const { error } = await supabase.from(opts.blocksTable).update({ config }).eq('id', id);
      if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      else scheduleAutoRepublish();
    }, 600);
  };

  const toggleVisible = async (block: SiteBlock) => {
    const next = !block.is_visible;
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, is_visible: next } : b)));
    await supabase.from(opts.blocksTable).update({ is_visible: next }).eq('id', block.id);
    scheduleAutoRepublish();
  };

  const deleteBlock = async (block: SiteBlock) => {
    setBlocks((prev) => prev.filter((b) => b.id !== block.id));
    if (selectedId === block.id) setSelectedId(null);
    const { error } = await supabase.from(opts.blocksTable).delete().eq('id', block.id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else scheduleAutoRepublish();
  };

  const addBlock = async (type: string) => {
    const mod = getBlockModule(type);
    if (!mod) return;
    // Avoid position collisions after deletes — use max+1 not blocks.length.
    const position = blocks.length === 0 ? 0 : Math.max(...blocks.map((b) => b.position)) + 1;
    const { data, error } = await supabase
      .from(opts.blocksTable)
      .insert({ block_type: type, position, config: mod.defaultConfig, is_visible: true })
      .select('id, block_type, position, config, is_visible')
      .single();
    if (error) {
      toast({ title: 'Could not add block', description: error.message, variant: 'destructive' });
      return null;
    }
    setBlocks((prev) => [...prev, data as SiteBlock]);
    setSelectedId((data as SiteBlock).id);
    scheduleAutoRepublish();
    return data as SiteBlock;
  };

  const updateTheme = (patch: Partial<SiteTheme>) => {
    if (!page) return;
    const next = { ...theme, ...patch };
    setPendingTheme(next);
    if (themeTimer.current) clearTimeout(themeTimer.current);
    themeTimer.current = setTimeout(async () => {
      const { error } = await supabase.from(opts.pageTable).update({ theme: next }).eq('id', page.id);
      if (!error) {
        await queryClient.invalidateQueries({ queryKey: [opts.pageQueryKey] });
        // Theme change updates the page row directly — published readers
        // pick it up from the same row, no snapshot needed. But the
        // published_at stamp drives cache busts elsewhere, so refresh it.
        if (page.is_published) {
          await supabase.from(opts.pageTable).update({ published_at: new Date().toISOString() }).eq('id', page.id);
        }
      }
      setPendingTheme(null);
    }, 400);
  };

  const publish = async () => {
    if (!page) return;
    setPublishing(true);
    try {
      const snapshot = blocks.map((b, i) => ({ ...b, position: i }));
      const { error } = await supabase
        .from(opts.pageTable)
        .update({ published_blocks: snapshot, published_at: new Date().toISOString(), is_published: true })
        .eq('id', page.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [opts.pageQueryKey] });
      toast({ title: 'Published', description: 'Your page is now live.' });
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    if (!page) return;
    const { error } = await supabase.from(opts.pageTable).update({ is_published: false }).eq('id', page.id);
    if (error) {
      toast({ title: 'Unpublish failed', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: [opts.pageQueryKey] });
    toast({ title: 'Unpublished', description: 'Your page is no longer visible.' });
  };

  const resetToTemplate = async () => {
    if (!page) return;
    setResetting(true);
    const del = await supabase.from(opts.blocksTable).delete().eq('tenant_id', page.tenant_id);
    if (del.error) {
      toast({ title: 'Reset failed', description: del.error.message, variant: 'destructive' });
      setResetting(false);
      return;
    }
    const reseed = await supabase.rpc(opts.activateRpc);
    if (reseed.error) {
      toast({ title: 'Reseed failed', description: reseed.error.message, variant: 'destructive' });
      setResetting(false);
      return;
    }
    setSelectedId(null);
    await queryClient.invalidateQueries({ queryKey: [opts.blocksQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [opts.pageQueryKey] });
    setResetting(false);
  };

  return {
    page,
    pageLoading,
    blocks,
    setBlocks,
    selectedId,
    setSelectedId,
    activating,
    publishing,
    resetting,
    theme,
    activate,
    onDragEnd,
    updateConfig,
    toggleVisible,
    deleteBlock,
    addBlock,
    updateTheme,
    publish,
    unpublish,
    resetToTemplate,
  };
}
