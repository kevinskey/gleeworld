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
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Sidebar - hidden on mobile, shown on desktop */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-56 bg-blue-100 dark:bg-blue-900 border-r border-blue-200 dark:border-blue-800 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="px-3 py-3 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300 whitespace-nowrap">Tour Manager</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
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
                    "w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors text-left",
                    activeSection === item.value
                      ? "bg-blue-600 dark:bg-blue-700 text-white"
                      : "text-blue-800 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200 hover:bg-blue-200/50 dark:hover:bg-blue-800/50"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-blue-200 dark:border-blue-800">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 rounded-md hover:bg-blue-200/50 dark:hover:bg-blue-800/50 transition-colors">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 h-14">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 flex-shrink-0"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-base font-semibold text-foreground lg:hidden truncate">
                {currentContent.title}
              </h1>
              <div className="relative w-64 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search" 
                  className="pl-9 h-9 bg-background border focus-visible:ring-1"
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-sm flex-shrink-0"
              onClick={() => navigate('/bus-information')}
            >
              <Bus className="h-4 w-4" />
              <span className="hidden sm:inline">Bus Info</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 lg:max-w-5xl">
            {/* Section Header - hidden on mobile (shown in top bar) */}
            <div className="mb-4 lg:mb-6 hidden lg:block">
              <h2 className="text-xl font-semibold text-foreground">{currentContent.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{currentContent.description}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4 lg:hidden">{currentContent.description}</p>

            {/* Content */}
            <div className="space-y-4">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Scrollable */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden z-30 safe-area-inset-bottom">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center h-16 px-2 min-w-max">
            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveSection(item.value)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-md transition-colors flex-shrink-0",
                  activeSection === item.value
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};
