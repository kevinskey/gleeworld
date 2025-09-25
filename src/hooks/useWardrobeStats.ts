import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WardrobeStats {
  totalItems: number;
  checkedOut: number;
  overdue: number;
  lowStock: number;
  notifications: number;
}

export const useWardrobeStats = () => {
  const [stats, setStats] = useState<WardrobeStats>({
    totalItems: 0,
    checkedOut: 0,
    overdue: 0,
    lowStock: 0,
    notifications: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Get total items from gw_wardrobe_inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('gw_wardrobe_inventory')
        .select('id, quantity_total, low_stock_threshold');

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
      }

      // Get checked out items from gw_wardrobe_checkouts
      const { data: checkoutData, error: checkoutError } = await supabase
        .from('gw_wardrobe_checkouts')
        .select('id, status, due_date')
        .eq('status', 'checked_out');

      if (checkoutError) {
        console.error('Error fetching checkouts:', checkoutError);
      }

      // Get notifications count (for now set to 0)
      const notifications = 0;

      // Calculate overdue items
      const now = new Date();
      const overdueItems = checkoutData?.filter(checkout => 
        checkout.due_date && new Date(checkout.due_date) < now
      ) || [];

      // Calculate low stock items (items with quantity below threshold)
      const lowStockItems = inventoryData?.filter(item => 
        (item.quantity_total || 0) <= (item.low_stock_threshold || 2)
      ) || [];

      setStats({
        totalItems: inventoryData?.length || 0,
        checkedOut: checkoutData?.length || 0,
        overdue: overdueItems.length,
        lowStock: lowStockItems.length,
        notifications
      });
    } catch (error) {
      console.error('Error fetching wardrobe stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
};