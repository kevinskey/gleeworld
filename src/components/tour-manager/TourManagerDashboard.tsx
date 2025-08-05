import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Route, Mail, FileText, MapPin, Calendar, Users } from 'lucide-react';
import { BookingRequestManager } from './BookingRequestManager';
import { ContractManager } from './ContractManager';
import { AIRoutePlanner } from './AIRoutePlanner';
import { TourCorrespondence } from './TourCorrespondence';

interface TourManagerDashboardProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at?: string;
  };
}

export const TourManagerDashboard = ({ user }: TourManagerDashboardProps) => {
  const [activeTab, setActiveTab] = useState('booking-requests');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Route className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Tour Manager</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tour management system for handling booking requests, correspondence, 
            performer contracts, and intelligent route planning.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">New Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-xs text-muted-foreground">Active Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-xs text-muted-foreground">Planned Routes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-xs text-muted-foreground">Upcoming Tours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="booking-requests" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Booking Requests</span>
            </TabsTrigger>
            <TabsTrigger value="correspondence" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Correspondence</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Contracts</span>
            </TabsTrigger>
            <TabsTrigger value="route-planning" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Route Planning</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="booking-requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Booking Requests Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BookingRequestManager user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="correspondence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Public Correspondence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TourCorrespondence user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Performer Contracts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContractManager user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="route-planning" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  AI Route Planning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIRoutePlanner user={user} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};