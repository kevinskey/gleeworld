import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Mail, 
  FileText, 
  DollarSign, 
  Calendar, 
  Route,
  Users,
  CheckCircle
} from 'lucide-react';
import { PerformanceRequestsList } from '@/components/tour-manager/PerformanceRequestsList';
import { RequestTracker } from '@/components/tour-manager/RequestTracker';
import { TourPlanner } from '@/components/tour-manager/TourPlanner';
import { TourContracts } from '@/components/tour-manager/TourContracts';
import { TourStipends } from '@/components/tour-manager/TourStipends';
import { TourOverview } from '@/components/tour-manager/TourOverview';

const TourManager = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Route className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Tour Manager</h1>
          <p className="text-muted-foreground">Manage performance requests, tours, and payments</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Tracker
          </TabsTrigger>
          <TabsTrigger value="planner" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Planner
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="stipends" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Stipends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Tour Management Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TourOverview />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Performance Email Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceRequestsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracker">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Request to Completion Tracker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RequestTracker />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planner">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Tour Planner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TourPlanner />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tour Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TourContracts />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stipends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tour Stipends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TourStipends />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TourManager;