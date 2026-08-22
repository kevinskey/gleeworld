// Tenant public landing page builder (/admin/public-page). Blocks live in
// gw_site_blocks (draft); Publish snapshots them into gw_public_sites.published_blocks,
// which is the only thing anonymous visitors can read via get_public_site().
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Eye,
  EyeOff,
  GripVertical,
  Globe,
  Lock,
  Plus,
  Rocket,
  Trash2,
  Check,
  X,
  ExternalLink,
  Monitor,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BLOCK_LIST, getBlockModule, isBlockAvailable, isBlockOfferedToTenant } from '@/components/public-site/registry';
import { AutoForm } from '@/components/public-site/AutoForm';
import { BlockFrame } from '@/components/public-site/BlockFrame';
import { fontStack, FONT_OPTIONS, safeConfig, themeCssVars, themeSchema, type SiteBlock, type SiteRenderContext, type SiteTheme } from '@/components/public-site/types';
import { PACKAGE_LIST, type TemplatePackage } from '@/components/public-site/packages';

interface SiteRow {
  id: string;
  slug: string;
  theme: Record<string, unknown>;
  is_published: boolean;
  published_at: string | null;
}

// Returns true when any value in the config tree is a browser blob: URL.
// Used to skip DB persistence during an in-progress upload — the value gets
// replaced with the real public URL once the upload completes and the URL
// is verified reachable.
function containsBlobUrl(v: unknown): boolean {
  if (typeof v === 'string') return v.startsWith('blob:');
  if (Array.isArray(v)) return v.some(containsBlobUrl);
  if (v && typeof v === 'object') return Object.values(v as Record<string, unknown>).some(containsBlobUrl);
  return false;
}

// Site design choices, kept next to the panel that renders them. Hints show
// the resolved width so "Normal" is legible as a measurement, not a vibe —
// tenants asking for a specific column width shouldn't have to guess which
// label maps to it. Values must stay in sync with CONTENT_MAX in
// components/public-site/types.ts.
const CONTENT_WIDTH_OPTIONS: { value: SiteTheme['contentWidth']; label: string; hint: string }[] = [
  { value: 'narrow', label: 'Narrow', hint: '960' },
  { value: 'normal', label: 'Normal', hint: '1152' },
  { value: 'wide', label: 'Wide', hint: '1400' },
  { value: 'full', label: 'Full', hint: '100%' },
];
const SIDE_GUTTER_OPTIONS: { value: SiteTheme['sideGutter']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'snug', label: 'Snug' },
  { value: 'normal', label: 'Normal' },
  { value: 'roomy', label: 'Roomy' },
];
const SECTION_PADDING_OPTIONS: { value: SiteTheme['sectionPaddingScale']; label: string }[] = [
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'generous', label: 'Generous' },
  { value: 'spacious', label: 'Spacious' },
];

