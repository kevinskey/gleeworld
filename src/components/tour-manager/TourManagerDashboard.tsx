import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Mail, FileText, MapPin, Calendar, Users, Building2, Bed, Bus, Package, 
  ClipboardList, Shirt, DollarSign, UserCheck, Search, Menu, X
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

const navItems = [
  { value: 'booking-requests', label: 'Requests', icon: Mail },
  { value: 'contracts', label: 'Contracts', icon: FileText },
  { value: 'hosts', label: 'Hosts', icon: Building2 },
  { value: 'tour-dates', label: 'Dates', icon: Calendar },
  { value: 'roster', label: 'Roster', icon: UserCheck },
  { value: 'route-planning', label: 'Routes', icon: MapPin },
  { value: 'rooming', label: 'Rooms', icon: Bed },
  { value: 'bus-buddies', label: 'Bus', icon: Bus },
  { value: 'documents', label: 'Docs', icon: ClipboardList },
  { value: 'wardrobe', label: 'Wardrobe', icon: Shirt },
];

const contentConfig: Record<string, { title: string; description: string }> = {
  'booking-requests': { title: 'Requests', description: 'Manage incoming performance requests and inquiries' },
  'contracts': { title: 'Contracts', description: 'Create, manage, and track contract signatures' },
  'hosts': { title: 'Hosts', description: 'Manage performance venues and host relationships' },
  'tour-dates': { title: 'Dates', description: 'View all tour dates, venues, and locations' },
  'roster': { title: 'Roster', description: 'Manage which members are going on tour' },
  'route-planning': { title: 'Routes', description: 'Optimize tour routes with intelligent planning' },
  'rooming': { title: 'Rooms', description: 'View and manage hotel room assignments' },
  'bus-buddies': { title: 'Bus', description: 'Assign bus buddies and seating arrangements' },
  'documents': { title: 'Documents', description: 'Manage important tour documentation' },
  'wardrobe': { title: 'Wardrobe', description: 'Track uniforms, costumes, and wardrobe items' },
};

export const TourManagerDashboard = ({ user }: TourManagerDashboardProps) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('booking-requests');
  const [contractEventData, setContractEventData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleGenerateContract = (event: any) => {
    setContractEventData(event);
    setActiveSection('contracts');
  };

  const currentContent = contentConfig[activeSection] || contentConfig['booking-requests'];

  const renderContent = () => {
    switch (activeSection) {
      case 'booking-requests':
        return <BookingRequestManager user={user} />;
      case 'contracts':
        return <ContractManager user={user} />;
      case 'hosts':
        return <HostManager user={user} />;
      case 'tour-dates':
        return <TourDatesSection onGenerateContract={handleGenerateContract} />;
      case 'roster':
        return <TourRosterSection />;
      case 'route-planning':
        return <AIRoutePlanner user={user} />;
      case 'rooming':
        return <RoomingAssignmentsSection />;
      case 'bus-buddies':
        return <BusBuddiesSection />;
      case 'documents':
        return <TourDocumentsSection />;
      case 'wardrobe':
        return <WardrobeMistressHub />;
      default:
        return <BookingRequestManager user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-48 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">Tour Manager</span>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2">
            <nav className="px-2 space-y-0.5">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setActiveSection(item.value);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left",
                    activeSection === item.value
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-border">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 h-14">
            <div className="flex items-center gap-4 pl-10 lg:pl-0">
              <div className="relative w-64 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search" 
                  className="pl-9 h-9 bg-muted/30 border-0 focus-visible:ring-1"
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-sm"
              onClick={() => navigate('/bus-information')}
            >
              <Bus className="h-4 w-4" />
              <span className="hidden sm:inline">Bus Info</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-5xl">
            {/* Section Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">{currentContent.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{currentContent.description}</p>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden z-30">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveSection(item.value)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors",
                activeSection === item.value
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
