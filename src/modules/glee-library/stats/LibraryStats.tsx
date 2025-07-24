import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Package, 
  DollarSign, 
  Clock,
  FileText,
  Star,
  TrendingUp
} from 'lucide-react';

export interface LibraryStatsData {
  totalDigital: number;
  totalPhysical: number;
  bothFormats: number;
  needsInventory: number;
  totalValue: number;
  recentUploads: number;
  popularPieces: number;
}

interface LibraryStatsProps {
  stats: LibraryStatsData;
  loading?: boolean;
}

export const LibraryStats = ({ stats, loading = false }: LibraryStatsProps) => {
  const statCards = [
    {
      title: 'Digital Library',
      value: stats.totalDigital,
      description: 'PDF scores available',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Physical Copies',
      value: stats.totalPhysical,
      description: 'Hard copies in stock',
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Both Formats',
      value: stats.bothFormats,
      description: 'Available in both formats',
      icon: Star,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      title: 'Needs Inventory',
      value: stats.needsInventory,
      description: 'Physical copies to count',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Total Value',
      value: `$${stats.totalValue.toLocaleString()}`,
      description: 'Estimated library worth',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      title: 'Recent Activity',
      value: stats.recentUploads,
      description: 'Uploads this month',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon;
        
        return (
          <Card 
            key={index} 
            className={`transition-all duration-200 hover:shadow-md border-l-4 ${stat.borderColor}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <IconComponent className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
              
              {/* Show trend indicator for applicable stats */}
              {(stat.title === 'Recent Activity' && stats.recentUploads > 0) && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
              
              {(stat.title === 'Both Formats' && stats.bothFormats > 0) && (
                <Badge variant="default" className="mt-2 text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
              
              {(stat.title === 'Needs Inventory' && stats.needsInventory > 0) && (
                <Badge variant="destructive" className="mt-2 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Action Required
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};