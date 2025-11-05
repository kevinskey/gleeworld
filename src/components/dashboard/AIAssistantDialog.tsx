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
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <DialogHeader className="relative px-6 py-5">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  Message Center & AI Assistant
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Powered by AI
                  </Badge>
                </div>
                <DialogDescription className="text-sm">
                  Get help, ask questions, or check your messages
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <Tabs defaultValue="assistant" className="flex-1 flex flex-col h-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50">
              <TabsTrigger value="assistant" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Bot className="h-4 w-4" />
                <span className="font-medium">AI Assistant</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Messages</span>
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  0
                </Badge>
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

          <TabsContent value="messages" className="flex-1 flex flex-col gap-4 mt-4 px-6 pb-6 m-0">
            {/* Tag Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter:</span>
              {MESSAGE_TAGS.map(tag => (
                <Badge
                  key={tag}
                  variant={filterTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFilterTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {filterTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterTags([])}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1" ref={scrollRef}>
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  </div>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <Card className="text-center py-16 px-8 max-w-md bg-gradient-to-br from-muted/50 to-transparent border-2 border-dashed">
                    <Inbox className="h-20 w-20 mx-auto mb-6 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold mb-3">
                      {filterTags.length > 0 ? 'No messages with selected tags' : 'Start the conversation'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {filterTags.length > 0 
                        ? 'Try selecting different tags or clear the filters' 
                        : 'Be the first to send a message to the group'
                      }
                    </p>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {filteredMessages.map((msg) => {
                    const isCurrentUser = msg.user_id === user?.id;
                    const senderName = msg.gw_profiles?.full_name || 'Unknown User';
                    const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase();
                    
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={msg.gw_profiles?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-sm font-medium">{senderName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="max-w-[75%] space-y-1">
                            <Card className={`px-4 py-2 ${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-muted/50'
                            }`}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            </Card>
                            {msg.tags && msg.tags.length > 0 && (
                              <div className={`flex flex-wrap gap-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                {msg.tags.map(tag => (
                                  <Badge 
                                    key={tag} 
                                    variant="secondary" 
                                    className="text-xs h-5"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <Card className="p-4 bg-background/50 backdrop-blur-sm border-2">
              {/* Tag Selection */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b">
                  {selectedTags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="default"
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Tag Options */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Tags:
                </span>
                {MESSAGE_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex gap-3">
                <Input
                  placeholder="Send a message to all members..."
                  value={memberMessage}
                  onChange={(e) => setMemberMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMemberMessage()}
                  className="flex-1 bg-background"
                  disabled={sendingMessage}
                />
                <Button 
                  onClick={handleSendMemberMessage} 
                  size="icon" 
                  className="h-10 w-10"
                  disabled={sendingMessage || !memberMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
