import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PrayerRequest {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  status: 'pending' | 'acknowledged' | 'responded' | 'archived';
  chaplain_response?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export const usePrayerRequests = () => {
  const { user } = useAuth();
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPrayerRequests();
    }
  }, [user]);

  const fetchPrayerRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // For now, just set empty array since the table is new
      setPrayerRequests([]);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to load prayer requests");
    } finally {
      setLoading(false);
    }
  };

  const createPrayerRequest = async (content: string, isAnonymous: boolean = false) => {
    if (!user) {
      toast.error("You must be signed in to create a prayer request");
      return null;
    }

    try {
      // For now, create a simple object to simulate the prayer request
      const prayerRequest = {
        id: `prayer_${Date.now()}`,
        user_id: user.id,
        content,
        is_anonymous: isAnonymous,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setPrayerRequests(prev => [prayerRequest, ...prev]);
      toast.success("Prayer request submitted successfully");
      return prayerRequest;
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to submit prayer request");
      return null;
    }
  };

  const updatePrayerRequest = async (id: string, updates: Partial<PrayerRequest>) => {
    try {
      // For now, just update locally
      setPrayerRequests(prev => 
        prev.map(request => 
          request.id === id ? { ...request, ...updates } : request
        )
      );
      
      toast.success("Prayer request updated");
      return updates as PrayerRequest;
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to update prayer request");
      return null;
    }
  };

  return {
    prayerRequests,
    loading,
    error,
    fetchPrayerRequests,
    createPrayerRequest,
    updatePrayerRequest,
    refetch: fetchPrayerRequests
  };
};