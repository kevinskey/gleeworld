import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileText, Package, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LibrarianStatsData {
  totalScores: number;
  digitalOnly: number;
  physicalCopies: number;
  bothFormats: number;
  needsLocation: number;
  needsInventory: number;
}

export const LibrarianStats = () => {
  const [stats, setStats] = useState<LibrarianStatsData>({
    totalScores: 0,
    digitalOnly: 0,
    physicalCopies: 0,
    bothFormats: 0,
    needsLocation: 0,
    needsInventory: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('pdf_url, physical_copies_count, physical_location, last_inventory_date');

      if (error) throw error;

      const calculatedStats = data?.reduce(
        (acc, item) => {
          const hasDigital = !!item.pdf_url;
          const hasPhysical = (item.physical_copies_count || 0) > 0;
          const hasBoth = hasDigital && hasPhysical;
          
          return {
            totalScores: acc.totalScores + 1,
            digitalOnly: acc.digitalOnly + (hasDigital && !hasPhysical ? 1 : 0),
            physicalCopies: acc.physicalCopies + (item.physical_copies_count || 0),
            bothFormats: acc.bothFormats + (hasBoth ? 1 : 0),
            needsLocation: acc.needsLocation + (hasPhysical && !item.physical_location ? 1 : 0),
            needsInventory: acc.needsInventory + (hasPhysical && !item.last_inventory_date ? 1 : 0),
          };
        },
        {
          totalScores: 0,
          digitalOnly: 0,
          physicalCopies: 0,
          bothFormats: 0,
          needsLocation: 0,
          needsInventory: 0,
        }
      ) || stats;

      setStats(calculatedStats);
    } catch (error) {
      console.error('Error fetching librarian stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Scores',
      value: stats.totalScores,
      icon: BookOpen,
      description: 'All music pieces',
    },
    {
      title: 'Digital Only',
      value: stats.digitalOnly,
      icon: FileText,
      description: 'PDF files only',
    },
    {
      title: 'Physical Copies',
      value: stats.physicalCopies,
      icon: Package,
      description: 'Hard copy count',
    },
    {
      title: 'Both Formats',
      value: stats.bothFormats,
      icon: BookOpen,
      description: 'Digital + Physical',
    },
    {
      title: 'Needs Location',
      value: stats.needsLocation,
      icon: MapPin,
      description: 'Missing location info',
      variant: 'warning' as const,
    },
    {
      title: 'Needs Inventory',
      value: stats.needsInventory,
      icon: Package,
      description: 'Never inventoried',
      variant: 'warning' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className={stat.variant === 'warning' ? 'border-yellow-300' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stat.value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};