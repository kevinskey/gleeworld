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
import { safeConfig, themeSchema, type SiteBlock, type SiteRenderContext, type SiteTheme } from '@/components/public-site/types';

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
      className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-border'
      } ${isDragging ? 'opacity-60 shadow-lg' : ''}`}
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

  const theme: SiteTheme = useMemo(() => {
    const parsed = themeSchema.safeParse(site?.theme ?? {});
    return parsed.success ? parsed.data : themeSchema.parse({});
  }, [site?.theme]);

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

  const updateTheme = async (patch: Partial<SiteTheme>) => {
    if (!site) return;
    const next = { ...theme, ...patch };
    await supabase.from('gw_public_sites').update({ theme: next }).eq('id', site.id);
    queryClient.invalidateQueries({ queryKey: ['gw_public_sites'] });
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

  const selected = blocks.find((b) => b.id === selectedId) ?? null;
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
            {site.is_published ? (
              <a
                href={`/sites/${site.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Live at /sites/{site.slug} <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              'Not published yet — only you can see this.'
            )}
          </p>
        </div>
        <Badge variant={site.is_published ? 'default' : 'secondary'}>
          {site.is_published ? 'Published' : 'Draft'}
        </Badge>
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
                  {blocks.map((block) => (
                    <SortableBlockRow
                      key={block.id}
                      block={block}
                      selected={block.id === selectedId}
                      onSelect={() => setSelectedId(block.id)}
                      onToggle={() => toggleVisible(block)}
                      onDelete={() => deleteBlock(block)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add block
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add a block</DialogTitle>
                    <DialogDescription>Pick a section to add to your page.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    {BLOCK_LIST.filter((m) => !m.locked).map((mod) => {
                      const available = isBlockAvailable(mod, activeAddons);
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
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{mod.name}</span>
                              {!available && (
                                <Badge variant="secondary" className="gap-1">
                                  <Lock className="w-3 h-3" /> Add-on
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{mod.description}</p>
                          </div>
                          {!available && (
                            <Button asChild size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                              <Link to="/settings/modules">Upgrade</Link>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {selected && selectedMod && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> {selectedMod.name} settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedMod.EditorForm ? (
                  <selectedMod.EditorForm
                    config={safeConfig(selectedMod, selected.config)}
                    onChange={(config) => updateConfig(selected.id, config as Record<string, unknown>)}
                  />
                ) : (
                  <AutoForm
                    schema={selectedMod.configSchema}
                    config={safeConfig(selectedMod, selected.config)}
                    onChange={(config) => updateConfig(selected.id, config)}
                  />
                )}
              </CardContent>
            </Card>
          )}

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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Theme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Primary color</Label>
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                  className="h-8 w-12 rounded border cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Accent color</Label>
                <input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => updateTheme({ accentColor: e.target.value })}
                  className="h-8 w-12 rounded border cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label>Font</Label>
                <Select value={theme.fontFamily} onValueChange={(v) => updateTheme({ fontFamily: v as SiteTheme['fontFamily'] })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sans">Sans</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-sm text-muted-foreground font-normal">Preview</CardTitle>
          </CardHeader>
          <div
            className={`bg-white ${theme.fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}
            style={{
              ['--site-primary' as string]: theme.primaryColor,
              ['--site-accent' as string]: theme.accentColor,
            }}
          >
            {blocks.map((block) => {
              const mod = getBlockModule(block.block_type);
              if (!mod || !block.is_visible) return null;
              if (!isBlockAvailable(mod, activeAddons)) return null;
              const Render = mod.Render;
              return <Render key={block.id} config={safeConfig(mod, block.config)} ctx={ctx} />;
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
