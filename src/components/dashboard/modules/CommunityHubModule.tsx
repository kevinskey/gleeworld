import React, { useState } from 'react';
import { Users, MessageSquare, Heart, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useBucketsOfLove } from '@/hooks/useBucketsOfLove';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MemberDirectory } from '@/components/directory/MemberDirectory';

export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('buckets');
  const [newBucketMessage, setNewBucketMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs' | 'kudos' | 'wellness' | 'tasks'>('all');
  const { user } = useAuth();
  const { buckets, loading, sendBucketOfLove } = useBucketsOfLove();
  const filteredBuckets = buckets; // Placeholder: apply filter when categories are available

  const handleSendBucket = async () => {
    if (!newBucketMessage.trim()) return;
    
    const result = await sendBucketOfLove(newBucketMessage, 'pink', isAnonymous);
    if (result.success) {
      setNewBucketMessage('');
      setIsAnonymous(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Community Hub
        </h3>
      </div>
      
      <Tabs defaultValue="buckets" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 m-2 bg-background/50">
          <TabsTrigger value="buckets" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">Buckets of Love</TabsTrigger>
          <TabsTrigger value="wellness" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">Wellness</TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">Announcements</TabsTrigger>
          <TabsTrigger value="directory" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">Directory</TabsTrigger>
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
                <div className="flex flex-wrap gap-1">
                  {(['all','needs','kudos','wellness','tasks'] as const).map((k) => (
                    <Button
                      key={k}
                      size="sm"
                      variant={activeFilter === k ? 'default' : 'secondary'}
                      className={`h-7 px-3 ${activeFilter === k ? 'shadow-sm' : ''}`}
                      onClick={() => setActiveFilter(k)}
                    >
                      {k === 'all' ? 'All' : k === 'needs' ? 'Needs Reply' : k.charAt(0).toUpperCase() + k.slice(1)}
                    </Button>
                  ))}
                </div>
              </nav>
            </header>

            <ScrollArea className="flex-1 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3 pr-2 pb-4">
                {loading ? (
                  <div className="col-span-full flex items-center justify-center py-16 text-muted-foreground">
                    <Heart className="w-5 h-5 mr-2 animate-pulse text-primary" />
                    Loading buckets of love...
                  </div>
                ) : filteredBuckets.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Heart className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p>No messages yet. Be the first to share some love!</p>
                  </div>
                ) : (
                  filteredBuckets.map((bucket) => (
                    <article
                      key={bucket.id}
                      className="group rounded-lg border border-border bg-card/70 hover:bg-card transition-all shadow-sm p-3 flex flex-col gap-2 hover-scale"
                    >
                      <p className="text-sm text-foreground text-overflow-fade pr-6">
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
                  ))
                )}
              </div>
            </ScrollArea>

            <Card className="mt-3 rounded-xl border border-border bg-card/60 shadow-sm">
              <CardHeader className="pb-2" data-component="card-header">
                <CardTitle className="text-sm md:text-base">Send a Bucket of Love</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder="Write your message of love and encouragement..."
                  value={newBucketMessage}
                  onChange={(e) => setNewBucketMessage(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="accent-current"
                    />
                    <span className="text-muted-foreground">Send anonymously</span>
                  </label>
                  <Button onClick={handleSendBucket} disabled={!newBucketMessage.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
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
        
        <TabsContent value="directory" className="flex-1">
          <MemberDirectory />
        </TabsContent>
      </Tabs>
    </div>
  );
};