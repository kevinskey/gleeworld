import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Default card order
export const DEFAULT_CARD_ORDER: string[] = [
  'hero-carousel',
  'favorites',
  'ai-assistant',
  'search-filters',
  'modules'
];

export type DashboardCard = 'hero-carousel' | 'announcements' | 'favorites' | 'ai-assistant' | 'search-filters' | 'modules';

export const useDashboardCardOrder = () => {
  const { user } = useAuth();
  const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_CARD_ORDER);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setCardOrder(DEFAULT_CARD_ORDER);
      setLoading(false);
      return;
    }

    fetchCardOrder();
  }, [user]);

  const fetchCardOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_dashboard_card_order')
        .select('card_order')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.card_order && Array.isArray(data.card_order)) {
        setCardOrder(data.card_order);
      } else {
        setCardOrder(DEFAULT_CARD_ORDER);
      }
    } catch (error) {
      console.error('Error fetching card order:', error);
      setCardOrder(DEFAULT_CARD_ORDER);
    } finally {
      setLoading(false);
    }
  };

  const saveCardOrder = async (newOrder: string[]) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('gw_dashboard_card_order')
        .upsert({
          user_id: user.id,
          card_order: newOrder,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setCardOrder(newOrder);
      toast.success('Dashboard layout saved');
    } catch (error) {
      console.error('Error saving card order:', error);
      toast.error('Failed to save dashboard layout');
    } finally {
      setIsSaving(false);
    }
  };

  const resetCardOrder = async () => {
    await saveCardOrder([...DEFAULT_CARD_ORDER]);
  };

  return {
    cardOrder,
    loading,
    isSaving,
    saveCardOrder,
    resetCardOrder
  };
};
