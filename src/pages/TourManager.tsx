import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Mail, 
  FileText, 
  DollarSign, 
  Calendar, 
  Route,
  Users,
  CheckCircle,
  ArrowLeft,
  Settings,
  Home,
  LayoutDashboard,
  Shirt
} from 'lucide-react';
import { PerformanceRequestsList } from '@/components/tour-manager/PerformanceRequestsList';
import { RequestTracker } from '@/components/tour-manager/RequestTracker';
import { TourPlanner as TourPlannerOld } from '@/components/tour-manager/TourPlanner';
import TourPlanner from '@/pages/TourPlanner';
import { TourContracts } from '@/components/tour-manager/TourContracts';
import { TourStipends } from '@/components/tour-manager/TourStipends';
import { TourOverview } from '@/components/tour-manager/TourOverview';
import { WardrobeMistressHub } from '@/components/tour-manager/WardrobeMistressHub';
import { TermManager } from '@/components/term-manager/TermManager';

const TourManager = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <div className="h-6 w-px bg-border"></div>
          <div className="flex items-center gap-3">
            <Route className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Tour Manager</h1>
              <p className="text-sm text-muted-foreground">Manage performance requests, tours, and payments</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/events" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Events
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contracts
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
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
            Old Planner
          </TabsTrigger>
          <TabsTrigger value="tour-planner" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Tour Planner
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="stipends" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Stipends
          </TabsTrigger>
          <TabsTrigger value="wardrobe" className="flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            Wardrobe
          </TabsTrigger>
          <TabsTrigger value="term-manager" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Term Manager
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
              <TourPlannerOld />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tour-planner">
          <TourPlanner />
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

        <TabsContent value="wardrobe">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5" />
                Wardrobe Mistress Hub
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WardrobeMistressHub />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="term-manager">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Term Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TermManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TourManager;