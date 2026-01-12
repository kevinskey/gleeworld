import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCcw, Calendar, CreditCard, Users
} from 'lucide-react';

export const SubscriptionsManager = () => {
  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-muted rounded-full w-fit">
            <RefreshCcw className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Subscriptions Coming Soon</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Recurring billing and subscription management will be available in a future update.
            This feature will integrate with Stripe Subscriptions.
          </CardDescription>
          <Badge variant="secondary" className="mx-auto mt-2">Feature Flagged</Badge>
        </CardHeader>
      </Card>

      {/* Placeholder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Monthly Recurring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Renewals This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Description */}
      <Card>
        <CardHeader>
          <CardTitle>Planned Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Create subscription plans with Stripe
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Manage subscriber lifecycle (trials, upgrades, cancellations)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Automatic invoice and payment handling
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Subscriber analytics and churn reporting
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Proration and mid-cycle plan changes
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
