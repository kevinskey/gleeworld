import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

export interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  size?: string;
  color?: string;
  status: 'checked_out' | 'available' | 'needs_fitting';
  checked_out_at?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface WardrobeProfile {
  formal_dress_size?: string;
  polo_size?: string;
  tshirt_size?: string;
  lipstick_shade?: string;
  pearl_status?: string;
  bust_measurement?: number;
  waist_measurement?: number;
  hips_measurement?: number;
  inseam_measurement?: number;
  height_measurement?: number;
  measurements_taken_date?: string;
  measurements_taken_by?: string;
}

export const useWardrobeItems = () => {
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [wardrobeProfile, setWardrobeProfile] = useState<WardrobeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toast } = useToast();

  const fetchWardrobeItems = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch user's checked out wardrobe items
      const { data: checkouts, error: checkoutError } = await supabase
        .from('wardrobe_checkouts')
        .select(`
          id,
          quantity,
          size,
          color,
          checked_out_at,
          due_date,
          status,
          wardrobe_items:item_id (
            id,
            name,
            category
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'checked_out');

      if (checkoutError) throw checkoutError;

      // Transform the data to match our interface
      const items: WardrobeItem[] = (checkouts || []).map(checkout => ({
        id: checkout.id,
        name: checkout.wardrobe_items?.name || 'Unknown Item',
        category: checkout.wardrobe_items?.category || 'unknown',
        size: checkout.size,
        color: checkout.color,
        status: 'checked_out' as const,
        checked_out_at: checkout.checked_out_at,
        due_date: checkout.due_date,
        created_at: checkout.checked_out_at,
        updated_at: checkout.checked_out_at
      }));

      setWardrobeItems(items);
    } catch (error) {
      console.error('Error fetching wardrobe items:', error);
      setWardrobeItems([]); // Set empty array instead of mock data
      toast({
        title: "Error",
        description: "Failed to load wardrobe items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWardrobeProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_member_wardrobe_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setWardrobeProfile(data);
    } catch (error) {
      console.error('Error fetching wardrobe profile:', error);
      toast({
        title: "Error",
        description: "Failed to load wardrobe profile",
        variant: "destructive",
      });
    }
  };

  const getMeasurements = () => {
    if (!wardrobeProfile) return {
      dressSize: 'Not set',
      shoeSize: 'Not set', 
      height: 'Not set',
      bust: 'Not set',
      waist: 'Not set',
      hips: 'Not set',
      inseam: 'Not set',
      lastUpdated: 'Never',
      takenBy: 'Not recorded'
    };
    
    return {
      dressSize: wardrobeProfile.formal_dress_size || 'Not set',
      poloSize: wardrobeProfile.polo_size || 'Not set',
      tshirtSize: wardrobeProfile.tshirt_size || 'Not set',
      shoeSize: 'Not available', // Not in current schema
      height: wardrobeProfile.height_measurement ? `${wardrobeProfile.height_measurement}"` : 'Not set',
      bust: wardrobeProfile.bust_measurement ? `${wardrobeProfile.bust_measurement}"` : 'Not set',
      waist: wardrobeProfile.waist_measurement ? `${wardrobeProfile.waist_measurement}"` : 'Not set',
      hips: wardrobeProfile.hips_measurement ? `${wardrobeProfile.hips_measurement}"` : 'Not set',
      inseam: wardrobeProfile.inseam_measurement ? `${wardrobeProfile.inseam_measurement}"` : 'Not set',
      lastUpdated: wardrobeProfile.measurements_taken_date ? new Date(wardrobeProfile.measurements_taken_date).toLocaleDateString() : 'Never',
      takenBy: wardrobeProfile.measurements_taken_by ? 'Wardrobe Mistress' : 'Not recorded'
    };
  };

  useEffect(() => {
    if (user) {
      fetchWardrobeItems();
      fetchWardrobeProfile();
    }
  }, [user]);

  return {
    wardrobeItems,
    wardrobeProfile,
    loading,
    fetchWardrobeItems,
    fetchWardrobeProfile,
    getMeasurements
  };
};