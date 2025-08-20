import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

export interface WardrobeItem {
  id: string;
  name: string;
  type: 'formal' | 'casual' | 'costume' | 'accessories';
  size: string;
  status: 'fitted' | 'assigned' | 'needs-fitting';
  created_at: string;
  updated_at: string;
}

export const useWardrobeItems = () => {
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toast } = useToast();

  const fetchWardrobeItems = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Since there's no wardrobe table yet, we'll create mock data based on user profile
      // In a real implementation, you would query a wardrobe_items table
      const mockItems: WardrobeItem[] = [
        {
          id: '1',
          name: 'Black Concert Dress',
          type: 'formal',
          size: 'Medium',
          status: 'fitted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'White Blouse',
          type: 'casual',
          size: 'Medium',
          status: 'assigned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Black Skirt',
          type: 'formal',
          size: 'Medium',
          status: 'fitted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Performance Shoes',
          type: 'accessories',
          size: '8',
          status: 'assigned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setWardrobeItems(mockItems);
    } catch (error) {
      console.error('Error fetching wardrobe items:', error);
      toast({
        title: "Error",
        description: "Failed to load wardrobe items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMeasurements = () => {
    if (!userProfile) return null;
    
    return {
      dressSize: 'Not set',
      shoeSize: 'Not set', 
      height: 'Not set',
      lastUpdated: userProfile.updated_at ? new Date(userProfile.updated_at).toLocaleDateString() : 'Never'
    };
  };

  useEffect(() => {
    fetchWardrobeItems();
  }, [user, userProfile]);

  return {
    wardrobeItems,
    loading,
    fetchWardrobeItems,
    getMeasurements
  };
};