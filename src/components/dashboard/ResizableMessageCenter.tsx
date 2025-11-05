import { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Inbox, Tag, X, Minimize2, Maximize2, XIcon, ChevronDown, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const MESSAGE_TAGS = ["S1", "S2", "A1", "A2", "Musical Leadership", "Exec Board", "First-Years", "Sophomores", "Juniors", "Seniors"] as const;
type MessageTag = typeof MESSAGE_TAGS[number];

interface ResizableMessageCenterProps {
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

export const ResizableMessageCenter = ({ open, onOpenChange }: ResizableMessageCenterProps) => {
  const { user } = useAuth();
  const [memberMessage, setMemberMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

  return (
    <Rnd
      default={{
        x: window.innerWidth > 768 
          ? (window.innerWidth - 500) / 2 
          : (window.innerWidth - (window.innerWidth - 40)) / 2,
        y: 100,
        width: window.innerWidth > 768 ? 500 : window.innerWidth - 40,
        height: window.innerHeight > 768 ? 650 : window.innerHeight - 140
      }}
      minWidth={320}
      minHeight={isMinimized ? 48 : 500}
      maxWidth={window.innerWidth - 40}
      maxHeight={window.innerHeight - 100}
      bounds="window"
      dragHandleClassName="message-center-drag-handle"
      style={{ zIndex: 999999, position: 'fixed' }}
      className="z-[999999]"
      enableResizing={!isMinimized}
    >
      <div ref={portalRef} className="h-full w-full bg-background border-2 border-primary/20 rounded-lg shadow-2xl flex flex-col overflow-visible">
        {/* Header - Draggable */}
        <div className="message-center-drag-handle px-3 py-2 border-b bg-card cursor-move flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Glee Message Center</h2>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-7 w-7 p-0"
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 p-0"
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Tag Filters */}
            <div className="flex items-center gap-2 px-2 py-1.5 border-b">
              <DropdownMenu modal={false} onOpenChange={(o) => console.log('Filter dropdown open:', o)}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Filter className="h-3 w-3 mr-1.5" />
                    Filters
                    {filterTags.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[9px]">
                        {filterTags.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-3 w-3 ml-1.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal container={portalRef.current || undefined}>
                  <DropdownMenuContent align="start" sideOffset={6} collisionPadding={8} className="w-56 z-[9999999] pointer-events-auto"  style={{ zIndex: 9999999 }} onInteractOutside={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuLabel>Filter Messages</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {MESSAGE_TAGS.map(tag => (
                      <DropdownMenuCheckboxItem
                        key={tag}
                        checked={filterTags.includes(tag)}
                        onCheckedChange={() => toggleFilterTag(tag)}
                      >
                        {tag}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {filterTags.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFilterTags([])}
                          className="w-full h-8 text-xs"
                        >
                          Clear Filters
                        </Button>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
              {filterTags.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {filterTags.map(tag => (
                    <Badge key={tag} variant="default" className="text-[9px] h-4 px-1">
                      {tag}
                      <X 
                        className="h-2 w-2 ml-0.5 cursor-pointer" 
                        onClick={() => toggleFilterTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-2 py-1" ref={scrollRef}>
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
                <div className="space-y-2 py-2">
                  {filteredMessages.map((msg) => {
                    const isCurrentUser = msg.user_id === user?.id;
                    const senderName = msg.gw_profiles?.full_name || 'Unknown User';
                    const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase();
                    
                    return (
                      <div key={msg.id} className={`flex gap-1.5 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={msg.gw_profiles?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 max-w-[80%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                          <div className={`flex items-baseline gap-1 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-[11px] font-semibold">{senderName}</span>
                            <span className="text-[9px] text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <Card className={`px-2 py-1.5 ${
                            isCurrentUser 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'bg-muted/50'
                          }`}>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          </Card>
                          {msg.tags && msg.tags.length > 0 && (
                            <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              {msg.tags.map(tag => (
                                <Badge 
                                  key={tag} 
                                  variant="secondary" 
                                  className="text-[9px] h-3.5 px-1"
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

            {/* Message Input */}
            <div className="px-2 py-1.5 border-t bg-background">
              {/* Tag Selection */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 text-xs">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      Tags
                      {selectedTags.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-3.5 px-0.5 text-[9px]">
                          {selectedTags.length}
                        </Badge>
                      )}
                      <ChevronDown className="h-2.5 w-2.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal container={portalRef.current || undefined}>
                    <DropdownMenuContent align="start" sideOffset={6} collisionPadding={8} className="w-52 z-[9999999] pointer-events-auto" style={{ zIndex: 9999999 }} onInteractOutside={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                      <DropdownMenuLabel>Tag this message</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {MESSAGE_TAGS.map(tag => (
                        <DropdownMenuCheckboxItem
                          key={tag}
                          checked={selectedTags.includes(tag)}
                          onCheckedChange={() => toggleTag(tag)}
                        >
                          {tag}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 flex-1">
                    {selectedTags.map(tag => (
                      <Badge key={tag} variant="default" className="text-[9px] h-4 px-1">
                        {tag}
                        <X 
                          className="h-2 w-2 ml-0.5 cursor-pointer" 
                          onClick={() => toggleTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Field */}
              <div className="flex gap-1.5">
                <Input
                  placeholder="Message all members..."
                  value={memberMessage}
                  onChange={(e) => setMemberMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMemberMessage()}
                  className="flex-1 h-8 text-xs"
                  disabled={sendingMessage}
                />
                <Button 
                  onClick={handleSendMemberMessage} 
                  size="icon" 
                  className="h-8 w-8 flex-shrink-0"
                  disabled={sendingMessage || !memberMessage.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Rnd>
  );
};
