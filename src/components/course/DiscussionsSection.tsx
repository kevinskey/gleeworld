import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lock, MessageCircle, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CreateDiscussionDialog } from './CreateDiscussionDialog';
import { DiscussionThread } from './DiscussionThread';
import { useAuth } from '@/contexts/AuthContext';

interface Discussion {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
  is_locked: boolean;
  reply_count: number;
  course_id: string;
}

interface DiscussionsSectionProps {
  courseId: string;
}

export const DiscussionsSection: React.FC<DiscussionsSectionProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['course-discussions', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_discussions')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Discussion[];
    }
  });

  if (selectedDiscussion) {
    return (
      <DiscussionThread
        discussion={selectedDiscussion}
        onBack={() => setSelectedDiscussion(null)}
        courseId={courseId}
      />
    );
  }

  if (isLoading) {
    return <div className="p-6">Loading discussions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discussion Forum</h2>
          <p className="text-muted-foreground text-sm">
            Engage with your classmates and instructor
          </p>
        </div>
        {user && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Discussion
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {discussions && discussions.length > 0 ? (
          discussions.map((discussion) => (
            <Card 
              key={discussion.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedDiscussion(discussion)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="truncate">{discussion.title}</span>
                        {discussion.is_locked && (
                          <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(discussion.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
                    <MessageCircle className="h-3 w-3" />
                    {discussion.reply_count || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 line-clamp-2">{discussion.content}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No discussions yet</h3>
              <p className="text-muted-foreground mb-4">
                Start a conversation with your classmates!
              </p>
              {user && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start First Discussion
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateDiscussionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        courseId={courseId}
      />
    </div>
  );
};
