import React, { useState } from 'react';
import { Users, MessageSquare, Calendar, Heart, Send, Plus, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useBucketsOfLove } from '@/hooks/useBucketsOfLove';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('buckets');
  const [newBucketMessage, setNewBucketMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { user } = useAuth();
  const { buckets, loading, sendBucketOfLove } = useBucketsOfLove();

  const handleSendBucket = async () => {
    if (!newBucketMessage.trim()) return;
    
    const result = await sendBucketOfLove(newBucketMessage, 'pink', isAnonymous);
    if (result.success) {
      setNewBucketMessage('');
      setIsAnonymous(false);
    }
  };

  const getNoteColorClass = (color: string) => {
    switch (color) {
      case 'pink': return 'bg-pink-200 text-pink-900';
      case 'blue': return 'bg-blue-200 text-blue-900';
      case 'yellow': return 'bg-yellow-200 text-yellow-900';
      case 'green': return 'bg-green-200 text-green-900';
      case 'purple': return 'bg-purple-200 text-purple-900';
      default: return 'bg-pink-200 text-pink-900';
    }
  };

  const getRandomRotation = (id: number) => {
    const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-0'];
    return rotations[id % rotations.length];
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
        
        <TabsContent value="buckets" className="flex-1 p-4 bg-gradient-to-b from-amber-50/50 to-background">
          <div className="space-y-4">
            {/* Send new bucket form */}
            <Card className="p-4 bg-pink-50/50 border-pink-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="font-medium text-pink-700">Send a Bucket of Love</span>
                </div>
                <Textarea
                  placeholder="Share some love and encouragement..."
                  value={newBucketMessage}
                  onChange={(e) => setNewBucketMessage(e.target.value)}
                  className="bg-white border-pink-200 focus:border-pink-300"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-pink-300"
                    />
                    Send anonymously
                  </label>
                  <Button 
                    onClick={handleSendBucket}
                    disabled={!newBucketMessage.trim()}
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Love
                  </Button>
                </div>
              </div>
            </Card>

            {/* Cork board with post-it notes */}
            <div className="relative p-6 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 rounded-lg border-4 border-amber-900 shadow-lg min-h-[400px]" 
                 style={{
                   backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0),
                                    radial-gradient(circle at 75px 75px, rgba(255,255,255,0.1) 2px, transparent 0)`,
                   backgroundSize: '100px 100px'
                 }}>
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-amber-100">
                    <Heart className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                    <p>Loading buckets of love...</p>
                  </div>
                </div>
              ) : buckets.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-amber-100">
                    <Heart className="w-8 h-8 mx-auto mb-2" />
                    <p>No buckets of love yet</p>
                    <p className="text-sm">Be the first to share some love!</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-min">
                  {buckets.map((bucket, index) => (
                    <div 
                      key={bucket.id} 
                      className={`relative ${getRandomRotation(parseInt(bucket.id))} transform transition-all duration-200 hover:scale-105 hover:z-10 cursor-pointer`}
                      style={{ gridRow: `span ${Math.ceil(bucket.message.length / 30) + 1}` }}
                    >
                      <div className={`p-3 w-40 h-40 ${getNoteColorClass(bucket.note_color)} shadow-lg border-none relative overflow-hidden`}>
                        {/* Tape effect at top */}
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-white/60 border border-gray-200 shadow-sm"></div>
                        
                        <div className="h-full flex flex-col justify-between text-sm">
                          <p className="font-medium leading-tight overflow-hidden text-sm">
                            {bucket.message.length > 50 ? `${bucket.message.substring(0, 50)}...` : bucket.message}
                          </p>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              {bucket.is_anonymous ? (
                                <span className="text-xs opacity-70">Anonymous</span>
                              ) : (
                                <span className="text-xs opacity-70">
                                  {bucket.sender_name?.substring(0, 12) || 'Unknown'}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              {bucket.likes > 0 && (
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3 fill-current" />
                                  <span className="text-xs">{bucket.likes}</span>
                                </span>
                              )}
                              <span className="text-xs opacity-60">
                                {formatDistanceToNow(new Date(bucket.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
        
        <TabsContent value="directory" className="flex-1 p-4 bg-gradient-to-b from-purple-50/50 to-background">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 text-purple-500" />
            <p className="font-medium text-purple-700 mb-2">Quick member lookup</p>
            <Button variant="outline" size="sm" className="mt-2 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300">
              View Full Directory
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};