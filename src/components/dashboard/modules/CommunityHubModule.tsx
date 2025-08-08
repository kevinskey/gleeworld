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
import { MemberDirectory } from '@/components/directory/MemberDirectory';

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
        
        <TabsContent value="buckets" className="flex-1 p-4">
          <div className="space-y-4">
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

            {/* Send new bucket form - Redesigned */}
            <Card className="relative p-6 bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 border-2 border-pink-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fade-in overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute -top-2 -right-2 w-16 h-16 bg-pink-200/30 rounded-full blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-rose-200/20 rounded-full blur-2xl"></div>
              
              <div className="relative space-y-4">
                {/* Header with animated icon */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-pink-200 rounded-full animate-pulse opacity-50"></div>
                    <div className="relative p-2 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full shadow-lg">
                      <Heart className="w-5 h-5 text-white animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                      Send a Bucket of Love
                    </h3>
                    <p className="text-sm text-pink-600/70">Spread positivity and encouragement</p>
                  </div>
                </div>
                
                {/* Enhanced textarea */}
                <div className="relative">
                  <Textarea
                    placeholder="Write your message of love and encouragement here... ✨"
                    value={newBucketMessage}
                    onChange={(e) => setNewBucketMessage(e.target.value)}
                    className="min-h-[100px] bg-white/80 backdrop-blur-sm border-2 border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 rounded-xl text-gray-700 placeholder:text-pink-400/60 resize-none transition-all duration-300 shadow-inner"
                    style={{
                      backgroundImage: 'linear-gradient(135deg, rgba(251, 207, 232, 0.1) 0%, rgba(251, 207, 232, 0.05) 100%)'
                    }}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-pink-400">
                    {newBucketMessage.length}/500
                  </div>
                </div>
                
                {/* Enhanced controls */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-3 text-sm group cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border-2 rounded-md transition-all duration-200 ${
                        isAnonymous 
                          ? 'bg-pink-500 border-pink-500 shadow-inner' 
                          : 'bg-white border-pink-300 group-hover:border-pink-400'
                      }`}>
                        {isAnonymous && (
                          <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-pink-700 font-medium group-hover:text-pink-800 transition-colors">
                      Send anonymously
                    </span>
                  </label>
                  
                  <Button 
                    onClick={handleSendBucket}
                    disabled={!newBucketMessage.trim()}
                    size="lg"
                    className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:via-rose-600 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none px-6 py-2.5 font-semibold"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Love
                    <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>
                </div>
                
                {/* Character count and tips */}
                <div className="pt-2 border-t border-pink-200/50">
                  <div className="flex items-center justify-between text-xs text-pink-600/60">
                    <span>💝 Your message will brighten someone's day</span>
                    <span className={newBucketMessage.length > 400 ? 'text-rose-500 font-medium' : ''}>
                      {500 - newBucketMessage.length} characters remaining
                    </span>
                  </div>
                </div>
              </div>
            </Card>
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
        
        <TabsContent value="directory" className="flex-1">
          <MemberDirectory />
        </TabsContent>
      </Tabs>
    </div>
  );
};