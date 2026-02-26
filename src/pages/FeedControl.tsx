import { useState, useEffect } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Rss, Settings2, Newspaper, GraduationCap, RefreshCw, ExternalLink, Zap, Clock, Hash, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface FeedSource {
  id: string;
  feed_type: string;
  name: string;
  url: string;
  icon: string;
  is_active: boolean;
  max_items_per_source: number;
  timeout_ms: number;
  display_order: number;
}

interface FeedSettings {
  id: string;
  feed_type: string;
  max_total_items: number;
  cache_minutes: number;
  is_enabled: boolean;
}

const FeedControl = () => {
  const { user } = useAuth();
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [settings, setSettings] = useState<FeedSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('news');
  const [addOpen, setAddOpen] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', icon: '📰', feed_type: 'news', max_items_per_source: 5, timeout_ms: 8000 });
  const [testing, setTesting] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [srcRes, setRes] = await Promise.all([
      (supabase as any).from('gw_feed_sources').select('*').order('display_order'),
      (supabase as any).from('gw_feed_settings').select('*'),
    ]);
    if (srcRes.data) setSources(srcRes.data);
    if (setRes.data) setSettings(setRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredSources = sources.filter((s) => s.feed_type === tab);
  const currentSettings = settings.find((s) => s.feed_type === tab);

  const updateSource = async (id: string, updates: Partial<FeedSource>) => {
    const { error } = await (supabase as any).from('gw_feed_sources').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update source'); return; }
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
    toast.success('Source updated');
  };

  const deleteSource = async (id: string) => {
    const { error } = await (supabase as any).from('gw_feed_sources').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setSources((prev) => prev.filter((s) => s.id !== id));
    toast.success('Source removed');
  };

  const addSource = async () => {
    const order = filteredSources.length + 1;
    const { data, error } = await (supabase as any).from('gw_feed_sources')
      .insert({ ...newSource, feed_type: tab, display_order: order, created_by: user?.id })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setSources((prev) => [...prev, data]);
    setNewSource({ name: '', url: '', icon: '📰', feed_type: tab, max_items_per_source: 5, timeout_ms: 8000 });
    setAddOpen(false);
    toast.success('Source added');
  };

  const updateSettings = async (updates: Partial<FeedSettings>) => {
    if (!currentSettings) return;
    const { error } = await (supabase as any).from('gw_feed_settings').update({ ...updates, updated_by: user?.id }).eq('id', currentSettings.id);
    if (error) { toast.error('Failed to update settings'); return; }
    setSettings((prev) => prev.map((s) => s.id === currentSettings.id ? { ...s, ...updates } : s));
    toast.success('Settings updated');
  };

  const testSource = async (source: FeedSource) => {
    setTesting(source.id);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), source.timeout_ms);
      const res = await fetch(source.url, {
        headers: { 'User-Agent': 'GleeWorld Feed Test/1.0', Accept: 'application/rss+xml, application/xml, text/xml, */*' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const text = await res.text();
        const itemCount = (text.match(/<item>/gi) || []).length + (text.match(/<entry>/gi) || []).length;
        toast.success(`${source.name}: OK — ${itemCount} items found`);
      } else {
        toast.error(`${source.name}: HTTP ${res.status}`);
      }
    } catch (e: any) {
      toast.error(`${source.name}: ${e.name === 'AbortError' ? 'Timeout' : e.message}`);
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1
          className="text-xl font-bold text-foreground"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Feed Control
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage RSS sources, limits, and refresh timings
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="news" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
            <Newspaper className="h-4 w-4" /> News
          </TabsTrigger>
          <TabsTrigger value="scholarship" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
            <GraduationCap className="h-4 w-4" /> Scholarships
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4 mt-4">
          {/* Settings Strip */}
          {currentSettings && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                Settings
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Max Items
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    value={currentSettings.max_total_items}
                    onChange={(e) => updateSettings({ max_total_items: parseInt(e.target.value) || 25 })}
                    className="h-9 bg-background text-foreground border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Cache (min)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={currentSettings.cache_minutes}
                    onChange={(e) => updateSettings({ cache_minutes: parseInt(e.target.value) || 15 })}
                    className="h-9 bg-background text-foreground border-border"
                  />
                </div>
                <div className="flex items-center gap-2.5 pb-0.5">
                  <Switch
                    checked={currentSettings.is_enabled}
                    onCheckedChange={(checked) => updateSettings({ is_enabled: checked })}
                  />
                  <span className={`text-sm font-medium ${currentSettings.is_enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {currentSettings.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sources Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Sources
              <Badge variant="secondary" className="text-[10px] font-normal">
                {filteredSources.length}
              </Badge>
            </h2>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 border-border text-foreground hover:bg-accent">
                  <Plus className="h-3.5 w-3.5" /> Add Source
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card text-foreground border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add RSS Source</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-foreground">Name</Label>
                    <Input
                      value={newSource.name}
                      onChange={(e) => setNewSource((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. AP News"
                      className="bg-background text-foreground border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground">RSS URL</Label>
                    <Input
                      value={newSource.url}
                      onChange={(e) => setNewSource((p) => ({ ...p, url: e.target.value }))}
                      placeholder="https://..."
                      className="bg-background text-foreground border-border"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-foreground text-xs">Icon</Label>
                      <Input
                        value={newSource.icon}
                        onChange={(e) => setNewSource((p) => ({ ...p, icon: e.target.value }))}
                        className="bg-background text-foreground border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-foreground text-xs">Max Items</Label>
                      <Input
                        type="number"
                        value={newSource.max_items_per_source}
                        onChange={(e) => setNewSource((p) => ({ ...p, max_items_per_source: parseInt(e.target.value) || 5 }))}
                        className="bg-background text-foreground border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-foreground text-xs">Timeout (ms)</Label>
                      <Input
                        type="number"
                        value={newSource.timeout_ms}
                        onChange={(e) => setNewSource((p) => ({ ...p, timeout_ms: parseInt(e.target.value) || 8000 }))}
                        className="bg-background text-foreground border-border"
                      />
                    </div>
                  </div>
                  <Button onClick={addSource} disabled={!newSource.name || !newSource.url} className="w-full">
                    Add Source
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sources List */}
          <div className="space-y-2">
            {filteredSources.length === 0 ? (
              <div className="rounded-lg border border-border bg-card py-10 text-center">
                <Rss className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No sources configured</p>
              </div>
            ) : (
              filteredSources.map((source) => (
                <div
                  key={source.id}
                  className={`rounded-lg border border-border bg-card p-3 transition-opacity ${!source.is_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{source.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">{source.name}</span>
                        <Badge
                          variant={source.is_active ? 'default' : 'secondary'}
                          className={`text-[10px] ${source.is_active ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                        >
                          {source.is_active ? 'Active' : 'Off'}
                        </Badge>
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground truncate block hover:underline max-w-sm"
                      >
                        {source.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="hidden sm:inline text-[11px] text-muted-foreground mr-1">
                        {source.max_items_per_source}×{source.timeout_ms / 1000}s
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => testSource(source)}
                        disabled={testing === source.id}
                        title="Test feed"
                      >
                        {testing === source.id
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <Zap className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => updateSource(source.id, { is_active: !source.is_active })}
                        title={source.is_active ? 'Disable' : 'Enable'}
                      >
                        {source.is_active
                          ? <ToggleRight className="h-4 w-4 text-green-500" />
                          : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteSource(source.id)}
                        title="Delete source"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedControl;
