import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type?: string;
  is_featured?: boolean;
  publish_date?: string;
  expire_date?: string;
  created_by?: string;
  target_audience?: string;
  created_at?: string;
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | null;
  recurrence_start_date?: string;
  recurrence_end_date?: string;
  last_recurrence_at?: string;
  parent_announcement_id?: string;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  announcement_type?: string;
  target_audience?: string;
  expire_date?: string;
  is_featured?: boolean;
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | null;
  recurrence_start_date?: string;
  recurrence_end_date?: string;
}

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnnouncements = async (retryCount = 0) => {
    const maxRetries = 2;
    
    // Only set loading true on first attempt
    if (retryCount === 0) {
      setLoading(true);
    }
    
    try {
      // Fetch both announcements and recent communications
      const [announcementsResult, communicationsResult] = await Promise.all([
        supabase
          .from('gw_announcements')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('gw_communications')
          .select('*')
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(10)
      ]);

      if (announcementsResult.error) throw announcementsResult.error;

      // Combine announcements and communications, converting communications to announcement format
      const announcements = announcementsResult.data || [];
      const communications = (communicationsResult.data || []).map(comm => ({
        id: comm.id,
        title: comm.title,
        content: comm.content,
        announcement_type: 'communication',
        is_featured: false,
        created_at: comm.sent_at || comm.created_at,
        publish_date: comm.sent_at,
        created_by: comm.sender_id
      }));

      // Merge and sort by date
      const allAnnouncements = [...announcements, ...communications]
        .sort((a, b) => new Date(b.created_at || b.publish_date).getTime() - new Date(a.created_at || a.publish_date).getTime());

      setAnnouncements(allAnnouncements);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      
      // Retry on network errors
      if (retryCount < maxRetries && (error.message?.includes('Load failed') || error.message?.includes('network'))) {
        console.log(`Retrying fetch announcements (attempt ${retryCount + 2}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchAnnouncements(retryCount + 1);
      }
      
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load announcements. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const createAnnouncement = async (data: CreateAnnouncementData) => {
    try {
      // Clean up empty strings for timestamp fields
      const cleanedData = {
        ...data,
        expire_date: data.expire_date || null,
        recurrence_start_date: data.recurrence_start_date || null,
        recurrence_end_date: data.recurrence_end_date || null,
        recurrence_type: data.is_recurring ? data.recurrence_type : null,
        is_recurring: data.is_recurring || false,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };
      
      const { error } = await supabase
        .from('gw_announcements')
        .insert([cleanedData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: data.is_recurring 
          ? `Recurring announcement created (${data.recurrence_type})` 
          : "Announcement created successfully",
      });

      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
      return false;
    }
  };

  const publishAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_announcements')
        .update({ publish_date: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement published successfully",
      });

      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error('Error publishing announcement:', error);
      toast({
        title: "Error",
        description: "Failed to publish announcement",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<CreateAnnouncementData>) => {
    try {
      // Clean up empty strings for timestamp fields
      const cleanedUpdates = {
        ...updates,
        expire_date: updates.expire_date || null,
        recurrence_start_date: updates.recurrence_start_date || null,
        recurrence_end_date: updates.recurrence_end_date || null,
        recurrence_type: updates.is_recurring ? updates.recurrence_type : null,
      };
      
      const { error } = await supabase
        .from('gw_announcements')
        .update(cleanedUpdates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement updated successfully",
      });

      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      // First, try to find if this is an announcement or communication
      const announcement = announcements.find(a => a.id === id);
      
      if (!announcement) {
        toast({
          title: "Error",
          description: "Item not found",
          variant: "destructive",
        });
        return false;
      }

      // Check if it's a communication (has announcement_type === 'communication')
      if (announcement.announcement_type === 'communication') {
        return await deleteCommunication(id);
      }

      // Otherwise, delete as a regular announcement
      const { error } = await supabase
        .from('gw_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });

      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCommunication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_communications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Communication deleted successfully",
      });

      await fetchAnnouncements();
      return true;
    } catch (error) {
      console.error('Error deleting communication:', error);
      toast({
        title: "Error",
        description: "Failed to delete communication",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return {
    announcements,
    loading,
    createAnnouncement,
    publishAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    deleteCommunication,
    refetch: fetchAnnouncements,
  };
};
