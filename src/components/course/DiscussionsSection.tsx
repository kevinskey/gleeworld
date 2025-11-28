import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lock, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DiscussionsSectionProps {
  courseId: string;
}

export const DiscussionsSection: React.FC<DiscussionsSectionProps> = ({ courseId }) => {
  const { data: discussions, isLoading } = useQuery({
    queryKey: ['course-discussions', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_discussions')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="p-6">Loading discussions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Discussions</h2>
        <Button>
          <MessageSquare className="h-4 w-4 mr-2" />
          New Discussion
        </Button>
      </div>

      <div className="space-y-4">
        {discussions && discussions.length > 0 ? (
          discussions.map((discussion) => (
            <Card key={discussion.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {discussion.title}
                        {discussion.is_locked && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(discussion.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
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
            <CardContent className="py-8 text-center text-muted-foreground">
              No discussions yet. Start a conversation!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
