import React, { useState } from 'react';
import { X, Send, Search, Filter, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface MessagesPanelProps {
  onClose: () => void;
}

export const MessagesPanel = ({ onClose }: MessagesPanelProps) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const conversations = [
    {
      id: '1',
      name: 'Dr. Johnson',
      role: 'Director',
      lastMessage: 'Great job on the weekend rehearsal!',
      timestamp: '2m ago',
      unread: true,
      avatar: null
    },
    {
      id: '2',
      name: 'Sarah Williams',
      role: 'President',
      lastMessage: 'Meeting scheduled for tomorrow at 3 PM',
      timestamp: '1h ago',
      unread: true,
      avatar: null
    },
    {
      id: '3',
      name: 'Executive Board',
      role: 'Group',
      lastMessage: 'Tour schedule updates available',
      timestamp: '3h ago',
      unread: false,
      avatar: null
    }
  ];

  const messages = [
    {
      id: '1',
      sender: 'Dr. Johnson',
      content: 'Great job on the weekend rehearsal! The alto section really shined.',
      timestamp: '2:34 PM',
      isOwn: false
    },
    {
      id: '2',
      sender: 'You',
      content: 'Thank you! We\'ve been working hard on those harmonies.',
      timestamp: '2:36 PM',
      isOwn: true
    }
  ];

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className="w-80 border-r border-border bg-background">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search conversations..." className="pl-10" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Pin className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <Card 
                key={conversation.id}
                className={`p-3 mb-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedConversation === conversation.id ? 'bg-muted border-primary' : ''
                }`}
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={conversation.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {conversation.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate">{conversation.name}</p>
                      <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-1">{conversation.role}</p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unread && (
                        <Badge variant="destructive" className="w-2 h-2 rounded-full p-0 ml-2" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-border bg-background">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    D
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Dr. Johnson</p>
                  <p className="text-sm text-muted-foreground">Director</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};