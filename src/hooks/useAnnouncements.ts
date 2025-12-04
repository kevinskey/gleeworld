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
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  announcement_type?: string;
  target_audience?: string;
  expire_date?: string;
  is_featured?: boolean;
}

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      
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
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAnnouncement = async (data: CreateAnnouncementData) => {
    try {
      // Clean up empty strings for timestamp fields
      const cleanedData = {
        ...data,
        expire_date: data.expire_date || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };
      
      const { error } = await supabase
        .from('gw_announcements')
        .insert([cleanedData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Announcement created successfully",
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