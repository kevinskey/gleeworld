import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, Users, Gift, MessageSquare, Filter } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";
import { useBucketsOfLove } from "@/hooks/useBucketsOfLove";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export const BucketsOfLoveModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const { buckets, loading, sendBucketOfLove } = useBucketsOfLove();
  const [newMessage, setNewMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const isMobile = useIsMobile();

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    const result = await sendBucketOfLove(newMessage, 'pink', isAnonymous);
    if (result.success) {
      setNewMessage('');
      setIsAnonymous(false);
      setShowCompose(false);
    }
  };

  if (isFullPage) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-primary/5 to-secondary/10">

        {/* Mobile-optimized content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick stats bar */}
          <div className="flex gap-2 p-3 bg-muted/30 overflow-x-auto">
            <div className="flex items-center gap-2 px-3 py-1 bg-pink-100 rounded-full text-xs whitespace-nowrap">
              <Heart className="h-3 w-3 text-pink-500" />
              <span className="font-medium text-pink-700">{buckets.length} messages</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-xs whitespace-nowrap">
              <Users className="h-3 w-3 text-primary" />
              <span className="font-medium text-primary">Community support</span>
            </div>
          </div>

          {/* Messages feed */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-3 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Heart className="h-5 w-5 mr-2 animate-pulse text-pink-500" />
                  <span className="text-sm text-muted-foreground">Loading messages...</span>
                </div>
              ) : buckets.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-8 w-8 mx-auto mb-3 text-pink-300" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to share some love!</p>
                </div>
              ) : (
                buckets.map((bucket) => (
                  <Card key={bucket.id} className="border-l-4 border-l-pink-300 bg-card/50 hover:bg-card/70 transition-colors">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm leading-relaxed text-foreground">
                          {bucket.message}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Heart className="h-3 w-3 text-pink-400" />
                            <span className="font-medium">
                              {bucket.is_anonymous ? 'Anonymous' : (bucket.sender_name || 'Unknown')}
                            </span>
                          </div>
                          <span>
                            {formatDistanceToNow(new Date(bucket.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {bucket.recipient_name && (
                          <div className="text-xs text-muted-foreground">
                            To: {bucket.recipient_name}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Mobile-optimized compose button */}
        <div className="p-3 bg-background/95 backdrop-blur-sm border-t border-border">
          {showCompose ? (
            <Card className="bg-pink-50/50 border-pink-200">
              <CardContent className="p-4 space-y-3">
                <Textarea
                  placeholder="Share your love and encouragement..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[80px] resize-none bg-background/50"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded accent-pink-500"
                    />
                    <span className="text-muted-foreground">Anonymous</span>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCompose(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSend}
                      disabled={!newMessage.trim()}
                      className="text-xs bg-pink-500 hover:bg-pink-600"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              onClick={() => setShowCompose(true)}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              size="lg"
            >
              <Heart className="h-4 w-4 mr-2" />
              Share Love & Encouragement
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-pink-200 bg-gradient-to-br from-pink-50/50 to-rose-50/30 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-pink-700">
          <Heart className="h-5 w-5" />
          Buckets of Love
        </CardTitle>
        <CardDescription>Community support and encouragement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-pink-500" />
            <span className="text-muted-foreground">{buckets.length} messages</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-pink-500" />
            <span className="text-muted-foreground">Active community</span>
          </div>
        </div>
        {buckets.length > 0 && (
          <div className="bg-white/60 rounded-lg p-3 border border-pink-100">
            <p className="text-xs text-muted-foreground mb-1">Latest message:</p>
            <p className="text-sm line-clamp-2 text-foreground">
              "{buckets[0]?.message}"
            </p>
            <p className="text-xs text-pink-600 mt-1">
              - {buckets[0]?.is_anonymous ? 'Anonymous' : buckets[0]?.sender_name}
            </p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate?.('buckets-of-love')}
          className="w-full border-pink-200 text-pink-700 hover:bg-pink-50"
        >
          <Heart className="h-3 w-3 mr-2" />
          View All Messages
        </Button>
      </CardContent>
    </Card>
  );
};