// /admin/feed-control — customer-friendly RSS feed picker.
// Curated catalog + paste-a-URL input. No technical fields, sensible defaults.
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Rss, Trash2, Plus, Newspaper, GraduationCap, Loader2, ExternalLink } from 'lucide-react';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type FeedType = 'news' | 'scholarship';

interface FeedSource {
  id: string;
  feed_type: FeedType;
  name: string;
  url: string;
  icon: string;
  is_active: boolean;
}

const CATALOG: Record<FeedType, Array<{ name: string; url: string; icon: string; blurb: string }>> = {
  news: [
    { name: 'NPR Music', url: 'https://feeds.npr.org/1039/rss.xml', icon: '🎵', blurb: 'NPR\'s daily music coverage.' },
    { name: 'Chorus America', url: 'https://chorusamerica.org/feed', icon: '🎼', blurb: 'Choral news, advocacy, and resources.' },
    { name: 'NAfME News', url: 'https://nafme.org/feed/', icon: '🎺', blurb: 'National Association for Music Education updates.' },
    { name: 'Classical Net Reviews', url: 'https://www.classical.net/music/recs/reviews.rss', icon: '🎻', blurb: 'Classical recording reviews.' },
    { name: 'BBC Music Magazine', url: 'https://www.classical-music.com/rss', icon: '🎹', blurb: 'Classical features and reviews.' },
    { name: 'Operawire', url: 'https://operawire.com/feed/', icon: '🎭', blurb: 'Daily opera news.' },
  ],
  scholarship: [
    { name: 'Sallie Mae Scholarships', url: 'https://www.salliemae.com/college-planning/feeds/scholarships.rss', icon: '🎓', blurb: 'General scholarship listings.' },
    { name: 'Fastweb Scholarships', url: 'https://www.fastweb.com/college-scholarships.rss', icon: '🎓', blurb: 'Search-driven scholarship alerts.' },
    { name: 'Scholarships360', url: 'https://scholarships360.org/feed/', icon: '🎓', blurb: 'Curated scholarship roundups.' },
    { name: 'Music Scholarship Foundation', url: 'https://www.musicscholarshipfoundation.org/feed', icon: '🎶', blurb: 'Music-specific awards.' },
    { name: 'Davidson Fellows', url: 'https://www.davidsongifted.org/Programs/Fellowship.rss', icon: '🏆', blurb: 'High-achieving student awards.' },
  ],
};

