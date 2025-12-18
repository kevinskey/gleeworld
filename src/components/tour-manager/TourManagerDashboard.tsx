import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Mail, FileText, MapPin, Calendar, Users, Building2, Bed, Bus, Video, Package, 
  ClipboardList, Shirt, DollarSign, UserCheck
} from 'lucide-react';
import { BookingRequestManager } from './BookingRequestManager';
import { ContractManager } from './ContractManager';
import { AIRoutePlanner } from './AIRoutePlanner';
import { TourCorrespondence } from './TourCorrespondence';
import { HostManager } from './HostManager';
import { WardrobeMistressHub } from './WardrobeMistressHub';
import { TourStipends } from './TourStipends';
import { TourDatesSection } from '@/components/tour/TourDatesSection';
import { RoomingAssignmentsSection } from '@/components/tour/RoomingAssignmentsSection';
import { CrewAssignmentsSection } from '@/components/tour/CrewAssignmentsSection';
import { BusBuddiesSection } from '@/components/tour/BusBuddiesSection';
import { TourDocumentsSection } from '@/components/tour/TourDocumentsSection';
import { LivePerformancesSection } from '@/components/tour/LivePerformancesSection';
import { TourRosterSection } from '@/components/tour/TourRosterSection';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('booking-requests');
  const [contractEventData, setContractEventData] = useState<any>(null);

  const handleGenerateContract = (event: any) => {
    setContractEventData(event);
    setActiveTab('contracts');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Simplified Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Tour Manager</h1>
            <p className="text-sm text-muted-foreground">Manage tours, contracts, and logistics</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate('/bus-information')}
          >
            <Bus className="h-4 w-4" />
            Bus Info
          </Button>
        </div>

        {/* Clean Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <Card className="p-2">
            <div className="flex flex-wrap gap-1">
              {/* Main Actions */}
              <TabsTrigger 
                value="booking-requests" 
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Mail className="h-4 w-4" />
                <span>Requests</span>
              </TabsTrigger>
              <TabsTrigger 
                value="contracts" 
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-4 w-4" />
                <span>Contracts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="hosts" 
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Building2 className="h-4 w-4" />
                <span>Hosts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tour-dates" 
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Calendar className="h-4 w-4" />
                <span>Dates</span>
              </TabsTrigger>
              <TabsTrigger 
                value="roster" 
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <UserCheck className="h-4 w-4" />
                <span>Roster</span>
              </TabsTrigger>
              <TabsTrigger 
                value="route-planning" 
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <MapPin className="h-4 w-4" />
                <span>Routes</span>
              </TabsTrigger>
              
              {/* Secondary */}
              <div className="hidden md:flex items-center gap-1 ml-2 pl-2 border-l border-border">
                <TabsTrigger 
                  value="rooming" 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Bed className="h-4 w-4" />
                  <span className="hidden lg:inline">Rooms</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="crew" 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden lg:inline">Crew</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="bus-buddies" 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Bus className="h-4 w-4" />
                  <span className="hidden lg:inline">Bus</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden lg:inline">Docs</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="wardrobe" 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Shirt className="h-4 w-4" />
                  <span className="hidden lg:inline">Wardrobe</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="stipends" 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden lg:inline">Stipends</span>
                </TabsTrigger>
              </div>
            </div>
            
            {/* Mobile overflow tabs */}
            <div className="flex md:hidden flex-wrap gap-1 mt-2 pt-2 border-t border-border">
              <TabsTrigger 
                value="rooming" 
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Bed className="h-3 w-3" />
                <span>Rooms</span>
              </TabsTrigger>
              <TabsTrigger 
                value="crew" 
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Package className="h-3 w-3" />
                <span>Crew</span>
              </TabsTrigger>
              <TabsTrigger 
                value="bus-buddies" 
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Bus className="h-3 w-3" />
                <span>Bus</span>
              </TabsTrigger>
              <TabsTrigger 
                value="documents" 
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ClipboardList className="h-3 w-3" />
                <span>Docs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="wardrobe" 
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Shirt className="h-3 w-3" />
                <span>Wardrobe</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stipends" 
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <DollarSign className="h-3 w-3" />
                <span>Stipends</span>
              </TabsTrigger>
            </div>
          </Card>

          {/* Admin Tabs Content */}
          <TabsContent value="booking-requests" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-blue-500/10 p-2 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                      Booking Requests Management
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Manage incoming performance requests and bookings
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <BookingRequestManager user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hosts" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-cyan-500/10 p-2 rounded-lg">
                      <Building2 className="h-5 w-5 text-cyan-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-cyan-600 to-cyan-700 bg-clip-text text-transparent">
                      Host Database Management
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Manage performance venues, contacts, and host relationships
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <HostManager user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="correspondence" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-purple-500/10 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                      Public Correspondence
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Manage communications with organizations and media
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TourCorrespondence user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-green-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-green-500/10 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                      Performer Contracts
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Create, manage, and track contract signatures
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ContractManager user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="route-planning" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-orange-500/10 p-2 rounded-lg">
                      <MapPin className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                      AI Route Planning
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Optimize tour routes with intelligent AI planning
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AIRoutePlanner user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tour Information Tabs Content */}
          <TabsContent value="roster" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-emerald-500/10 p-2 rounded-lg">
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                      Tour Roster
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Manage which members are going on tour
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TourRosterSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tour-dates" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-indigo-500/10 p-2 rounded-lg">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent">
                      Tour Schedule & Locations
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      View all tour dates, venues, and locations
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TourDatesSection onGenerateContract={handleGenerateContract} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooming" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-pink-500/10 to-pink-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-pink-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-pink-500/10 p-2 rounded-lg">
                      <Bed className="h-5 w-5 text-pink-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-pink-600 to-pink-700 bg-clip-text text-transparent">
                      Rooming Assignments
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      View and manage hotel room assignments
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <RoomingAssignmentsSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="crew" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-amber-500/10 p-2 rounded-lg">
                      <Package className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
                      Merch & Setup Crew
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      View crew assignments for merchandise and setup
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <CrewAssignmentsSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bus-buddies" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-teal-500/10 to-teal-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-teal-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-teal-500/10 p-2 rounded-lg">
                      <Bus className="h-5 w-5 text-teal-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent">
                      Bus Buddies
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      View bus seating assignments and travel partners
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <BusBuddiesSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-500/10 to-slate-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-slate-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-slate-500/10 p-2 rounded-lg">
                      <ClipboardList className="h-5 w-5 text-slate-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent">
                      Tour Documents
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Access excuse letters, contracts, itinerary, and more
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TourDocumentsSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live-performances" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-red-500/10 to-red-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-red-500/10 p-2 rounded-lg">
                      <Video className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                      Live Performances
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Watch live and recorded on-the-road performances
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <LivePerformancesSection />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Tabs Content */}
          <TabsContent value="wardrobe" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-violet-500/10 to-violet-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-violet-500/10 p-2 rounded-lg">
                      <Shirt className="h-5 w-5 text-violet-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-violet-600 to-violet-700 bg-clip-text text-transparent">
                      Wardrobe Management
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Manage tour wardrobe, costumes, and attire
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <WardrobeMistressHub />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stipends" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-b border-border/50">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-lg blur-md"></div>
                    <div className="relative bg-emerald-500/10 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                      Tour Stipends
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      Manage tour performance stipends and payments
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TourStipends />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};