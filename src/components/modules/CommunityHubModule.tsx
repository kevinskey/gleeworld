import React from 'react';
import { ModuleProps } from '@/types/unified-modules';
import { CommunityLayout } from '@/components/community/CommunityLayout';
import { ActivityFeed } from '@/components/community/ActivityFeed';
import { QuickActions } from '@/components/community/QuickActions';
import { BucketsOfLoveWidget } from '@/components/shared/BucketsOfLoveWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Sparkles, Activity, Heart } from 'lucide-react';

export const CommunityHubModule = ({ user, isFullPage = false }: ModuleProps) => {
  if (isFullPage) {
    // Render the full CommunityHub page when in full-page mode
    const CommunityHub = React.lazy(() => import('@/pages/CommunityHub'));
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <CommunityHub />
      </React.Suspense>
    );
  }

  // Render a compact dashboard view for inline/module mode
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Community Hub</h2>
            <p className="text-sm text-muted-foreground">Your central space for community interactions</p>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Users className="h-3 w-3" />
          Active
        </Badge>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Widgets */}
        <div className="space-y-4">
          {/* Buckets of Love Widget */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Quick Love Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BucketsOfLoveWidget />
            </CardContent>
          </Card>
          
          {/* Community Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Community Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Members</span>
                <Badge variant="secondary">42</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Love Notes Today</span>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Community Status</span>
                <Badge variant="outline" className="text-green-600">Thriving</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};