import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Send, MessageSquare, Sparkles, User, Inbox, Tag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const MESSAGE_TAGS = ["S1", "S2", "A1", "A2", "Musical Leadership", "Exec Board", "First-Years", "Sophomores", "Juniors", "Seniors"] as const;
type MessageTag = typeof MESSAGE_TAGS[number];

interface AIAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InternalMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  tags?: string[];
  gw_profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export const AIAssistantDialog = ({ open, onOpenChange }: AIAssistantDialogProps) => {
  const { user } = useAuth();
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [memberMessage, setMemberMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch internal messages
  useEffect(() => {
    if (!open || !user) return;
    
    const fetchMessages = async () => {
      try {
        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('gw_internal_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);

        if (messagesError) throw messagesError;

        // Fetch all unique user profiles
        const userIds = [...new Set(messagesData?.map(m => m.user_id) || [])];
        const { data: profilesData } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        // Map profiles to messages
        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        const enrichedMessages = messagesData?.map(msg => ({
          ...msg,
          gw_profiles: profilesMap.get(msg.user_id) || { full_name: 'Unknown User' }
        })) || [];

        setInternalMessages(enrichedMessages as any);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('internal-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_internal_messages'
        },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();

          const enrichedMessage = {
            ...payload.new,
            gw_profiles: profileData || { full_name: 'Unknown User' }
          };

          setInternalMessages(prev => [...prev, enrichedMessage as any]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [internalMessages]);

  const handleSendMemberMessage = async () => {
    if (!memberMessage.trim() || !user || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('gw_internal_messages')
        .insert({
          user_id: user.id,
          content: memberMessage.trim(),
          tags: selectedTags
        });

      if (error) throw error;
      setMemberMessage("");
      setSelectedTags([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleFilterTag = (tag: string) => {
    setFilterTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredMessages = filterTags.length === 0 
    ? internalMessages 
    : internalMessages.filter(msg => 
        msg.tags?.some(tag => filterTags.includes(tag))
      );

  const handleSendAI = () => {
    if (!aiMessage.trim()) return;
    
    setAiMessages(prev => [...prev, { role: "user", content: aiMessage }]);
    setAiMessage("");
    
    // Mock response for now
    setTimeout(() => {
      setAiMessages(prev => [...prev, { 
        role: "assistant", 
        content: "AI Assistant is coming soon! I'll help you navigate modules, answer questions, and assist with tasks. This feature will be powered by advanced AI to make your experience seamless."
      }]);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0 bg-background">
        {/* Compact Header */}
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Message Center
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="messages" className="flex-1 flex flex-col h-full">
          <div className="px-4 pt-2 pb-2 border-b">
            <TabsList className="grid w-full grid-cols-2 h-9 bg-muted/50">
              <TabsTrigger value="assistant" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-background">
                <Bot className="h-3.5 w-3.5" />
                AI Assistant
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-background">
                <MessageSquare className="h-3.5 w-3.5" />
                Messages
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="assistant" className="flex-1 flex flex-col gap-4 mt-4 px-6 pb-6 m-0">
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4 pr-4">
                {aiMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <Card className="text-center py-16 px-8 max-w-md bg-gradient-to-br from-primary/5 to-transparent border-2 border-dashed">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-20 w-20 bg-primary/10 rounded-full animate-pulse" />
                        </div>
                        <Bot className="h-20 w-20 mx-auto text-primary relative z-10" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">How can I help you today?</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Ask me anything about modules, events, tasks, or the Glee Club
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          Show my modules
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          What's happening today?
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          Help with tasks
                        </Badge>
                      </div>
                    </Card>
                  </div>
                ) : (
                  aiMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="p-2 rounded-full bg-primary/10 h-fit">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <Card
                        className={`px-4 py-3 max-w-[75%] ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </Card>
                      {msg.role === "user" && (
                        <div className="p-2 rounded-full bg-primary/10 h-fit">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <Card className="p-4 bg-background/50 backdrop-blur-sm border-2">
              <div className="flex gap-3">
                <Input
                  placeholder="Ask me anything..."
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendAI()}
                  className="flex-1 bg-background"
                />
                <Button onClick={handleSendAI} size="icon" className="h-10 w-10">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="flex-1 flex flex-col gap-2 m-0">
            {/* Tag Filters - Compact horizontal scroll */}
            <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto">
              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Tag className="h-3 w-3" />
                Filter:
              </div>
              <div className="flex gap-1.5">
                {MESSAGE_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={filterTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer text-xs whitespace-nowrap h-6"
                    onClick={() => toggleFilterTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              {filterTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterTags([])}
                  className="h-6 px-2 text-xs whitespace-nowrap ml-auto"
                >
                  Clear
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-8">
                    <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium mb-1">
                      {filterTags.length > 0 ? 'No messages' : 'No messages yet'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {filterTags.length > 0 ? 'Try different filters' : 'Be the first to send one'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-3">
                  {filteredMessages.map((msg) => {
                    const isCurrentUser = msg.user_id === user?.id;
                    const senderName = msg.gw_profiles?.full_name || 'Unknown User';
                    const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase();
                    
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={msg.gw_profiles?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                          <div className={`flex items-baseline gap-1.5 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-xs font-semibold">{senderName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <Card className={`px-3 py-1.5 ${
                            isCurrentUser 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'bg-muted/50'
                          }`}>
                            <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          </Card>
                          {msg.tags && msg.tags.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-0.5 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              {msg.tags.map(tag => (
                                <Badge 
                                  key={tag} 
                                  variant="secondary" 
                                  className="text-[10px] h-4 px-1.5"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="px-4 py-2 border-t bg-background">
              {/* Tag Selection - Compact inline */}
              <div className="flex items-center gap-2 mb-2 overflow-x-auto">
                <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                {MESSAGE_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer text-[10px] h-5 whitespace-nowrap"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <X className="h-2.5 w-2.5 ml-1" />}
                  </Badge>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Message all members..."
                  value={memberMessage}
                  onChange={(e) => setMemberMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMemberMessage()}
                  className="flex-1 h-9 text-sm"
                  disabled={sendingMessage}
                />
                <Button 
                  onClick={handleSendMemberMessage} 
                  size="icon" 
                  className="h-9 w-9 flex-shrink-0"
                  disabled={sendingMessage || !memberMessage.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