// A single row in the sidebar Layers panel. Compact — no inline edit form
// (structured settings live in the left-side Sheet, opened from the canvas
// toolbar). Clicking the name selects the block on the canvas and scrolls it
// into view.
function SortableBlockRow({
  block,
  selected,
  onSelect,
  onToggle,
  onDelete,
}: {
  block: SiteBlock;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const mod = getBlockModule(block.block_type);
  const locked = !!mod?.locked;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: locked,
  });
  if (!mod) return null;
  const Icon = mod.icon;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-60' : ''}
    >
      <div
        className={`flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 ${
          selected ? 'border-primary ring-1 ring-primary' : 'border-border'
        } ${isDragging ? 'shadow-lg' : ''}`}
      >
        {locked ? (
          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground touch-none"
            aria-label="Reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onSelect} className="flex items-center gap-2 flex-1 text-left min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-sm truncate">{mod.name}</span>
        </button>
        {!locked && (
          <>
            <button
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle visibility"
            >
              {block.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PublicPageEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings: branding } = useBrandingSettings();
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // When set, opens the right-side settings Sheet for that block. Kept
  // separate from selectedId so the canvas can stay in a "block selected"
  // state without the sheet being open.
  const [settingsOpenId, setSettingsOpenId] = useState<string | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [activating, setActivating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [packagePickerOpen, setPackagePickerOpen] = useState(false);
  const [applyingPackage, setApplyingPackage] = useState<string | null>(null);
  // Package staged for confirmation. Applying one DELETEs every block the
  // tenant has, so the click can't go straight through to applyPackage —
  // "Change look" sounds cosmetic and read as safe, and it silently wiped a
  // configured hero (Kevin, 2026-08-04). Nothing is destroyed until the
  // dialog is confirmed.
  const [pendingPackage, setPendingPackage] = useState<TemplatePackage | null>(null);
  // Pre-apply snapshot of the block list, kept so the success toast can offer
  // a real Undo. Held in state (not localStorage) deliberately: it's an
  // in-session safety net, and a stale cross-session snapshot restoring over
  // newer work would be its own data-loss bug.
  const [undoBlocks, setUndoBlocks] = useState<SiteBlock[] | null>(null);
  const [restoring, setRestoring] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const { data: site, isLoading: siteLoading } = useQuery<SiteRow | null>({
    queryKey: ['gw_public_sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gw_public_sites').select('*').maybeSingle();
      if (error) throw error;
      return data as SiteRow | null;
    },
  });

  const { data: dbBlocks } = useQuery<SiteBlock[]>({
    queryKey: ['gw_site_blocks'],
    enabled: !!site,
    queryFn: async () => {
      // This editor edits the HOME page. Other pages (e.g. the retirement
      // concert page) keep their own rows; loading them here interleaved
      // two headers in the Layers list and let Publish flatten every page
      // into one.
      const { data, error } = await supabase
        .from('gw_site_blocks')
        .select('id, block_type, position, config, is_visible, page')
        .or('page.is.null,page.eq.home')
        .order('position');
      if (error) throw error;
      return data as SiteBlock[];
    },
  });

  const { data: subs = [] } = useQuery<Array<{ module_id: string; status: string }>>({
    queryKey: ['gw_tenant_subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gw_tenant_subscriptions').select('module_id, status');
      if (error) throw error;
      return data ?? [];
    },
  });
  const activeAddons = useMemo(
    () => subs.filter((s) => s.status === 'active').map((s) => s.module_id),
    [subs],
  );

  useEffect(() => {
    if (dbBlocks) setBlocks(dbBlocks);
  }, [dbBlocks]);
  useEffect(() => {
    if (site) setSlugDraft(site.slug);
  }, [site]);

  const [pendingTheme, setPendingTheme] = useState<SiteTheme | null>(null);
  const themeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview device + auto-fit scaling. The published site is rendered at
  // a fixed "device" width (1280 desktop / 390 phone). The scale factor
  // that shrinks that to fit the preview column is computed by the
  // BROWSER via a CSS container query (100cqi = 100% of the container's
  // inline size), so it's pixel-perfect on first paint — no JS timing
  // race where the initial render used scale=1 and overflowed before a
  // ResizeObserver could set the real width.
  //
  // The transformed inner still needs its unscaled height measured (CSS
  // container queries can't do that yet) so we set the outer wrapper's
  // `--inner-h` var from a JS observer; the wrapper's height is a CSS
  // `calc(var(--inner-h) * var(--scale))` so vertical scroll tracks the
  // scaled content.
  const [device, setDevice] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop';
  });
  const previewInnerRef = useRef<HTMLDivElement | null>(null);
  const [previewInnerHeight, setPreviewInnerHeight] = useState(0);
  useLayoutEffect(() => {
    const el = previewInnerRef.current;
    if (!el) return;
    setPreviewInnerHeight(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(([entry]) => setPreviewInnerHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const deviceWidth = device === 'desktop' ? 1280 : 390;

  const theme: SiteTheme = useMemo(() => {
    // Palette + font come from Workspace Settings → Branding (single source
    // of truth); page theme keeps package / radius / section-padding / divider
    // knobs. Empty-string branding values fall through to schema defaults.
    const base = pendingTheme ?? (() => {
      const parsed = themeSchema.safeParse(site?.theme ?? {});
      return parsed.success ? parsed.data : themeSchema.parse({});
    })();
    return {
      ...base,
      primaryColor: (branding as { primary_color?: string }).primary_color || base.primaryColor,
      accentColor: (branding as { accent_color?: string | null }).accent_color || base.accentColor,
      fontFamily: (branding as { font_family?: string | null }).font_family || base.fontFamily,
      letterSpacing: (branding as { letter_spacing?: number | null }).letter_spacing ?? base.letterSpacing,
    };
  }, [site?.theme, pendingTheme, branding]);

  const ctx: SiteRenderContext = useMemo(
    () => ({
      slug: site?.slug ?? '',
      theme,
      orgName: branding.org_name || 'Our Choir',
      logoUrl: branding.logo_url || null,
      isPreview: true,
      activeAddons,
    }),
    [site?.slug, theme, branding.org_name, branding.logo_url, activeAddons],
  );

  const activate = async () => {
    setActivating(true);
    try {
      const { error } = await supabase.rpc('gw_activate_public_site');
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['gw_public_sites'] });
      await queryClient.invalidateQueries({ queryKey: ['gw_site_blocks'] });
      toast({ title: 'Public page created', description: 'Starter blocks were added from your branding.' });
    } catch (e: any) {
      toast({ title: 'Could not create page', description: e.message, variant: 'destructive' });
    } finally {
      setActivating(false);
    }
  };

  // Positions are unique per TENANT, not per page, and other pages' rows
  // (the retirement concert page) occupy slots interleaved with ours. So a
  // reorder must permute within the position numbers this page's blocks
  // already own — writing a fresh 0..n would collide with the other page.
  // Two phases: park every moved row far above the range, then land each on
  // its final slot; a direct swap inside a unique constraint has no safe
  // single-pass order.
  const persistPositions = async (ordered: SiteBlock[]) => {
    const pool = ordered.map((b) => b.position).sort((a, b) => a - b);
    const moves = ordered
      .map((b, i) => ({ id: b.id, from: b.position, to: pool[i] }))
      .filter((m) => m.from !== m.to);
    if (!moves.length) return;
    const PARK = 10_000;
    for (let i = 0; i < moves.length; i++) {
      await supabase.from('gw_site_blocks').update({ position: PARK + i }).eq('id', moves[i].id);
    }
    for (const m of moves) {
      await supabase.from('gw_site_blocks').update({ position: m.to }).eq('id', m.id);
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      // Never allow anything above a locked block (header stays at 0).
      const lockedCount = prev.filter((b) => getBlockModule(b.block_type)?.locked).length;
      if (newIndex < lockedCount) return prev;
      // Reassign within this page's own position pool (not 0..n) so local
      // state mirrors what persistPositions writes — positions are unique
      // tenant-wide and other pages own the gaps.
      const pool = prev.map((b) => b.position).sort((a, b) => a - b);
      const moved = arrayMove(prev, oldIndex, newIndex);
      void persistPositions(moved);
      return moved.map((b, i) => ({ ...b, position: pool[i] }));
    });
  };

  const updateConfig = (id: string, config: Record<string, unknown>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, config } : b)));
    // Skip persistence when any value is a transient blob: URL — that's a
    // browser-only object URL from an in-progress upload. Saving it would
    // store a dead reference that 404s on next page load. The follow-up
    // onChange(realUrl) (once the public URL is reachable) will trigger
    // this save path with proper persistable values.
    if (containsBlobUrl(config)) {
      clearTimeout(saveTimers.current[id]);
      return;
    }
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      const { error } = await supabase.from('gw_site_blocks').update({ config }).eq('id', id);
      if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }, 600);
  };

  const toggleVisible = async (block: SiteBlock) => {
    const next = !block.is_visible;
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, is_visible: next } : b)));
    await supabase.from('gw_site_blocks').update({ is_visible: next }).eq('id', block.id);
  };

  // Move a block one slot up or down. Same guardrails as drag-reorder:
  // locked blocks (header) never move, and nothing may sit above a locked
  // block. Used by the canvas toolbar's arrow buttons.
  const moveBlock = (id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const lockedCount = prev.filter((b) => getBlockModule(b.block_type)?.locked).length;
      if (targetIdx < lockedCount) return prev;
      const next = arrayMove(prev, idx, targetIdx).map((b, i) => ({ ...b, position: i }));
      void persistPositions(next);
      return next;
    });
  };

  // Next free position across the WHOLE tenant, because unique(tenant_id,
  // position) spans every page — home max + 1 could land on a row belonging
  // to another page this editor never loaded.
  const nextTenantPosition = async (): Promise<number> => {
    const { data } = await supabase
      .from('gw_site_blocks')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    return ((data as { position?: number } | null)?.position ?? -1) + 1;
  };

  // Duplicate inserts a copy of `block` immediately after it. The row is
  // appended at the tenant-wide free position (never a shift — shifting +1
  // through a shared position space collides with other pages' rows), then
  // the ordinary reorder permutation walks it into place.
  const duplicateBlock = async (block: SiteBlock) => {
    const mod = getBlockModule(block.block_type);
    if (!mod || mod.locked) return;
    const { data, error } = await supabase
      .from('gw_site_blocks')
      .insert({
        block_type: block.block_type,
        position: await nextTenantPosition(),
        config: block.config,
        is_visible: block.is_visible,
        page: 'home',
      })
      .select('id, block_type, position, config, is_visible, page')
      .single();
    if (error) {
      toast({ title: 'Duplicate failed', description: error.message, variant: 'destructive' });
      return;
    }
    const copy = data as SiteBlock;
    // Place the copy right after its original, then persist that order
    // through the same pool permutation the drag handler uses.
    const ordered = [...blocks];
    const at = ordered.findIndex((b) => b.id === block.id);
    ordered.splice(at + 1, 0, copy);
    const pool = ordered.map((b) => b.position).sort((a, b) => a - b);
    void persistPositions(ordered);
    setBlocks(ordered.map((b, i) => ({ ...b, position: pool[i] })));
    setSelectedId(copy.id);
  };

  // Scroll the newly-selected block into view in the preview column. Fires
  // when selection changes (either from clicking a Layer or from an in-canvas
  // action). Kept as an effect so scroll happens after the DOM has painted
  // the new selection outline.
  useEffect(() => {
    if (!selectedId) return;
    const el = blockRefs.current.get(selectedId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  // Escape deselects (matches Wix/Figma muscle memory) and closes the
  // settings sheet if it's open — but only when no menu/dialog owns focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (settingsOpenId) return; // Sheet handles its own Escape
      setSelectedId(null);
      setHoveredId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpenId]);

  const deleteBlock = async (block: SiteBlock) => {
    setBlocks((prev) => prev.filter((b) => b.id !== block.id));
    if (selectedId === block.id) setSelectedId(null);
    const { error } = await supabase.from('gw_site_blocks').delete().eq('id', block.id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
  };

  const addBlock = async (type: string) => {
    const mod = getBlockModule(type);
    if (!mod) return;
    // Tenant-wide free position — home's own max + 1 can collide with rows
    // on other pages, since unique(tenant_id, position) spans all pages.
    const position = await nextTenantPosition();
    const { data, error } = await supabase
      .from('gw_site_blocks')
      .insert({ block_type: type, position, config: mod.defaultConfig, is_visible: true, page: 'home' })
      .select('id, block_type, position, config, is_visible, page')
      .single();
    if (error) {
      toast({ title: 'Could not add block', description: error.message, variant: 'destructive' });
      return;
    }
    setBlocks((prev) => [...prev, data as SiteBlock]);
    setSelectedId((data as SiteBlock).id);
    setPickerOpen(false);
  };

  const checkSlug = async (value: string) => {
    setSlugStatus('checking');
    const { data, error } = await supabase.rpc('public_site_slug_available', { p_slug: value });
    if (error) {
      setSlugStatus('idle');
      toast({ title: 'Slug check failed', description: error.message, variant: 'destructive' });
      return;
    }
    setSlugStatus(data || value === site?.slug ? 'available' : 'taken');
  };

  const saveSlug = async () => {
    if (!site) return;
    const { error } = await supabase.from('gw_public_sites').update({ slug: slugDraft }).eq('id', site.id);
    if (error) {
      toast({ title: 'Could not save address', description: error.message, variant: 'destructive' });
      return;
    }
    setSlugStatus('idle');
    queryClient.invalidateQueries({ queryKey: ['gw_public_sites'] });
    toast({ title: 'Address updated', description: `Your page now lives at /sites/${slugDraft}` });
  };

  // Theme changes apply instantly to the preview via local state, then debounce
  // the DB write so dragging the letter-spacing or color sliders doesn't fire
  // a flood of UPDATE statements per pixel of movement.
  const updateTheme = (patch: Partial<SiteTheme>) => {
    if (!site) return;
    const next = { ...theme, ...patch };
    setPendingTheme(next);
    if (themeTimer.current) clearTimeout(themeTimer.current);
    themeTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('gw_public_sites').update({ theme: next }).eq('id', site.id);
      if (!error) {
        await queryClient.invalidateQueries({ queryKey: ['gw_public_sites'] });
      }
      setPendingTheme(null);
    }, 400);
  };

  const publish = async () => {
    if (!site) return;
    setPublishing(true);
    try {
      // Snapshot = this editor's home blocks (reindexed) PLUS every other
      // page's rows fetched fresh — a home-only publish must not erase the
      // other pages from the published payload.
      const { data: otherPages, error: opErr } = await supabase
        .from('gw_site_blocks')
        .select('id, block_type, position, config, is_visible, page')
        .not('page', 'is', null)
        .neq('page', 'home')
        .order('position');
      if (opErr) throw opErr;
      const snapshot = [
        ...blocks.map((b, i) => ({ ...b, page: b.page ?? 'home', position: i })),
        ...(otherPages ?? []),
      ];
      const { error } = await supabase
        .from('gw_public_sites')
        .update({ published_blocks: snapshot, published_at: new Date().toISOString(), is_published: true })
        .eq('id', site.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['gw_public_sites'] });
      toast({ title: 'Published', description: `Your page is live at /sites/${site.slug}` });
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    if (!site) return;
    const { error } = await supabase.from('gw_public_sites').update({ is_published: false }).eq('id', site.id);
    if (error) {
      toast({ title: 'Unpublish failed', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['gw_public_sites'] });
    toast({ title: 'Unpublished', description: 'Your page is no longer publicly visible.' });
  };

  // Swaps the site to a template package: wipes the current block list,
  // reseeds from the package's block list, and merges the package's theme
  // tokens over the current theme (preserving tenant-picked colors so the
  // brand identity survives). Client-side rather than an RPC so package
  // definitions stay in TypeScript alongside the block modules they refer
  // to. RLS scopes the delete + insert to the current tenant.
  // Restore the block list captured before the last package apply. Mirrors
  // applyPackage's delete-then-insert, minus the theme write, so an Undo puts
  // the tenant back exactly where they were.
  const restoreBlocks = async (snapshot: SiteBlock[]) => {
    if (!site || !snapshot.length) return;
    setRestoring(true);
    try {
      // Home rows only — a tenant-wide delete would wipe the other pages
      // (retirement concert etc.) this editor never loaded. And the
      // re-insert numbers from the tenant-wide free position, not 0, because
      // those pages' rows still occupy the low slots.
      const del = await supabase.from('gw_site_blocks').delete()
        .eq('tenant_id', site.tenant_id)
        .or('page.is.null,page.eq.home');
      if (del.error) throw del.error;
      const base = await nextTenantPosition();
      const rows = snapshot.map((b, i) => ({
        block_type: b.block_type,
        position: base + i,
        config: b.config,
        is_visible: b.is_visible,
        page: 'home',
      }));
      const ins = await supabase.from('gw_site_blocks').insert(rows);
      if (ins.error) throw ins.error;
      await queryClient.invalidateQueries({ queryKey: ['gw_site_blocks'] });
      setUndoBlocks(null);
      toast({ title: 'Blocks restored', description: 'Your previous layout and settings are back.' });
    } catch (e: any) {
      toast({ title: 'Could not restore', description: e.message, variant: 'destructive' });
    } finally {
      setRestoring(false);
    }
  };

  const applyPackage = async (pkg: TemplatePackage) => {
    if (!site) return;
    if (pkg.comingSoon) return;
    setApplyingPackage(pkg.id);
    // Capture before the delete so Undo has something to put back. `blocks`
    // is the live draft list, which is exactly what the delete destroys.
    const snapshot = blocks.map((b) => ({ ...b }));
    try {
      // Home rows only — see restore() above; tenant-wide would wipe the
      // other pages' blocks.
      const del = await supabase.from('gw_site_blocks').delete()
        .eq('tenant_id', site.tenant_id)
        .or('page.is.null,page.eq.home');
      if (del.error) throw del.error;
      const base = await nextTenantPosition();

      // Package theme merges OVER the current theme, but tenant colors are
      // preserved on top — packages are about typography / rhythm / shape,
      // not about repainting the tenant's brand palette.
      const nextTheme: SiteTheme = {
        ...theme,
        ...pkg.theme,
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor,
      };
      const themeUpd = await supabase
        .from('gw_public_sites')
        .update({ theme: nextTheme })
        .eq('id', site.id);
      if (themeUpd.error) throw themeUpd.error;

      // Header always seeds from tenant branding — not part of the package
      // schema. Keeps every package's nav consistent with what the block
      // anchors expect. (Logo image comes from Branding at render time.)
      const headerConfig = {
        siteName: branding.org_name || site.slug,
        navLinks: [
          { label: 'Events', url: '#events' },
          { label: 'About', url: '#about' },
          { label: 'Listen', url: '#music' },
          { label: 'Watch', url: '#watch' },
          { label: 'Contact', url: '#contact' },
        ],
        logoHeight: 36,
      };

      const rows = [
        { block_type: 'header', position: base, config: headerConfig, is_visible: true, page: 'home' },
        ...pkg.blocks.map((b, i) => {
          const mod = getBlockModule(b.type);
          return {
            block_type: b.type,
            position: base + i + 1,
            config: { ...(mod?.defaultConfig ?? {}), ...(b.config ?? {}) },
            is_visible: true,
            page: 'home',
          };
        }),
      ];
      const ins = await supabase.from('gw_site_blocks').insert(rows);
      if (ins.error) throw ins.error;

      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ['gw_site_blocks'] });
      await queryClient.invalidateQueries({ queryKey: ['gw_public_sites'] });
      setPackagePickerOpen(false);
      setUndoBlocks(snapshot);
      toast({
        title: `${pkg.name} applied`,
        description: `Replaced ${snapshot.length} block${snapshot.length === 1 ? '' : 's'}. Undo puts your previous layout back.`,
        action: snapshot.length
          ? (
              <ToastAction altText="Undo and restore my previous blocks" onClick={() => restoreBlocks(snapshot)}>
                Undo
              </ToastAction>
            )
          : undefined,
      });
    } catch (e: any) {
      toast({ title: 'Could not apply look', description: e.message, variant: 'destructive' });
    } finally {
      setApplyingPackage(null);
    }
  };

  // Wipes the current block list and asks gw_activate_public_site() to reseed
  // the 7-block starter template. RLS scopes the delete to the current tenant.
  const resetToTemplate = async () => {
    if (!site) return;
    setResetting(true);
    const del = await supabase.from('gw_site_blocks').delete().eq('tenant_id', site.tenant_id);
    if (del.error) {
      toast({ title: 'Reset failed', description: del.error.message, variant: 'destructive' });
      setResetting(false);
      return;
    }
    const reseed = await supabase.rpc('gw_activate_public_site');
    if (reseed.error) {
      toast({ title: 'Reseed failed', description: reseed.error.message, variant: 'destructive' });
      setResetting(false);
      return;
    }
    setSelectedId(null);
    await queryClient.invalidateQueries({ queryKey: ['gw_site_blocks'] });
    await queryClient.invalidateQueries({ queryKey: ['gw_public_sites'] });
    setResetting(false);
    setResetOpen(false);
    toast({ title: 'Reset complete', description: 'Your page now uses the starter template.' });
  };

  const existingBlockTypes = useMemo(() => new Set(blocks.map((b) => b.block_type)), [blocks]);

  if (siteLoading) {
    return (
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <div className="p-10 text-center text-muted-foreground">Loading…</div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  if (!site) {
    return (
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <div className="max-w-xl mx-auto px-4 py-16">
          <Card>
            <CardHeader className="text-center">
              <Globe className="w-10 h-10 mx-auto mb-2 text-primary" />
              <CardTitle>Create your public page</CardTitle>
              <CardDescription>
                A simple public website for your choir — events, story, contact info — built from blocks
                you arrange. We&apos;ll start you off with a header, hero, and events section using your branding.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={activate} disabled={activating} size="lg">
                <Rocket className="w-4 h-4 mr-2" />
                {activating ? 'Setting up…' : 'Create my page'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <DashboardPageShell
      title="Public page"
      maxWidth="7xl"
      subtitle={site.is_published
        ? 'Published — visitors see the latest version on your site.'
        : 'Not published yet — only you can see this.'}
      actions={
        <>
          <Badge variant={site.is_published ? 'default' : 'secondary'}>
            {site.is_published ? 'Published' : 'Draft'}
          </Badge>
          <Sheet open={packagePickerOpen} onOpenChange={setPackagePickerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" title="Try a different look for your whole site">
                <Sparkles className="w-4 h-4 mr-1.5" /> Change look
              </Button>
            </SheetTrigger>
            {/* The look panel lives on the right so tenants can watch the
                preview repaint as they slide radius / spacing / letter-spacing
                — every knob wires straight into updateTheme() which pushes
                `pendingTheme` to the preview instantly and debounces the DB
                write. */}
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Change look</SheetTitle>
                <SheetDescription>
                  Start from a preset, then fine-tune the rhythm. The preview updates as you go.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section className="space-y-2">
                  <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
                    Presets
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applying a preset <strong className="font-semibold text-foreground">deletes your current blocks</strong> and
                    their settings, then rebuilds the page from that layout. Your brand colors and uploaded media stay the same.
                    You&rsquo;ll be asked to confirm first.
                  </p>
                  <div className="space-y-2">
                    {PACKAGE_LIST.map((pkg) => {
                      const active = theme.package === pkg.id;
                      const busy = applyingPackage === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => !pkg.comingSoon && setPendingPackage(pkg)}
                          disabled={pkg.comingSoon || busy}
                          className={`w-full text-left rounded-xl border p-3 space-y-1 transition-colors ${
                            active
                              ? 'border-primary ring-2 ring-primary/40 bg-primary/5'
                              : pkg.comingSoon
                                ? 'border-border/60 opacity-70 cursor-not-allowed'
                                : 'border-border/60 hover:border-primary hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{pkg.name}</span>
                            {pkg.comingSoon && (
                              <Badge variant="secondary" className="gap-1">
                                <Lock className="w-3 h-3" /> Soon
                              </Badge>
                            )}
                            {active && !pkg.comingSoon && (
                              <Badge variant="default" className="gap-1">
                                <Check className="w-3 h-3" /> Applied
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">{pkg.description}</p>
                          {busy && <p className="text-xs text-primary">Applying…</p>}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
                    Fine-tune
                  </div>

                  <div className="space-y-1.5">
                    <Label>Corner radius</Label>
                    <ToggleGroup
                      type="single"
                      value={theme.radiusScale}
                      onValueChange={(v) => v && updateTheme({ radiusScale: v as SiteTheme['radiusScale'] })}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="sharp">Sharp</ToggleGroupItem>
                      <ToggleGroupItem value="soft">Soft</ToggleGroupItem>
                      <ToggleGroupItem value="round">Round</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Section spacing</Label>
                    <ToggleGroup
                      type="single"
                      value={theme.sectionPaddingScale}
                      onValueChange={(v) =>
                        v && updateTheme({ sectionPaddingScale: v as SiteTheme['sectionPaddingScale'] })
                      }
                      className="justify-start flex-wrap"
                    >
                      <ToggleGroupItem value="tight">Tight</ToggleGroupItem>
                      <ToggleGroupItem value="normal">Normal</ToggleGroupItem>
                      <ToggleGroupItem value="generous">Generous</ToggleGroupItem>
                      <ToggleGroupItem value="spacious">Spacious</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Divider between sections</Label>
                    <ToggleGroup
                      type="single"
                      value={theme.dividerStyle}
                      onValueChange={(v) => v && updateTheme({ dividerStyle: v as SiteTheme['dividerStyle'] })}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="none">None</ToggleGroupItem>
                      <ToggleGroupItem value="rule">Hairline rule</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Heading font</Label>
                    <Select
                      value={theme.headingFontFamily ?? '__inherit__'}
                      onValueChange={(v) =>
                        updateTheme({ headingFontFamily: v === '__inherit__' ? undefined : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__inherit__">Same as body font</SelectItem>
                        {FONT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Letter spacing</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {(theme.letterSpacing ?? 0).toFixed(2)}em
                      </span>
                    </div>
                    <Slider
                      min={-0.05}
                      max={0.3}
                      step={0.005}
                      value={[theme.letterSpacing ?? 0]}
                      onValueChange={(v) => updateTheme({ letterSpacing: v[0] })}
                    />
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600 space-y-1">
                  <p className="font-medium text-slate-700">Colors &amp; body font</p>
                  <p>
                    Your brand palette and body typeface come from{' '}
                    <Link to="/settings/branding" className="underline text-primary">
                      Branding Settings
                    </Link>
                    {' '}so they stay consistent across every page, email, and app view.
                  </p>
                </section>
              </div>
            </SheetContent>
          </Sheet>
          {/* Confirmation gate for "Change look". The label reads cosmetic but
              applyPackage DELETEs every gw_site_blocks row for the tenant, so
              a single stray click used to wipe a fully configured page with no
              warning and no way back. Names the exact blocks about to go so
              the cost is visible before the click, not after. */}
          <Dialog
            open={!!pendingPackage}
            onOpenChange={(open) => {
              if (!open) setPendingPackage(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Replace your page with the {pendingPackage?.name} look?</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      This <strong className="text-foreground">permanently deletes all {blocks.length} block
                      {blocks.length === 1 ? '' : 's'}</strong> currently on your page, along with every setting
                      on them — hero images, headlines, RSVP links, and booking config included — and rebuilds
                      the page from the preset.
                    </p>
                    {blocks.length > 0 && (
                      <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
                        <p className="text-xs font-medium text-foreground mb-1.5">About to be deleted:</p>
                        <ul className="text-xs space-y-0.5">
                          {blocks.map((b) => (
                            <li key={b.id}>• {getBlockModule(b.block_type)?.name ?? b.block_type}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p>
                      Your brand colors, uploaded media, and theme are kept. You can Undo straight after
                      from the toast, but that offer is gone once you leave the page.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setPendingPackage(null)}>
                  Keep my page
                </Button>
                <Button
                  variant="destructive"
                  disabled={!!applyingPackage}
                  onClick={() => {
                    const pkg = pendingPackage;
                    setPendingPackage(null);
                    if (pkg) applyPackage(pkg);
                  }}
                >
                  Delete {blocks.length} block{blocks.length === 1 ? '' : 's'} and apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" title="Replace all blocks with the default layout">
                <Rocket className="w-4 h-4 mr-1.5" /> Reset to template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset to the starter template?</DialogTitle>
                <DialogDescription>
                  This deletes every block currently on the page and replaces them with the
                  default 7-block layout: Header, Hero, Events, About, Music Player, Videos,
                  and Contact &amp; Footer. Your theme, brand colors, and uploaded media are kept.
                  This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={resetToTemplate} disabled={resetting}>
                  {resetting ? 'Resetting…' : 'Yes, reset blocks'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {site.is_published && site.slug && (
            // "View site" opens the built blocks at /sites/<slug>, which
            // mounts PublicSitePage directly.
            //
            // It used to send non-main tenants to the subdomain root on the
            // theory that it renders TenantLanding. That holds for anonymous
            // visitors, but `/` is HomeRoute, and HomeRoute runs
            // useRoleBasedRedirect() — so an authenticated user is bounced to
            // their role's home. The only person who ever clicks this button
            // is the signed-in admin editing the page, so it always landed on
            // Command Center instead of the site. /sites/<slug> has no such
            // redirect and is the same address shown in "Page address" below.
            <Button variant="outline" asChild title="Open your live site in a new tab">
              <a
                href={`/sites/${site.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" /> View site
              </a>
            </Button>
          )}
          {site.is_published && (
            <Button variant="outline" onClick={unpublish}>Unpublish</Button>
          )}
          <Button onClick={publish} disabled={publishing}>
            {publishing ? 'Publishing…' : site.is_published ? 'Republish changes' : 'Publish'}
          </Button>
        </>
      }
    >
      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Layers</CardTitle>
              <CardDescription className="text-xs">
                Click a layer to jump to it on the canvas. Edit blocks directly on the preview.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block) => {
                    const isSelected = block.id === selectedId;
                    return (
                      <SortableBlockRow
                        key={block.id}
                        block={block}
                        selected={isSelected}
                        onSelect={() => setSelectedId(block.id)}
                        onToggle={() => toggleVisible(block)}
                        onDelete={() => deleteBlock(block)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
              <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add block
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add a block</DialogTitle>
                    <DialogDescription>
                      Each block is powered by a GleeWorld module. Add-ons unlock additional blocks.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                    {([
                      { key: 'core', label: 'Your essentials' },
                      { key: 'gleeworld', label: 'GleeWorld extras' },
                      { key: 'addon', label: 'Add-ons' },
                    ] as const).map(({ key, label }) => {
                      const items = BLOCK_LIST.filter((m) => !m.locked && (m.group ?? 'core') === key && isBlockOfferedToTenant(m, getTenantSlug()));
                      if (items.length === 0) return null;
                      return (
                        <div key={key} className="space-y-2">
                          <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                            {label}
                          </div>
                          {items.map((mod) => {
                            const available = isBlockAvailable(mod, activeAddons);
                            const alreadyOnPage = existingBlockTypes.has(mod.type);
                            const Icon = mod.icon;
                            return (
                              <div
                                key={mod.type}
                                className={`flex items-center gap-3 rounded-lg border p-3 ${
                                  available ? 'hover:border-primary cursor-pointer' : 'opacity-70'
                                }`}
                                onClick={available ? () => addBlock(mod.type) : undefined}
                              >
                                <Icon className="w-5 h-5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{mod.name}</span>
                                    {alreadyOnPage && (
                                      <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700">
                                        <Check className="w-3 h-3" /> Added
                                      </Badge>
                                    )}
                                    {!available && (
                                      <Badge variant="secondary" className="gap-1">
                                        <Lock className="w-3 h-3" /> Add-on
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                                  {mod.poweredBy && (
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground/70 mt-1">
                                      Powered by {mod.poweredBy}
                                    </p>
                                  )}
                                </div>
                                {!available && (
                                  <Button asChild size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                                    <Link to="/settings/modules">Activate</Link>
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Page address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">/sites/</span>
                <Input
                  value={slugDraft}
                  onChange={(e) => {
                    setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setSlugStatus('idle');
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => checkSlug(slugDraft)} disabled={slugDraft.length < 3}>
                  Check availability
                </Button>
                {slugStatus === 'checking' && <span className="text-xs text-muted-foreground">Checking…</span>}
                {slugStatus === 'available' && (
                  <span className="text-xs text-green-600 inline-flex items-center gap-1"><Check className="w-3 h-3" /> Available</span>
                )}
                {slugStatus === 'taken' && (
                  <span className="text-xs text-destructive inline-flex items-center gap-1"><X className="w-3 h-3" /> Taken</span>
                )}
                {slugStatus === 'available' && slugDraft !== site.slug && (
                  <Button size="sm" onClick={saveSlug}>Save</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Site design. Site-wide tokens, deliberately not per-block: the
              whole point is that header through footer stay the same width,
              so exposing width per block would let them drift apart. Every
              control writes through updateTheme(), which pushes pendingTheme
              to the preview immediately and debounces the DB write, so the
              preview repaints as you drag. Lives in the left column so the
              preview on the right stays visible while you tune. */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Site design</CardTitle>
              <CardDescription className="text-xs">
                Applies to every block, header through footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Content width
                </Label>
                <div className="grid grid-cols-4 gap-1">
                  {CONTENT_WIDTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateTheme({ contentWidth: opt.value })}
                      className={`rounded-lg border px-1 py-1.5 text-[11px] leading-tight transition-colors ${
                        theme.contentWidth === opt.value
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border/60 hover:border-primary/60 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block">{opt.label}</span>
                      <span className="block text-[10px] text-muted-foreground">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Side padding
                </Label>
                <div className="grid grid-cols-4 gap-1">
                  {SIDE_GUTTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateTheme({ sideGutter: opt.value })}
                      className={`rounded-lg border px-1 py-1.5 text-[11px] transition-colors ${
                        theme.sideGutter === opt.value
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border/60 hover:border-primary/60 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Section spacing
                </Label>
                <div className="grid grid-cols-4 gap-1">
                  {SECTION_PADDING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateTheme({ sectionPaddingScale: opt.value })}
                      className={`rounded-lg border px-1 py-1.5 text-[11px] transition-colors ${
                        theme.sectionPaddingScale === opt.value
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border/60 hover:border-primary/60 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Text size
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(theme.fontScale * 100)}%
                  </span>
                </div>
                <Slider
                  value={[theme.fontScale]}
                  min={0.85}
                  max={1.4}
                  step={0.05}
                  onValueChange={(v) => updateTheme({ fontScale: v[0] })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Letter spacing
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {theme.letterSpacing.toFixed(3)}em
                  </span>
                </div>
                <Slider
                  value={[theme.letterSpacing]}
                  min={-0.05}
                  max={0.3}
                  step={0.005}
                  onValueChange={(v) => updateTheme({ letterSpacing: v[0] })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Colors
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                      className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      aria-label="Primary color"
                    />
                    <span className="text-xs">Primary</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => updateTheme({ accentColor: e.target.value })}
                      className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      aria-label="Accent color"
                    />
                    <span className="text-xs">Accent</span>
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  These override your palette for this site only.{' '}
                  <Link to="/settings/branding" className="underline text-primary">
                    Branding Settings
                  </Link>{' '}
                  sets the default everywhere else.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

        <Card className="overflow-hidden">
          <CardHeader className="py-3 border-b flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground font-normal">Preview</CardTitle>
            <div className="inline-flex rounded-full border border-border/60 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                aria-pressed={device === 'desktop'}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                  device === 'desktop'
                    ? 'bg-white shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                aria-pressed={device === 'mobile'}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                  device === 'mobile'
                    ? 'bg-white shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phone</span>
              </button>
            </div>
          </CardHeader>
          {/* Outer scroll viewport (not the page). Bounding the preview keeps
              the editor a fixed height and gives the site's `sticky` header a
              scrolling ancestor so it pins inside the preview as it will when
              published. overscroll-contain stops the page from scrolling once
              the preview hits its end. Slate wash makes the device frame
              visible when the scaled site is narrower than the column. */}
          <div
            className="bg-slate-100 max-h-[70dvh] overflow-y-auto overflow-x-hidden overscroll-contain relative"
            // `container-type: inline-size` turns this element into a query
            // container so descendants can size themselves off its width via
            // `100cqi`. Named it so nested containers don't accidentally
            // resolve up to it.
            style={{ containerType: 'inline-size', containerName: 'gw-preview' } as React.CSSProperties}
            // Clicking the wash around the device frame deselects. Clicks on
            // a BlockFrame stop propagation so they don't accidentally
            // deselect while trying to interact with a block.
            onClick={() => setSelectedId(null)}
          >
            {/* Scaling wrapper: width fills the container (100cqi), height
                is scale × unscaled-inner-height so vertical scroll tracks
                the scaled result. --scale is min(1, 100cqi / deviceWidth)
                — never scales up, only down. Computed entirely in CSS so
                it's right on first paint, no JS timing race. */}
            <div
              className="mx-auto"
              style={{
                ['--gw-preview-scale' as any]: `min(1, calc(100cqi / ${deviceWidth}px))`,
                width: '100cqi',
                height: previewInnerHeight
                  ? `calc(${previewInnerHeight}px * var(--gw-preview-scale))`
                  : undefined,
                overflow: 'hidden',
                position: 'relative',
              } as React.CSSProperties}
            >
            <div
              ref={previewInnerRef}
              className="gw-site bg-white"
              // Sibling styling hook. Tailwind's `sm:` media queries fire
              // against the real editor viewport, not the previewed 390px
              // frame, so the site's `hidden sm:flex` desktop nav still
              // appears when previewing on phone. index.css forces the
              // header block into mobile behavior when this attribute is
              // "mobile", using selectors scoped to `.gw-site`.
              data-preview-device={device}
              style={{
                width: deviceWidth,
                transform: 'scale(var(--gw-preview-scale))',
                transformOrigin: 'top left',
                ...themeCssVars(theme),
                fontFamily: fontStack(theme.fontFamily),
                letterSpacing: `${theme.letterSpacing ?? 0}em`,
              } as React.CSSProperties}
            >
              {/* Same package tokens the /sites/:slug renderer applies, so
                  what you see in the preview matches what visitors get. */}
              <style>{`
                .gw-site h1, .gw-site h2, .gw-site h3, .gw-site h4 { font-family: var(--site-heading-font); }
                .gw-site > section:not(#top),
                .gw-site > footer { padding-top: var(--site-section-py); padding-bottom: var(--site-section-py); }
              `}</style>
              {(() => {
                // Render every non-locked block through a BlockFrame so the
                // canvas gets hover/select outlines and a floating toolbar.
                // Hidden blocks still show (dimmed) so tenants can toggle
                // them back — the public site skips them entirely.
                const renderable = blocks.filter((b) => {
                  const mod = getBlockModule(b.block_type);
                  return mod && isBlockAvailable(mod, activeAddons);
                });
                const lockedCount = renderable.filter(
                  (b) => getBlockModule(b.block_type)?.locked,
                ).length;
                // Second DndContext (independent from the sidebar Layers
                // list) drives drag-to-reorder directly on the canvas. Both
                // contexts share the same onDragEnd + sensors and update the
                // same `blocks` state, so a drag in either surface reflects
                // instantly in the other. Item ids can be duplicated across
                // separate DndContext instances safely.
                return (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                  >
                    <SortableContext
                      items={renderable.map((b) => b.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {renderable.map((block, idx) => {
                        const mod = getBlockModule(block.block_type)!;
                        const Render = mod.Render;
                        const cfg = safeConfig(mod, block.config);
                        const locked = !!mod.locked;
                        const canMoveUp = !locked && idx > lockedCount;
                        const canMoveDown = !locked && idx < renderable.length - 1;
                        return (
                          <BlockFrame
                            key={block.id}
                            id={block.id}
                            ref={(el) => {
                              if (el) blockRefs.current.set(block.id, el);
                              else blockRefs.current.delete(block.id);
                            }}
                            blockName={mod.name}
                            selected={selectedId === block.id}
                            hovered={hoveredId === block.id}
                            visible={block.is_visible}
                            locked={locked}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                            onSelect={() => setSelectedId(block.id)}
                            onHoverChange={(h) => setHoveredId(h ? block.id : null)}
                            onMoveUp={() => moveBlock(block.id, 'up')}
                            onMoveDown={() => moveBlock(block.id, 'down')}
                            onDuplicate={() => duplicateBlock(block)}
                            onToggleVisibility={() => toggleVisible(block)}
                            onDelete={() => deleteBlock(block)}
                            onOpenSettings={() => {
                              setSelectedId(block.id);
                              setSettingsOpenId(block.id);
                            }}
                          >
                            <Render
                              config={cfg}
                              ctx={ctx}
                              onConfigChange={(patch) =>
                                updateConfig(block.id, {
                                  ...cfg,
                                  ...patch,
                                } as Record<string, unknown>)
                              }
                            />
                          </BlockFrame>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                );
              })()}
              {blocks.length === 0 && (
                <div className="p-16 text-center text-muted-foreground">Add blocks to see a preview.</div>
              )}
            </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Block settings drawer. Opens from the canvas toolbar's ⚙ button.
          Holds the block's structured settings form (custom EditorForm for
          rich blocks like Hero/Header, generic AutoForm for the rest).
          Kept out of the sidebar so the canvas can breathe and edits happen
          contextually. */}
      <Sheet
        open={!!settingsOpenId}
        modal={false}
        onOpenChange={(open) => {
          if (!open) setSettingsOpenId(null);
        }}
      >
        {/* Left side, no backdrop, non-modal (Kevin, 2026-07-31): the live
            preview sits to the right on desktop/iPad and must stay fully
            legible AND interactive while editing — block edits repaint in
            view as the user tweaks them. Outside interactions are prevented
            from auto-closing so scrolling/clicking the preview keeps the
            panel open; close via the X. Phones: w-full either way. */}
        <SheetContent
          side="left"
          hideOverlay
          onInteractOutside={(e) => e.preventDefault()}
          className="w-full sm:max-w-md overflow-y-auto"
        >
          {(() => {
            const b = blocks.find((x) => x.id === settingsOpenId);
            if (!b) return null;
            const mod = getBlockModule(b.block_type);
            if (!mod) return null;
            const cfg = safeConfig(mod, b.config);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <mod.icon className="w-4 h-4" />
                    {mod.name}
                  </SheetTitle>
                  <SheetDescription>{mod.description}</SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  {mod.EditorForm ? (
                    <mod.EditorForm
                      config={cfg}
                      onChange={(next) => updateConfig(b.id, next as Record<string, unknown>)}
                      theme={theme}
                      onThemeChange={updateTheme}
                    />
                  ) : (
                    <AutoForm
                      schema={mod.configSchema}
                      config={cfg}
                      onChange={(next) => updateConfig(b.id, next)}
                    />
                  )}
                </div>
                {/* Sticky Republish CTA at the bottom of the sheet — draft
                    changes made here don't hit the live site until publish,
                    and users kept expecting the settings sheet itself to
                    push them out. Only shown when there's a published site
                    (nothing to republish otherwise). */}
                {site?.is_published && (
                  <div
                    className="sticky bottom-0 -mx-6 mt-6 border-t bg-background/95 px-6 py-3 backdrop-blur"
                  >
                    <Button
                      className="w-full"
                      onClick={publish}
                      disabled={publishing}
                    >
                      <Rocket className="w-4 h-4 mr-1.5" />
                      {publishing ? 'Publishing…' : 'Republish changes'}
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      Draft changes won't appear on your live site until you republish.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}
