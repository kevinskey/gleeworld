import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PollBubble } from '@/components/messaging/PollBubble';
import { PollCreator } from '@/components/messaging/PollCreator';
import { BarChart3, Plus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  type: string;
}

interface PollMessage {
  id: string;
  user_id: string;
  created_at: string;
}

export const GroupPollsPage = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [pollMessages, setPollMessages] = useState<PollMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollsLoading, setPollsLoading] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);

  // Fetch groups user has access to
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('gw_message_groups')
          .select('id, name, type')
          .eq('is_active', true)
          .eq('is_archived', false)
          .order('name');

        if (error) throw error;

        // Sort: All Members first, then alphabetically
        const sorted = (data || []).sort((a, b) => {
          const aIsAllMembers = a.name.toLowerCase().includes('all members');
          const bIsAllMembers = b.name.toLowerCase().includes('all members');
          if (aIsAllMembers && !bIsAllMembers) return -1;
          if (!aIsAllMembers && bIsAllMembers) return 1;
          return a.name.localeCompare(b.name);
        });

        setGroups(sorted);
        
        // Auto-select first group
        if (sorted.length > 0 && !selectedGroupId) {
          setSelectedGroupId(sorted[0].id);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  // Fetch polls for selected group
  useEffect(() => {
    const fetchPolls = async () => {
      if (!selectedGroupId) {
        setPollMessages([]);
        return;
      }

      try {
        setPollsLoading(true);
        
        const { data, error } = await supabase
          .from('gw_group_messages')
          .select('id, user_id, created_at')
          .eq('group_id', selectedGroupId)
          .eq('message_type', 'poll')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPollMessages(data || []);
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        setPollsLoading(false);
      }
    };

    fetchPolls();
  }, [selectedGroupId]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Group Selector */}
      <Card className="bg-card/95 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Select Group
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a group to view polls" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Polls Section */}
      {selectedGroupId && (
        <Card className="bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                {selectedGroup?.name} Polls
              </CardTitle>
              <Button
                onClick={() => setShowPollCreator(!showPollCreator)}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Poll
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Poll Creator */}
            {showPollCreator && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                <PollCreator
                  groupId={selectedGroupId}
                  inline={true}
                  onPollCreated={() => {
                    setShowPollCreator(false);
                    // Refresh polls
                    const fetchPolls = async () => {
                      const { data } = await supabase
                        .from('gw_group_messages')
                        .select('id, user_id, created_at')
                        .eq('group_id', selectedGroupId)
                        .eq('message_type', 'poll')
                        .order('created_at', { ascending: false });
                      setPollMessages(data || []);
                    };
                    fetchPolls();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPollCreator(false)}
                  className="w-full mt-2"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Polls List */}
            <ScrollArea className="max-h-[60vh]">
              {pollsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : pollMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Polls Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Create your first poll to gather opinions from this group.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pr-2">
                  {pollMessages.map((message) => (
                    <PollBubble
                      key={message.id}
                      messageId={message.id}
                      createdBy={message.user_id}
                      createdAt={message.created_at}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
