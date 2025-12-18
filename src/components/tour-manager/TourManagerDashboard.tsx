import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Mail, FileText, MapPin, Calendar, Users, Building2, Bed, Bus, Package, 
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

  const tabs = [
    { value: 'booking-requests', label: 'Requests', icon: Mail },
    { value: 'contracts', label: 'Contracts', icon: FileText },
    { value: 'hosts', label: 'Hosts', icon: Building2 },
    { value: 'tour-dates', label: 'Dates', icon: Calendar },
    { value: 'roster', label: 'Roster', icon: UserCheck },
    { value: 'route-planning', label: 'Routes', icon: MapPin },
    { value: 'rooming', label: 'Rooms', icon: Bed },
    { value: 'crew', label: 'Crew', icon: Package },
    { value: 'bus-buddies', label: 'Bus', icon: Bus },
    { value: 'documents', label: 'Docs', icon: ClipboardList },
    { value: 'wardrobe', label: 'Wardrobe', icon: Shirt },
    { value: 'stipends', label: 'Stipends', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tour Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage tours, contracts, and logistics</p>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-2">
            <TabsList className="flex flex-wrap gap-1 bg-transparent h-auto w-full justify-start">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value} 
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Content - Clean Cards */}
          <TabsContent value="booking-requests" className="space-y-6">
            <ContentCard 
              title="Booking Requests" 
              description="Manage incoming performance requests and bookings"
              icon={Mail}
            >
              <BookingRequestManager user={user} />
            </ContentCard>
          </TabsContent>

          <TabsContent value="hosts" className="space-y-6">
            <ContentCard 
              title="Host Database" 
              description="Manage performance venues, contacts, and host relationships"
              icon={Building2}
            >
              <HostManager user={user} />
            </ContentCard>
          </TabsContent>

          <TabsContent value="correspondence" className="space-y-6">
            <ContentCard 
              title="Public Correspondence" 
              description="Manage communications with organizations and media"
              icon={Users}
            >
              <TourCorrespondence user={user} />
            </ContentCard>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <ContentCard 
              title="Performer Contracts" 
              description="Create, manage, and track contract signatures"
              icon={FileText}
            >
              <ContractManager user={user} />
            </ContentCard>
          </TabsContent>

          <TabsContent value="route-planning" className="space-y-6">
            <ContentCard 
              title="Route Planning" 
              description="Optimize tour routes with intelligent AI planning"
              icon={MapPin}
            >
              <AIRoutePlanner user={user} />
            </ContentCard>
          </TabsContent>

          <TabsContent value="roster" className="space-y-6">
            <ContentCard 
              title="Tour Roster" 
              description="Manage which members are going on tour"
              icon={UserCheck}
            >
              <TourRosterSection />
            </ContentCard>
          </TabsContent>

          <TabsContent value="tour-dates" className="space-y-6">
            <ContentCard 
              title="Tour Schedule" 
              description="View all tour dates, venues, and locations"
              icon={Calendar}
            >
              <TourDatesSection onGenerateContract={handleGenerateContract} />
            </ContentCard>
          </TabsContent>

          <TabsContent value="rooming" className="space-y-6">
            <ContentCard 
              title="Rooming Assignments" 
              description="View and manage hotel room assignments"
              icon={Bed}
            >
              <RoomingAssignmentsSection />
            </ContentCard>
          </TabsContent>

          <TabsContent value="crew" className="space-y-6">
            <ContentCard 
              title="Crew Assignments" 
              description="Manage setup, merch, and technical crews"
              icon={Package}
            >
              <CrewAssignmentsSection />
            </ContentCard>
          </TabsContent>

          <TabsContent value="bus-buddies" className="space-y-6">
            <ContentCard 
              title="Bus Seating" 
              description="Assign bus buddies and seating arrangements"
              icon={Bus}
            >
              <BusBuddiesSection />
            </ContentCard>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <ContentCard 
              title="Tour Documents" 
              description="Manage important tour documentation"
              icon={ClipboardList}
            >
              <TourDocumentsSection />
            </ContentCard>
          </TabsContent>

          <TabsContent value="live-performances" className="space-y-6">
            <ContentCard 
              title="Live Performances" 
              description="Track and manage live performance recordings"
              icon={Users}
            >
              <LivePerformancesSection />
            </ContentCard>
          </TabsContent>

          <TabsContent value="wardrobe" className="space-y-6">
            <ContentCard 
              title="Wardrobe Management" 
              description="Track uniforms, costumes, and wardrobe items"
              icon={Shirt}
            >
              <WardrobeMistressHub />
            </ContentCard>
          </TabsContent>

          <TabsContent value="stipends" className="space-y-6">
            <ContentCard 
              title="Tour Stipends" 
              description="Manage tour payments and stipends"
              icon={DollarSign}
            >
              <TourStipends />
            </ContentCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Clean Content Card Component
interface ContentCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const ContentCard = ({ title, description, icon: Icon, children }: ContentCardProps) => (
  <div className="bg-card border border-border rounded-lg">
    <div className="p-6 border-b border-border">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);