import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, MessageSquare } from 'lucide-react';
import PhoneNumberStatus from './PhoneNumberStatus';

interface Conversation {
  id: string;
  name: string;
  group_type: string;
  twilio_phone_number: string;
  is_active: boolean;
  unread_count: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation
}) => {
  return (
    <ScrollArea className="h-[200px] lg:h-[calc(100vh-200px)]">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className={cn(
              'w-full p-2 sm:p-3 rounded-lg text-left transition-colors',
              'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
              selectedConversation?.id === conversation.id 
                ? 'bg-primary/10 border border-primary/20' 
                : 'border border-transparent'
            )}
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm truncate">
                    {conversation.name}
                  </h4>
                  {conversation.unread_count > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground mb-2">
                  SMS Group • {conversation.group_type.replace('_', ' ')}
                </div>

                {/* SMS Coverage Status */}
                <div className="mt-2">
                  <PhoneNumberStatus groupType={conversation.group_type} />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ConversationList;