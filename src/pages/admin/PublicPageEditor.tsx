// Tenant public landing page builder (/admin/public-page). Blocks live in
// gw_site_blocks (draft); Publish snapshots them into gw_public_sites.published_blocks,
// which is the only thing anonymous visitors can read via get_public_site().
import { useEffect, useMemo, useRef, useState } from 'react';
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
  Settings2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BLOCK_LIST, getBlockModule, isBlockAvailable } from '@/components/public-site/registry';
import { AutoForm } from '@/components/public-site/AutoForm';
import { fontStack, safeConfig, themeSchema, type SiteBlock, type SiteRenderContext, type SiteTheme } from '@/components/public-site/types';

interface SiteRow {
  id: string;
  slug: string;
  theme: Record<string, unknown>;
  is_published: boolean;
  published_at: string | null;
}

function SortableBlockRow({
  block,
  selected,
  onSelect,
  onToggle,
  onDelete,
  expanded,
}: {
  block: SiteBlock;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  /** Optional editor form rendered as an accordion panel below the row when selected. */
  expanded?: React.ReactNode;
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
        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 ${
          selected ? 'border-primary ring-1 ring-primary' : 'border-border'
        } ${isDragging ? 'shadow-lg' : ''}`}
      >
        {locked ? (
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground touch-none" aria-label="Reorder">
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <button onClick={onSelect} className="flex items-center gap-2 flex-1 text-left min-w-0">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium truncate">{mod.name}</span>
          <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${selected ? 'rotate-180' : ''}`} />
        </button>
        {!locked && (
          <>
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground" aria-label="Toggle visibility">
              {block.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="Delete block">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {selected && expanded && (
        <div className="mt-2 mb-2 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          {expanded}
        </div>
      )}
    </div>
  );
}

export default function PublicPageEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings: branding } = useBrandingSettings();
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [activating, setActivating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
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
      const { data, error } = await supabase
        .from('gw_site_blocks')
        .select('id, block_type, position, config, is_visible')
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

  const theme: SiteTheme = useMemo(() => {
    if (pendingTheme) return pendingTheme;
    const parsed = themeSchema.safeParse(site?.theme ?? {});
    return parsed.success ? parsed.data : themeSchema.parse({});
  }, [site?.theme, pendingTheme]);

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

  const persistPositions = async (ordered: SiteBlock[]) => {
    await Promise.all(
      ordered.map((b, i) =>
        b.position === i ? null : supabase.from('gw_site_blocks').update({ position: i }).eq('id', b.id),
      ),
    );
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
      const next = arrayMove(prev, oldIndex, newIndex).map((b, i) => ({ ...b, position: i }));
      void persistPositions(next);
      return next;
    });
  };

  const updateConfig = (id: string, config: Record<string, unknown>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, config } : b)));
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

  const deleteBlock = async (block: SiteBlock) => {
    setBlocks((prev) => prev.filter((b) => b.id !== block.id));
    if (selectedId === block.id) setSelectedId(null);
    const { error } = await supabase.from('gw_site_blocks').delete().eq('id', block.id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
  };

  const addBlock = async (type: string) => {
    const mod = getBlockModule(type);
    if (!mod) return;
    const position = blocks.length;
    const { data, error } = await supabase
      .from('gw_site_blocks')
      .insert({ block_type: type, position, config: mod.defaultConfig, is_visible: true })
      .select('id, block_type, position, config, is_visible')
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
      const snapshot = blocks.map((b, i) => ({ ...b, position: i }));
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

  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const existingBlockTypes = useMemo(() => new Set(blocks.map((b) => b.block_type)), [blocks]);
  const selectedMod = selected ? getBlockModule(selected.block_type) : null;

  if (siteLoading) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  if (!site) {
    return (
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-sans normal-case tracking-tight text-2xl font-bold">Public page</h1>
          <p className="text-sm text-muted-foreground">
            {site.is_published
              ? 'Published — visitors see the latest version on your site.'
              : 'Not published yet — only you can see this.'}
          </p>
        </div>
        <Badge variant={site.is_published ? 'default' : 'secondary'}>
          {site.is_published ? 'Published' : 'Draft'}
        </Badge>
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
        {site.is_published && (
          <Button
            variant="outline"
            onClick={() => {
              // Open the canonical public view (/sites/<slug>) in a fresh tab.
              // The tenant root (/) redirects logged-in admins to the control
              // center, so we deliberately use the public-only route here.
              const url = `${window.location.origin}/sites/${site.slug}?_=${Date.now()}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            title="Open your live site in a new tab"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" /> View site
          </Button>
        )}
        {site.is_published && (
          <Button variant="outline" onClick={unpublish}>Unpublish</Button>
        )}
        <Button onClick={publish} disabled={publishing}>
          {publishing ? 'Publishing…' : site.is_published ? 'Republish changes' : 'Publish'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Blocks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block) => {
                    const mod = getBlockModule(block.block_type);
                    const isSelected = block.id === selectedId;
                    const expanded = isSelected && mod ? (
                      mod.EditorForm ? (
                        <mod.EditorForm
                          config={safeConfig(mod, block.config)}
                          onChange={(config) => updateConfig(block.id, config as Record<string, unknown>)}
                          theme={theme}
                          onThemeChange={updateTheme}
                        />
                      ) : (
                        <AutoForm
                          schema={mod.configSchema}
                          config={safeConfig(mod, block.config)}
                          onChange={(config) => updateConfig(block.id, config)}
                        />
                      )
                    ) : null;
                    return (
                      <SortableBlockRow
                        key={block.id}
                        block={block}
                        selected={isSelected}
                        onSelect={() => setSelectedId(isSelected ? null : block.id)}
                        onToggle={() => toggleVisible(block)}
                        onDelete={() => deleteBlock(block)}
                        expanded={expanded}
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
                      const items = BLOCK_LIST.filter((m) => !m.locked && (m.group ?? 'core') === key);
                      if (items.length === 0) return null;
                      return (
                        <div key={key} className="space-y-2">
                          <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
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
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mt-1">
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

        </div>

        <Card className="overflow-hidden">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-sm text-muted-foreground font-normal">Preview</CardTitle>
          </CardHeader>
          <div
            className="bg-white"
            style={{
              ['--site-primary' as string]: theme.primaryColor,
              ['--site-accent' as string]: theme.accentColor,
              fontFamily: fontStack(theme.fontFamily),
              letterSpacing: `${theme.letterSpacing ?? 0}em`,
            }}
          >
            {blocks.map((block) => {
              const mod = getBlockModule(block.block_type);
              if (!mod || !block.is_visible) return null;
              if (!isBlockAvailable(mod, activeAddons)) return null;
              const Render = mod.Render;
              const cfg = safeConfig(mod, block.config);
              return (
                <Render
                  key={block.id}
                  config={cfg}
                  ctx={ctx}
                  onConfigChange={(patch) => updateConfig(block.id, { ...cfg, ...patch } as Record<string, unknown>)}
                />
              );
            })}
            {blocks.length === 0 && (
              <div className="p-16 text-center text-muted-foreground">Add blocks to see a preview.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
