import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface MailCenterSectionProps {
  courseId: string;
}

export const MailCenterSection: React.FC<MailCenterSectionProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['course-messages', courseId, user?.id, activeTab],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('course_messages')
        .select('*')
        .eq('course_id', courseId)
        .eq(activeTab === 'inbox' ? 'recipient_id' : 'sender_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  if (isLoading) {
    return <div className="p-6">Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mail Center</h2>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'inbox' ? 'default' : 'outline'}
          onClick={() => setActiveTab('inbox')}
        >
          <Inbox className="h-4 w-4 mr-2" />
          Inbox
        </Button>
        <Button
          variant={activeTab === 'sent' ? 'default' : 'outline'}
          onClick={() => setActiveTab('sent')}
        >
          <Send className="h-4 w-4 mr-2" />
          Sent
        </Button>
      </div>

      <div className="space-y-2">
        {messages && messages.length > 0 ? (
          messages.map((message) => (
            <Card 
              key={message.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                !message.is_read && activeTab === 'inbox' ? 'border-l-4 border-l-primary' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{message.subject}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  {!message.is_read && activeTab === 'inbox' && (
                    <Badge>Unread</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 line-clamp-2">{message.content}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No messages in {activeTab}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
