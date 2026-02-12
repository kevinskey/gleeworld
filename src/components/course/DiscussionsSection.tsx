import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lock, MessageCircle, Plus, Calendar, Award, AlertCircle, Edit, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isFuture, differenceInHours, differenceInWeeks } from 'date-fns';
import { CreateDiscussionDialog } from './CreateDiscussionDialog';
import { DiscussionThread } from './DiscussionThread';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface Discussion {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
  is_locked: boolean;
  reply_count: number;
  course_id: string;
  due_date: string | null;
  max_points: number | null;
  is_graded: boolean | null;
  module_id?: string | null;
}

interface DiscussionsSectionProps {
  courseId: string;
  discussionId?: string | null;
}

export const DiscussionsSection: React.FC<DiscussionsSectionProps> = ({ courseId, discussionId }) => {
  const { user } = useAuth();
  const { isInstructor, isAdmin } = useUserRole();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [editingDiscussion, setEditingDiscussion] = useState<Discussion | null>(null);

  // Only instructors and admins can create/edit discussions
  const canCreateDiscussion = isInstructor() || isAdmin();

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['course-discussions', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('course_discussions').
      select('*').
      eq('course_id', courseId).
      order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as Discussion[];
    }
  });

  // Calculate current week number (semester starts Jan 14, 2026)
  const SEMESTER_START = new Date('2026-01-14');
  const currentWeekNumber = differenceInWeeks(new Date(), SEMESTER_START) + 1;

  // Sort discussions: current week first, then by due_date
  const sortedDiscussions = useMemo(() => {
    if (!discussions) return [];

    // Extract week number from title (e.g., "Week 5: ..." → 5)
    const getWeek = (title: string): number | null => {
      const match = title.match(/^Week\s+(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    };

    return [...discussions].sort((a, b) => {
      const weekA = getWeek(a.title);
      const weekB = getWeek(b.title);
      const isCurrentA = weekA === currentWeekNumber;
      const isCurrentB = weekB === currentWeekNumber;

      // Current week pinned to top
      if (isCurrentA && !isCurrentB) return -1;
      if (!isCurrentA && isCurrentB) return 1;

      // Then by due_date ascending
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [discussions, currentWeekNumber]);

  // Auto-select discussion when discussionId is provided
  useEffect(() => {
    if (discussionId && discussions && discussions.length > 0) {
      const targetDiscussion = discussions.find((d) => d.id === discussionId);
      if (targetDiscussion) {
        setSelectedDiscussion(targetDiscussion);
      }
    }
  }, [discussionId, discussions]);

  const getDueDateBadge = (dueDate: string | null) => {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const hoursUntilDue = differenceInHours(due, new Date());

    if (isPast(due)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Past Due
        </Badge>);

    }

    if (hoursUntilDue <= 24) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-orange-500">
          <Calendar className="h-3 w-3" />
          Due Soon
        </Badge>);

    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        Due {format(due, 'MMM d')}
      </Badge>);

  };

  const handleEditClick = (e: React.MouseEvent, discussion: Discussion) => {
    e.stopPropagation(); // Prevent card click
    setEditingDiscussion(discussion);
    setCreateDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setEditingDiscussion(null);
    }
  };

  if (selectedDiscussion) {
    return (
      <DiscussionThread
        discussion={selectedDiscussion}
        onBack={() => setSelectedDiscussion(null)}
        courseId={courseId} />);


  }

  if (isLoading) {
    return <div className="p-6">Loading discussions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Discussion Forum</h2>
          <p className="text-muted-foreground text-sm">
            Engage with your classmates and instructor
          </p>
        </div>
        {canCreateDiscussion &&
        <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Discussion
          </Button>
        }
      </div>

      <div className="space-y-3">
        {sortedDiscussions.length > 0 ?
        sortedDiscussions.map((discussion) => {
          const weekMatch = discussion.title.match(/^Week\s+(\d+)/i);
          const isCurrentWeek = weekMatch ? parseInt(weekMatch[1], 10) === currentWeekNumber : false;

          return (
            <Card
              key={discussion.id}
              className={`hover:shadow-md transition-shadow cursor-pointer ${isCurrentWeek ? 'ring-2 ring-primary border-primary' : ''}`}
              onClick={() => setSelectedDiscussion(discussion)}>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="truncate">{discussion.title}</span>
                        {isCurrentWeek &&
                        <Badge className="bg-primary text-primary-foreground flex items-center gap-1 flex-shrink-0">
                            <Star className="h-3 w-3" />
                            This Week
                          </Badge>
                        }
                        {discussion.is_locked &&
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        }
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(discussion.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                        {discussion.is_graded &&
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {discussion.max_points} pts
                          </Badge>
                        }
                        {getDueDateBadge(discussion.due_date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canCreateDiscussion &&
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleEditClick(e, discussion)}>

                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {discussion.reply_count || 0}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 line-clamp-2">{discussion.content}</p>
              </CardContent>
            </Card>);

        }) :

        <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No discussions yet</h3>
              <p className="text-muted-foreground mb-4">
                {canCreateDiscussion ?
              "Start a conversation with your students!" :
              "Check back later for discussions from your instructor."}
              </p>
              {canCreateDiscussion &&
            <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start First Discussion
                </Button>
            }
            </CardContent>
          </Card>
        }
      </div>

      <CreateDiscussionDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        courseId={courseId}
        editingDiscussion={editingDiscussion} />

    </div>);

};