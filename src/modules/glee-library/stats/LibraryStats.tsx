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
}

interface LibraryStatsProps {
  stats: LibraryStatsData;
  loading?: boolean;
}

export const LibraryStats = ({ stats, loading = false }: LibraryStatsProps) => {
  if (loading) {
    return (
      <div className="w-full max-w-md">
        <Card className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="h-6 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
              <div className="text-center">
                <div className="h-6 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
              <div className="text-center">
                <div className="h-6 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Library Overview
          </CardTitle>
          <div className="p-2 rounded-full bg-blue-50">
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">
                {stats.totalDigital}
              </div>
              <p className="text-xs text-muted-foreground">
                Digital
              </p>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {stats.totalPhysical}
              </div>
              <p className="text-xs text-muted-foreground">
                Physical
              </p>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-600">
                {stats.bothFormats}
              </div>
              <p className="text-xs text-muted-foreground">
                Both
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};