import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const usePollNotifications = (groupId: string, groupName: string) => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !groupId) return;

    // Subscribe to new polls in this group
    const pollChannel = supabase
      .channel(`new-polls:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gw_polls',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          // Don't notify if user created the poll
          if (payload.new.created_by === user.id) return;

          toast({
            title: '📊 New Poll Available',
            description: `${groupName}: "${payload.new.question}"`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      pollChannel.unsubscribe();
    };
  }, [user, groupId, groupName, toast]);
};
