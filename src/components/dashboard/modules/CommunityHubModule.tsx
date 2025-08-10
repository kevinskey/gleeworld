import React, { useState, useMemo } from 'react';
import { Users, MessageSquare, Heart, Send, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBucketsOfLove } from '@/hooks/useBucketsOfLove';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MemberDirectory } from '@/components/directory/MemberDirectory';
import { MobileBucketCard } from '@/components/buckets-of-love/MobileBucketCard';
import { MobileComposeSheet } from '@/components/buckets-of-love/MobileComposeSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationsSection } from '@/components/unified/NotificationsSection';
import SendBucketOfLove from '@/components/buckets-of-love/SendBucketOfLove';

export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('buckets');
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs' | 'kudos' | 'wellness' | 'tasks'>('all');
  const { user } = useAuth();
  const { buckets, loading, fetchBuckets } = useBucketsOfLove();
  const isMobile = useIsMobile();

  const filteredBuckets = useMemo(() => {
    if (!buckets) return [] as typeof buckets;
    if (activeFilter === 'all') return buckets;

    const contains = (text: string, patterns: string[]) => {
      const lower = (text || '').toLowerCase();
      return patterns.some((p) => lower.includes(p));
    };

    return buckets.filter((b) => {
      const msg = b.message || '';
      switch (activeFilter) {
        case 'needs':
          return contains(msg, ['?', 'please reply', 'can you', 'need help', 'urgent', 'respond']);
        case 'kudos':
          return contains(msg, ['kudos', 'congrats', 'congratulations', 'bravo', 'proud', 'amazing', 'great job', 'well done', 'thank you', 'thanks']);
        case 'wellness':
          return contains(msg, ['wellness', 'rest', 'health', 'hydrate', 'sleep', 'vocal', 'voice', 'warmup', 'sick', 'recover']);
        case 'tasks':
          return contains(msg, ['task', 'todo', 'to-do', 'deadline', 'due', 'submit', 'action', 'reminder', 'practice', 'rehearsal']);
        default:
          return true;
      }
    });
  }, [buckets, activeFilter]);
  const handleBucketSent = () => {
    fetchBuckets();
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="p-4 md:p-6 border-b border-border bg-gradient-to-r from-primary/15 via-accent/10 to-secondary/15">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Community Hub
            </h1>
            <p className="text-sm text-muted-foreground">To Amaze and Inspire — Buckets of Love, Wellness, Notifications, Announcements</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="default" onClick={() => setActiveTab('buckets')} className="hover-scale">
              <Heart className="h-4 w-4 mr-1" /> Buckets of Love
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setActiveTab('wellness')} className="hover-scale">
              Wellness
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveTab('announcements')} className="hover-scale">
              Announcements
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveTab('notifications')} className="hover-scale">
              <Bell className="h-4 w-4 mr-1" /> Notifications
            </Button>
            <SendBucketOfLove trigger={
              <Button size="sm" variant="ghost" className="hover-scale">
                <Send className="h-4 w-4 mr-1" /> Send Love
              </Button>
            } />
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className={`grid w-full grid-cols-5 m-2 bg-background/50 ${isMobile ? 'text-xs' : ''}`}>
          <TabsTrigger data-tab-target="buckets" value="buckets" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
            {isMobile ? 'Love' : 'Buckets of Love'}
          </TabsTrigger>
          <TabsTrigger data-tab-target="wellness" value="wellness" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
            Wellness
          </TabsTrigger>
          <TabsTrigger data-tab-target="announcements" value="announcements" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            {isMobile ? 'News' : 'Announcements'}
          </TabsTrigger>
          <TabsTrigger data-tab-target="notifications" value="notifications" className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700">
            Notifications
          </TabsTrigger>
          <TabsTrigger data-tab-target="directory" value="directory" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
            Directory
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="buckets" className="flex-1 p-3 md:p-4">
          <section aria-labelledby="bol-title" className="h-full flex flex-col animate-fade-in">
            <header className="shrink-0 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-accent/10 to-background/20 px-3 py-2">
              <div className="flex items-center justify-between">
                <h2 id="bol-title" className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Buckets of Love
                </h2>
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="secondary" className="bg-background/60">
                    {filteredBuckets.length} notes
                  </Badge>
                </div>
              </div>
              <nav aria-label="Buckets filters" className="mt-2">
                <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
                  {(['all','needs','kudos','wellness','tasks'] as const).map((k) => (
                    <Button
                      key={k}
                      size="sm"
                      variant={activeFilter === k ? 'default' : 'ghost'}
                      className="text-xs lg:text-sm whitespace-nowrap"
                      onClick={() => setActiveFilter(k)}
                    >
                      {k === 'all' ? 'All' : k === 'needs' ? 'Needs Reply' : k.charAt(0).toUpperCase() + k.slice(1)}
                    </Button>
                  ))}
                </div>
              </nav>
            </header>

            <ScrollArea className="flex-1 mt-3">
              <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3'} pr-2 pb-4`}>
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Heart className="w-5 h-5 mr-2 animate-pulse text-primary" />
                    Loading buckets of love...
                  </div>
                ) : filteredBuckets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Heart className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p>No messages yet. Be the first to share some love!</p>
                  </div>
                ) : (
                  filteredBuckets.map((bucket) => (
                    isMobile ? (
                      <MobileBucketCard key={bucket.id} bucket={bucket} />
                    ) : (
                      <article
                        key={bucket.id}
                        className="group rounded-lg border border-border bg-card/70 hover:bg-card transition-all shadow-sm p-3 flex flex-col gap-2 hover-scale"
                      >
                        <p className="text-xs md:text-sm text-foreground text-overflow-fade pr-6 leading-snug">
                          {bucket.message}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {bucket.is_anonymous ? 'Anonymous' : (bucket.sender_name?.substring(0, 18) || 'Unknown')}
                          </span>
                          <div className="flex items-center gap-3">
                            {bucket.likes > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {bucket.likes}
                              </span>
                            )}
                            <span>
                              {formatDistanceToNow(new Date(bucket.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </article>
                    )
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Mobile-optimized compose */}
            {isMobile ? (
              <div className="mt-3 p-3 bg-background/95 backdrop-blur-sm border-t border-border">
                <MobileComposeSheet onSent={handleBucketSent} />
              </div>
            ) : (
              <Card className="mt-3 rounded-xl border border-border bg-card/60 shadow-sm">
                <CardHeader className="pb-2" data-component="card-header">
                  <CardTitle className="text-sm md:text-base">Send a Bucket of Love</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <MobileComposeSheet onSent={handleBucketSent} />
                </CardContent>
              </Card>
            )}
          </section>
        </TabsContent>
        
        <TabsContent value="wellness" className="flex-1 p-4 bg-gradient-to-b from-green-50/50 to-background">
          <div className="text-center text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="mb-2 font-medium text-green-700">Wellness & Mental Health</p>
            <p className="text-sm mb-4">Support your well-being and connect with resources</p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300">
                Daily Check-in
              </Button>
              <Button variant="outline" size="sm" className="w-full bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                Wellness Resources
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="announcements" className="flex-1 p-4 bg-gradient-to-b from-blue-50/50 to-background">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-blue-500" />
            <p className="font-medium text-blue-700 mb-2">No new announcements</p>
            <p className="text-sm">Stay tuned for important updates</p>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="flex-1 p-4">
          <NotificationsSection />
        </TabsContent>
        
        <TabsContent value="directory" className="flex-1">
          <MemberDirectory />
        </TabsContent>
      </Tabs>
    </div>
  );
};