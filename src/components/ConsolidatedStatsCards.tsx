import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, Users, Activity, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConsolidatedStatsCardsProps {
  totalContracts: number;
  completedCount: number;
  pendingCount: number;
  recentContracts: any[];
  w9FormsCount?: number;
  templatesCount?: number;
  onNewContract: () => void;
  onViewContract: (contractId: string) => void;
}

export const ConsolidatedStatsCards = ({ 
  totalContracts, 
  completedCount, 
  pendingCount,
  recentContracts,
  w9FormsCount = 0,
  templatesCount = 0,
  onNewContract,
  onViewContract
}: ConsolidatedStatsCardsProps) => {
  const recentItems = recentContracts.slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Quick Stats Card - Consolidated */}
      <Card className="border-brand-300/40 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-500" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              <div>
                <p className="text-sm text-muted-foreground">Contracts</p>
                <p className="font-semibold">{totalContracts}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-semibold text-green-700">{completedCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="font-semibold text-orange-700">{pendingCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">W9 Forms</p>
                <p className="font-semibold text-blue-700">{w9FormsCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity - Consolidated */}
      <Card className="border-brand-300/40 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-500" />
              Recent Activity
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNewContract}
              className="h-8 px-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentItems.length > 0 ? (
            <div className="space-y-2">
              {recentItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onViewContract(item.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={item.status === 'completed' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No recent contracts</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onNewContract}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create First Contract
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Overview - Consolidated */}
      <Card className="border-brand-300/40 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-500" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Contract Templates</span>
              <Badge variant="outline">{templatesCount}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <Badge variant="default">
                {totalContracts > 0 ? Math.round((completedCount / totalContracts) * 100) : 0}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Rate</span>
              <Badge variant="secondary">
                {totalContracts > 0 ? Math.round((pendingCount / totalContracts) * 100) : 0}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};