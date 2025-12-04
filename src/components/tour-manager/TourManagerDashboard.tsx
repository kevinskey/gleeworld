import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Route, Mail, FileText, MapPin, Calendar, Users, TrendingUp, Activity, 
  CheckCircle2, ArrowRight, Building2, Bed, Bus, Video, Package, 
  ClipboardList, Shirt, DollarSign
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
import { supabase } from '@/integrations/supabase/client';

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

interface DashboardStats {
  newRequests: number;
  activeContracts: number;
  signedContracts: number;
  pendingContracts: number;
  totalHosts: number;
  upcomingTours: number;
}

export const TourManagerDashboard = ({ user }: TourManagerDashboardProps) => {
  const [activeTab, setActiveTab] = useState('booking-requests');
  const [stats, setStats] = useState<DashboardStats>({
    newRequests: 0,
    activeContracts: 0,
    signedContracts: 0,
    pendingContracts: 0,
    totalHosts: 0,
    upcomingTours: 0
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch booking requests count
      const { count: newRequestsCount } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');

      // Fetch contracts stats
      const { data: contracts } = await supabase
        .from('contracts_v2')
        .select('status');

      const activeContracts = contracts?.filter(c => c.status === 'active' || c.status === 'pending').length || 0;
      const signedContracts = contracts?.filter(c => c.status === 'completed' || c.status === 'signed').length || 0;
      const pendingContracts = contracts?.filter(c => c.status === 'pending' || c.status === 'sent').length || 0;

      // Fetch hosts count
      const { count: hostsCount } = await supabase
        .from('hosts')
        .select('*', { count: 'exact', head: true });

      // Fetch upcoming tours/events
      const { count: upcomingToursCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('date', new Date().toISOString().split('T')[0])
        .in('event_type', ['tour', 'performance', 'concert']);

      setStats({
        newRequests: newRequestsCount || 0,
        activeContracts,
        signedContracts,
        pendingContracts,
        totalHosts: hostsCount || 0,
        upcomingTours: upcomingToursCount || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'TM';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      {/* Main Content */}
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Welcome back, {user?.full_name?.split(' ')[0] || 'Tour Manager'}!
                </h2>
                <p className="text-muted-foreground">
                  Here's your tour management overview for today
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p className="text-xs mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-950/20 dark:to-blue-900/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 truncate">{stats.newRequests}</p>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium">New Requests</p>
                </div>
                <div className="relative flex-shrink-0 ml-2">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg"></div>
                  <div className="relative bg-blue-500/10 p-2 rounded-full">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
                <span className="text-muted-foreground truncate">booking requests</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-green-50/80 to-green-100/60 dark:from-green-950/20 dark:to-green-900/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300 truncate">{stats.activeContracts}</p>
                  <p className="text-xs text-green-600/80 dark:text-green-400/80 font-medium">Active Contracts</p>
                </div>
                <div className="relative flex-shrink-0 ml-2">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg"></div>
                  <div className="relative bg-green-500/10 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                <span className="text-green-600 font-medium">{stats.signedContracts} signed</span>
                <span className="text-muted-foreground truncate">{stats.pendingContracts} pending</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-50/80 to-purple-100/60 dark:from-purple-950/20 dark:to-purple-900/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 truncate">{stats.totalHosts}</p>
                  <p className="text-xs text-purple-600/80 dark:text-purple-400/80 font-medium">Performance Hosts</p>
                </div>
                <div className="relative flex-shrink-0 ml-2">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg"></div>
                  <div className="relative bg-purple-500/10 p-2 rounded-full">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <Activity className="h-3 w-3 text-purple-500 flex-shrink-0" />
                <span className="text-muted-foreground truncate">venues & organizations</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50/80 to-orange-100/60 dark:from-orange-950/20 dark:to-orange-900/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 truncate">{stats.upcomingTours}</p>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/80 font-medium">Upcoming Events</p>
                </div>
                <div className="relative flex-shrink-0 ml-2">
                  <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-lg"></div>
                  <div className="relative bg-orange-500/10 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3 text-orange-500 flex-shrink-0" />
                <span className="text-muted-foreground truncate">tours & performances</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl blur-xl"></div>
            <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 p-2 rounded-2xl shadow-lg">
              {/* Admin Functions Row */}
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Admin & Booking</p>
              <TabsList className="grid w-full grid-cols-5 bg-transparent mb-2">
                <TabsTrigger value="booking-requests" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/10 data-[state=active]:to-blue-600/10 data-[state=active]:text-blue-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Mail className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Requests</span>
                </TabsTrigger>
                <TabsTrigger value="hosts" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/10 data-[state=active]:to-cyan-600/10 data-[state=active]:text-cyan-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Hosts</span>
                </TabsTrigger>
                <TabsTrigger value="correspondence" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/10 data-[state=active]:to-purple-600/10 data-[state=active]:text-purple-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Messages</span>
                </TabsTrigger>
                <TabsTrigger value="contracts" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/10 data-[state=active]:to-green-600/10 data-[state=active]:text-green-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <FileText className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Contracts</span>
                </TabsTrigger>
                <TabsTrigger value="route-planning" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/10 data-[state=active]:to-orange-600/10 data-[state=active]:text-orange-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Routes</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Tour Info Center Row */}
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium border-t border-border/30 pt-2">Tour Information</p>
              <TabsList className="grid w-full grid-cols-6 bg-transparent mb-2">
                <TabsTrigger value="tour-dates" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/10 data-[state=active]:to-indigo-600/10 data-[state=active]:text-indigo-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Dates</span>
                </TabsTrigger>
                <TabsTrigger value="rooming" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/10 data-[state=active]:to-pink-600/10 data-[state=active]:text-pink-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Bed className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Rooms</span>
                </TabsTrigger>
                <TabsTrigger value="crew" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/10 data-[state=active]:to-amber-600/10 data-[state=active]:text-amber-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Package className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Crew</span>
                </TabsTrigger>
                <TabsTrigger value="bus-buddies" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500/10 data-[state=active]:to-teal-600/10 data-[state=active]:text-teal-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Bus className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Bus</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500/10 data-[state=active]:to-slate-600/10 data-[state=active]:text-slate-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Docs</span>
                </TabsTrigger>
                <TabsTrigger value="live-performances" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500/10 data-[state=active]:to-red-600/10 data-[state=active]:text-red-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Video className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Live</span>
                </TabsTrigger>
              </TabsList>

              {/* Operations Row */}
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium border-t border-border/30 pt-2">Operations</p>
              <TabsList className="grid w-full grid-cols-2 bg-transparent">
                <TabsTrigger value="wardrobe" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/10 data-[state=active]:to-violet-600/10 data-[state=active]:text-violet-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <Shirt className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Wardrobe</span>
                </TabsTrigger>
                <TabsTrigger value="stipends" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/10 data-[state=active]:to-emerald-600/10 data-[state=active]:text-emerald-700 data-[state=active]:shadow-md rounded-xl transition-all duration-300">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Stipends</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

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
                <TourDatesSection />
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