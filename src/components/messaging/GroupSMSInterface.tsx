import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send, Phone, Users, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGroupSMSStatus,
  useCreateSMSConversation,
  useSendGroupSMS,
  useSMSConversationMessages,
  useRealtimeSMSMessages
} from '@/hooks/useGroupSMS';
import { format } from 'date-fns';

interface GroupSMSInterfaceProps {
  groupId: string;
  groupName: string;
}

export const GroupSMSInterface: React.FC<GroupSMSInterfaceProps> = ({
  groupId,
  groupName
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [twilioNumber, setTwilioNumber] = useState('+1234567890'); // Default placeholder
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: smsStatus } = useGroupSMSStatus(groupId);
  const createConversation = useCreateSMSConversation();
  const sendGroupSMS = useSendGroupSMS();
  
  const { data: messages = [] } = useSMSConversationMessages(
    smsStatus?.conversation?.id
  );

  // Set up real-time subscription
  useRealtimeSMSMessages(smsStatus?.conversation?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCreateConversation = async () => {
    if (!twilioNumber.trim()) {
      return;
    }

    createConversation.mutate({
      groupId,
      twilioPhoneNumber: twilioNumber.trim()
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !smsStatus?.conversation || !user) {
      return;
    }

    const senderName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'User';

    sendGroupSMS.mutate({
      conversationId: smsStatus.conversation.id,
      message: message.trim(),
      senderUserId: user.id,
      senderName
    });

    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch {
      return '';
    }
  };

  const formatMessageDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy');
    } catch {
      return '';
    }
  };

  const getDisplayName = (message: any) => {
    if (message.gw_profiles?.first_name) {
      return message.gw_profiles.first_name;
    }
    if (message.gw_profiles?.full_name) {
      return message.gw_profiles.full_name.split(' ')[0];
    }
    return message.sender_phone.slice(-4); // Last 4 digits as fallback
  };

  if (!smsStatus?.hasConversation) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <MessageSquare className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-xl">Enable Group SMS</CardTitle>
          <p className="text-muted-foreground">
            Set up group SMS for <strong>{groupName}</strong> to enable 
            GroupMe-style messaging where all members can send and receive messages.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Twilio Phone Number</label>
            <Input
              placeholder="+1234567890"
              value={twilioNumber}
              onChange={(e) => setTwilioNumber(e.target.value)}
              className="text-center"
            />
            <p className="text-xs text-muted-foreground">
              Enter the Twilio phone number that will be used for this group conversation
            </p>
          </div>
          
          <Button 
            onClick={handleCreateConversation}
            disabled={createConversation.isPending || !twilioNumber.trim()}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {createConversation.isPending ? 'Setting Up...' : 'Enable Group SMS'}
          </Button>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              How it works:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All group members can send SMS messages to the shared number</li>
              <li>• Messages are automatically forwarded to all other group members</li>
              <li>• Works just like GroupMe or group text messaging</li>
              <li>• Messages appear in the format: "GroupName: FirstName: message"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{groupName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                SMS: {smsStatus.conversation?.twilio_phone_number}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Phone className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isCurrentUser = msg.sender_user_id === user?.id;
                const showDate = index === 0 || 
                  formatMessageDate(messages[index - 1].created_at) !== formatMessageDate(msg.created_at);
                
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                          {formatMessageDate(msg.created_at)}
                        </span>
                      </div>
                    )}
                    
                    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            isCurrentUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {!isCurrentUser && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {getDisplayName(msg)}
                            </p>
                          )}
                          <p className="text-sm">{msg.message_body}</p>
                        </div>
                        <p className={`text-xs text-muted-foreground mt-1 ${
                          isCurrentUser ? 'text-right' : 'text-left'
                        }`}>
                          {formatMessageTime(msg.created_at)}
                          {msg.direction === 'outbound' && (
                            <span className="ml-1">
                              {msg.status === 'delivered' ? '✓' : 
                               msg.status === 'sending' ? '⏳' : '✗'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <Separator />
        
        {/* Message Input */}
        <div className="p-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={sendGroupSMS.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendGroupSMS.isPending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Messages will be sent to all group members via SMS
          </p>
        </div>
      </CardContent>
    </Card>
  );
};