export default function FeedControl() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<FeedType>('news');
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [adding, setAdding] = useState(false);
  const [gnTopic, setGnTopic] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);

  const { data: sources = [] } = useQuery<FeedSource[]>({
    queryKey: ['feed-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_feed_sources')
        .select('id, feed_type, name, url, icon, is_active')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeedSource[];
    },
  });

  const byUrl = useMemo(() => {
    const map = new Map<string, FeedSource>();
    sources.forEach((s) => map.set(s.url, s));
    return map;
  }, [sources]);

  async function toggleCatalogItem(item: { name: string; url: string; icon: string }, on: boolean) {
    const existing = byUrl.get(item.url);
    if (existing) {
      const { error } = await supabase.from('gw_feed_sources')
        .update({ is_active: on }).eq('id', existing.id);
      if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    } else if (on) {
      const { error } = await supabase.from('gw_feed_sources').insert({
        feed_type: tab, name: item.name, url: item.url, icon: item.icon,
        is_active: true, created_by: user?.id,
      });
      if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    }
    qc.invalidateQueries({ queryKey: ['feed-sources'] });
  }

  async function addCustom() {
    if (!customUrl.trim() || !customName.trim()) return;
    setAdding(true);
    try {
      let url = customUrl.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      const { error } = await supabase.from('gw_feed_sources').insert({
        feed_type: tab,
        name: customName.trim(),
        url,
        icon: tab === 'news' ? '📰' : '🎓',
        is_active: true,
        created_by: user?.id,
      });
      if (error) throw error;
      setCustomUrl(''); setCustomName('');
      qc.invalidateQueries({ queryKey: ['feed-sources'] });
      toast({ title: 'Feed added' });
    } catch (e: any) {
      toast({ title: 'Could not add feed', description: e.message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  }

  // Google News publishes a search-RSS endpoint, so any topic string
  // becomes a feed — no scraping, no API key. Comma-separated topics must
  // become an OR query: Google ANDs bare terms, and a query like
  // "ai music, choral, claude cli" matches nothing (empty feed → empty rail).
  async function addGoogleNewsTopic() {
    const topic = gnTopic.trim();
    if (!topic) return;
    const query = topic
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.includes(' ') ? `"${t}"` : t))
      .join(' OR ');
    setAddingTopic(true);
    try {
      const { error } = await supabase.from('gw_feed_sources').insert({
        feed_type: 'news',
        name: `Google News · ${topic}`,
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
        icon: '📰',
        is_active: true,
        created_by: user?.id,
      });
      if (error) throw error;
      setGnTopic('');
      qc.invalidateQueries({ queryKey: ['feed-sources'] });
      toast({ title: 'Google News topic added' });
    } catch (e: any) {
      toast({ title: 'Could not add topic', description: e.message, variant: 'destructive' });
    } finally {
      setAddingTopic(false);
    }
  }

  async function deleteSource(id: string) {
    const { error } = await supabase.from('gw_feed_sources').delete().eq('id', id);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else qc.invalidateQueries({ queryKey: ['feed-sources'] });
  }

  const currentCatalog = CATALOG[tab];
  const customSources = sources.filter(
    (s) => s.feed_type === tab && !currentCatalog.some((c) => c.url === s.url)
  );

  return (
    <DashboardPageShell
      title="Feed Control"
      icon={Rss}
      subtitle="Pick what shows up in the News and Scholarship widgets on your dashboard. Until you turn on a source of your own, your site uses the GleeWorld default news mix (Google News choral & music education, NPR Music); once you add any source here, only your list is used."
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as FeedType)}>
        <TabsList>
          <TabsTrigger value="news" className="gap-2"><Newspaper className="w-4 h-4" /> News</TabsTrigger>
          <TabsTrigger value="scholarship" className="gap-2"><GraduationCap className="w-4 h-4" /> Scholarships</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-6 mt-4">
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardHeader>
              <CardTitle>Popular {tab === 'news' ? 'music & education' : 'scholarship'} feeds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentCatalog.map((item) => {
                const existing = byUrl.get(item.url);
                const isOn = !!existing?.is_active;
                return (
                  <div key={item.url} className="flex items-center justify-between border rounded-lg p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <span>{item.icon}</span> {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{item.blurb}</div>
                    </div>
                    <Switch checked={isOn} onCheckedChange={(v) => toggleCatalogItem(item, v)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {tab === 'news' && (
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardHeader><CardTitle>Google News topics</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Follow any topic — Google News headlines about it join your feed.
                  Separate topics with commas to match any of them.
                  Try your ensemble's name, your city's arts scene, or a genre like gospel choir.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Topic (e.g., HBCU choirs, a cappella, Atlanta arts)"
                    value={gnTopic}
                    onChange={(e) => setGnTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void addGoogleNewsTopic(); }}
                    className="sm:flex-1"
                  />
                  <Button onClick={addGoogleNewsTopic} disabled={addingTopic || !gnTopic.trim()}>
                    {addingTopic ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add topic
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardHeader><CardTitle>Add your own</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Paste an RSS feed URL from a blog, podcast, or news site. Most sites have one — look for an Rss icon at the bottom of their page.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Name (e.g., Our school blog)" value={customName} onChange={(e) => setCustomName(e.target.value)} className="sm:col-span-1" />
                <Input placeholder="https://example.com/feed" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} className="sm:col-span-2" />
              </div>
              <Button onClick={addCustom} disabled={adding || !customUrl.trim() || !customName.trim()}>
                {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add feed
              </Button>
            </CardContent>
          </Card>

          {customSources.length > 0 && (
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardHeader><CardTitle>Your custom feeds</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {customSources.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border rounded-lg p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{s.icon} {s.name}</div>
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate max-w-full">
                        <ExternalLink className="w-3 h-3 shrink-0" /> <span className="truncate">{s.url}</span>
                      </a>
                    </div>
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={async (v) => {
                        const { error } = await supabase.from('gw_feed_sources').update({ is_active: v }).eq('id', s.id);
                        if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
                        else qc.invalidateQueries({ queryKey: ['feed-sources'] });
                      }}
                    />
                    <Button variant="ghost" size="sm" onClick={() => deleteSource(s.id)} aria-label="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
  );
}
