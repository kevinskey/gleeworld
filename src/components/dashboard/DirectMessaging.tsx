import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, ArrowLeft, Search, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PushNotificationToggle } from './PushNotificationToggle';

interface UserSearchResult {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

export const DirectMessaging = () => {
  const { user } = useAuth();
  const { conversations, messages, loading, fetchMessages, sendMessage, createConversation } = useDirectMessages();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const conversationMessages = selectedConversationId ? messages[selectedConversationId] || [] : [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationMessages]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Search for users
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url')
        .neq('user_id', user.id)
        .ilike('full_name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Start conversation with a user
  const handleStartConversation = async (otherUserId: string) => {
    const conversationId = await createConversation(otherUserId);
    if (conversationId) {
      setSelectedConversationId(conversationId);
      setShowUserSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || sending) return;

    setSending(true);
    try {
      await sendMessage(selectedConversationId, messageInput);
      setMessageInput('');
    } catch (error) {
      // Error already handled in hook
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // User search view
  if (showUserSearch) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowUserSearch(false)} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold">New Message</h3>
        </div>
        
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-1">
            {searchResults.map(result => {
              const initials = result.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
              return (
                <Card
                  key={result.user_id}
                  className="p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleStartConversation(result.user_id)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={result.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{result.full_name}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Conversation view
  if (selectedConversationId && selectedConversation) {
    return (
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="p-3 border-b flex items-center gap-2 flex-shrink-0 bg-background">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedConversationId(null)} 
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={selectedConversation.other_user_avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {selectedConversation.other_user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-sm font-semibold flex-1 min-w-0 truncate">{selectedConversation.other_user_name}</h3>
        </div>

        {/* Messages - Scrollable area */}
        <div className="flex-1 overflow-y-auto px-3 py-2" ref={scrollRef}>
          {conversationMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-8">
                <MessageCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No messages yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {conversationMessages.map(msg => {
                const isCurrentUser = msg.sender_id === user?.id;
                const initials = msg.sender_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

                return (
                  <div key={msg.id} className={`flex gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={msg.sender_avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <span className="text-[10px] text-muted-foreground px-1">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      <Card className={`px-3 py-2 ${
                        isCurrentUser 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-muted/50'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input - Sticky at bottom */}
        <div className="px-3 py-3 border-t flex-shrink-0 bg-background">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="flex-1 h-11 text-sm"
              disabled={sending}
            />
            <Button 
              onClick={handleSendMessage} 
              size="icon" 
              className="h-11 w-11 flex-shrink-0"
              disabled={sending || !messageInput.trim()}
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          {messageInput.trim() && (
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Press Enter to send
            </p>
          )}
        </div>
      </div>
    );
  }

  // Conversation list view
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Direct Messages</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowUserSearch(true)}
            className="h-7 text-xs"
          >
            New Message
          </Button>
        </div>
        <PushNotificationToggle />
      </div>

      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8 px-4">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs font-medium mb-1">No conversations yet</p>
              <p className="text-xs text-muted-foreground mb-3">Start a conversation with a member</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowUserSearch(true)}
                className="h-8 text-xs"
              >
                New Message
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map(convo => {
              const initials = convo.other_user_name.split(' ').map(n => n[0]).join('').toUpperCase();
              return (
                <Card
                  key={convo.id}
                  className="p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedConversationId(convo.id)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarImage src={convo.other_user_avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-semibold truncate">{convo.other_user_name}</span>
                        {convo.unread_count > 0 && (
                          <Badge variant="default" className="h-4 px-1 text-[9px] min-w-[16px] justify-center">
                            {convo.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};