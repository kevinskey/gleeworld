// Fan landing page builder (/admin/fan-page). Same block model as the public
// page builder, but the published snapshot is gated to authenticated users
// via get_tenant_fan_page() and only renders at /fan.
import { useMemo, useState } from 'react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Eye,
  EyeOff,
  GripVertical,
  Heart,
  Lock,
  Plus,
  Rocket,
  Trash2,
  Check,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBlockPageEditor } from '@/hooks/useBlockPageEditor';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { BLOCK_LIST, getBlockModule, isBlockAvailable } from '@/components/public-site/registry';
import { AutoForm } from '@/components/public-site/AutoForm';
import { fontStack, safeConfig, type SiteBlock, type SiteRenderContext } from '@/components/public-site/types';
import { useQuery } from '@tanstack/react-query';

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
        className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 ${
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

export default function FanPageEditor() {
  const { settings: branding } = useBrandingSettings();
  const editor = useBlockPageEditor({
    pageTable: 'gw_fan_pages',
    blocksTable: 'gw_fan_page_blocks',
    activateRpc: 'gw_activate_fan_page',
    pageQueryKey: 'gw_fan_pages',
    blocksQueryKey: 'gw_fan_page_blocks',
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const ctx: SiteRenderContext = useMemo(
    () => ({
      slug: 'fan',
      theme: editor.theme,
      orgName: branding.org_name || 'Our Choir',
      logoUrl: branding.logo_url || null,
      isPreview: true,
      activeAddons,
    }),
    [editor.theme, branding.org_name, branding.logo_url, activeAddons],
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    editor.onDragEnd({ id: String(e.active.id) }, { id: String(e.over.id) });
  };

  const handleReset = async () => {
    await editor.resetToTemplate();
    setResetOpen(false);
  };

  if (editor.pageLoading) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  if (!editor.page) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <Heart className="w-10 h-10 mx-auto mb-2 text-primary" />
            <CardTitle>Create your fan page</CardTitle>
            <CardDescription>
              A members-only landing page for everyone who signs up as a fan. Same block builder as
              your public site — start with a header, hero, upcoming events, and music, then publish.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={editor.activate} disabled={editor.activating} size="lg">
              <Rocket className="w-4 h-4 mr-2" />
              {editor.activating ? 'Setting up…' : 'Create fan page'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const existingBlockTypes = new Set(editor.blocks.map((b) => b.block_type));

  return (
    <DashboardPageShell
      title="Fan page"
      maxWidth="7xl"
      subtitle={editor.page.is_published
        ? 'Published — signed-in fans see the latest version at /fan.'
        : 'Not published yet — only you can see this.'}
      actions={
        <>
          <Badge variant={editor.page.is_published ? 'default' : 'secondary'}>
            {editor.page.is_published ? 'Published' : 'Draft'}
          </Badge>
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" title="Replace all blocks with the default fan layout">
                <Rocket className="w-4 h-4 mr-1.5" /> Reset to template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset to the starter template?</DialogTitle>
                <DialogDescription>
                  Replaces every block on your fan page with the default 6-block layout:
                  Header, Hero, Events, Music Player, Videos, and Support. Theme + media kept.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleReset} disabled={editor.resetting}>
                  {editor.resetting ? 'Resetting…' : 'Yes, reset blocks'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {editor.page.is_published && (
            <Button
              variant="outline"
              onClick={() => window.open(`${window.location.origin}/fan?_=${Date.now()}`, '_blank', 'noopener,noreferrer')}
              title="Open your fan page in a new tab"
            >
              <ExternalLink className="w-4 h-4 mr-1.5" /> View page
            </Button>
          )}
          {editor.page.is_published && (
            <Button variant="outline" onClick={editor.unpublish}>Unpublish</Button>
          )}
          <Button onClick={editor.publish} disabled={editor.publishing}>
            {editor.publishing ? 'Publishing…' : editor.page.is_published ? 'Republish changes' : 'Publish'}
          </Button>
        </>
      }
    >
      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Blocks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={editor.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {editor.blocks.map((block) => {
                  const mod = getBlockModule(block.block_type);
                  const isSelected = block.id === editor.selectedId;
                  const expanded = isSelected && mod ? (
                    mod.EditorForm ? (
                      <mod.EditorForm
                        config={safeConfig(mod, block.config)}
                        onChange={(config) => editor.updateConfig(block.id, config as Record<string, unknown>)}
                        theme={editor.theme}
                        onThemeChange={editor.updateTheme}
                      />
                    ) : (
                      <AutoForm
                        schema={mod.configSchema}
                        config={safeConfig(mod, block.config)}
                        onChange={(config) => editor.updateConfig(block.id, config)}
                      />
                    )
                  ) : null;
                  return (
                    <SortableBlockRow
                      key={block.id}
                      block={block}
                      selected={isSelected}
                      onSelect={() => editor.setSelectedId(isSelected ? null : block.id)}
                      onToggle={() => editor.toggleVisible(block)}
                      onDelete={() => editor.deleteBlock(block)}
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
                    The fan page uses the same block library as your public site.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                  {(['core', 'gleeworld', 'addon'] as const).map((key) => {
                    const items = BLOCK_LIST.filter((m) => !m.locked && (m.group ?? 'core') === key);
                    if (items.length === 0) return null;
                    const label = key === 'core' ? 'Your essentials' : key === 'gleeworld' ? 'GleeWorld extras' : 'Add-ons';
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
                              onClick={available ? () => { editor.addBlock(mod.type); setPickerOpen(false); } : undefined}
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
                              </div>
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

        <Card className="overflow-hidden">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-sm text-muted-foreground font-normal">Preview</CardTitle>
          </CardHeader>
          <div
            className="bg-white"
            style={{
              ['--site-primary' as string]: editor.theme.primaryColor,
              ['--site-accent' as string]: editor.theme.accentColor,
              fontFamily: fontStack(editor.theme.fontFamily),
              letterSpacing: `${editor.theme.letterSpacing ?? 0}em`,
            }}
          >
            {editor.blocks.map((block) => {
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
                  onConfigChange={(patch) => editor.updateConfig(block.id, { ...cfg, ...patch } as Record<string, unknown>)}
                />
              );
            })}
            {editor.blocks.length === 0 && (
              <div className="p-16 text-center text-muted-foreground">Add blocks to see a preview.</div>
            )}
          </div>
        </Card>
      </div>
    </DashboardPageShell>
  );
}
