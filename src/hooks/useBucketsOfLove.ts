import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BucketOfLove {
  id: string;
  message: string;
  note_color: string;
  is_anonymous: boolean;
  likes: number;
  created_at: string;
  decorations?: string;
  sender_name?: string;
  recipient_name?: string;
  user_id?: string;
  recipient_user_id?: string | null;
}

export const useBucketsOfLove = () => {
  const [buckets, setBuckets] = useState<BucketOfLove[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuckets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('gw_buckets_of_love')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;

      // Get user details separately
      const userIds = [...new Set([
        ...data?.map(bucket => bucket.user_id).filter(Boolean) || [],
        ...data?.map(bucket => bucket.recipient_user_id).filter(Boolean) || []
      ])];

      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, display_name, first_name, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Transform the data to include sender/recipient names
      const transformedData = data?.map(bucket => {
        const sender = profileMap.get(bucket.user_id);
        const recipient = bucket.recipient_user_id ? profileMap.get(bucket.recipient_user_id) : null;
        
        return {
          ...bucket,
          sender_name: sender ? 
            (sender.display_name || sender.first_name || sender.full_name) : 
            'Unknown',
          recipient_name: recipient ? 
            (recipient.display_name || recipient.first_name || recipient.full_name) : 
            null
        };
      }) || [];

      setBuckets(transformedData);
    } catch (err) {
      console.error('Error fetching buckets of love:', err);
      setError('Failed to load buckets of love');
    } finally {
      setLoading(false);
    }
  };

  const sendBucketOfLove = async (message: string, noteColor: string = 'pink', isAnonymous: boolean = false, recipientUserId?: string) => {
    try {
      const { error: insertError } = await supabase
        .from('gw_buckets_of_love')
        .insert({
          message,
          note_color: noteColor,
          is_anonymous: isAnonymous,
          recipient_user_id: recipientUserId || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (insertError) throw insertError;
      
      // Refresh the list
      await fetchBuckets();
      return { success: true };
    } catch (err) {
      console.error('Error sending bucket of love:', err);
      return { success: false, error: 'Failed to send bucket of love' };
    }
  };

  const deleteBucket = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('gw_buckets_of_love')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchBuckets();
      return { success: true };
    } catch (err) {
      console.error('Error deleting bucket of love:', err);
      return { success: false, error: 'Failed to delete bucket of love' };
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  return {
    buckets,
    loading,
    error,
    fetchBuckets,
    sendBucketOfLove,
    deleteBucket,
  };
};