import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Mail, FileText, MapPin, Calendar, Users, Building2, Bed, Bus, Package, ClipboardList, Shirt, DollarSign, UserCheck, Search, Menu, X, Home, Clock, Hotel } from 'lucide-react';
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
import { TourManagerLanding } from './TourManagerLanding';
import { TourLogisticsSection } from './TourLogisticsSection';
import { BusInfoSection } from '@/components/tour/BusInfoSection';
import { HotelManagement } from './HotelManagement';
import { TourBudgetManager } from './TourBudgetManager';
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
const navItems = [{
  value: 'overview',
  label: 'Overview',
  icon: Home
}, {
  value: 'logistics',
  label: 'Logistics',
  icon: Clock
}, {
  value: 'booking-requests',
  label: 'Requests',
  icon: Mail
}, {
  value: 'contracts',
  label: 'Contracts',
  icon: FileText
}, {
  value: 'hosts',
  label: 'Contacts',
  icon: Building2
}, {
  value: 'tour-dates',
  label: 'Dates',
  icon: Calendar
}, {
  value: 'roster',
  label: 'Roster',
  icon: UserCheck
}, {
  value: 'route-planning',
  label: 'Routes',
  icon: MapPin
}, {
  value: 'rooming',
  label: 'Rooms',
  icon: Bed
}, {
  value: 'bus-buddies',
  label: 'Bus Buddies',
  icon: Users
}, {
  value: 'bus-info',
  label: 'Bus Info',
  icon: Bus
}, {
  value: 'documents',
  label: 'Docs',
  icon: ClipboardList
}, {
  value: 'wardrobe',
  label: 'Wardrobe',
  icon: Shirt
}, {
  value: 'budget',
  label: 'Budget',
  icon: DollarSign
}];
const contentConfig: Record<string, {
  title: string;
  description: string;
}> = {
  'overview': {
    title: 'Tour Management',
    description: 'Overview of all tour operations'
  },
  'logistics': {
    title: 'Logistics',
    description: 'Call times, crew duties, and merchandise coordination'
  },
  'booking-requests': {
    title: 'Requests',
    description: 'Manage incoming performance requests and inquiries'
  },
  'contracts': {
    title: 'Contracts',
    description: 'Create, manage, and track contract signatures'
  },
  'hosts': {
    title: 'Contacts',
    description: 'Manage venue contacts and host relationships'
  },
  'tour-dates': {
    title: 'Dates',
    description: 'View all tour dates, venues, and locations'
  },
  'roster': {
    title: 'Roster',
    description: 'Manage which members are going on tour'
  },
  'route-planning': {
    title: 'Routes',
    description: 'Optimize tour routes with intelligent planning'
  },
  'rooming': {
    title: 'Rooms',
    description: 'View and manage hotel room assignments'
  },
  'bus-buddies': {
    title: 'Bus Buddies',
    description: 'Assign bus buddies and seating arrangements'
  },
  'bus-info': {
    title: 'Bus Info',
    description: 'Bus details, rules, amenities, and important information'
  },
  'documents': {
    title: 'Documents',
    description: 'Manage important tour documentation'
  },
  'wardrobe': {
    title: 'Wardrobe',
    description: 'Track uniforms, costumes, and wardrobe items'
  }
};
export const TourManagerDashboard = ({
  user
}: TourManagerDashboardProps) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [contractEventData, setContractEventData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    upcomingDates: 0,
    activeRoutes: 0,
    contacts: 0,
    pendingContracts: 0,
    rosterCount: 0,
    pendingDocs: 0
  });
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch tour dates count
        const {
          count: datesCount
        } = await supabase.from('gw_tour_events').select('*', {
          count: 'exact',
          head: true
        }).gte('start_date', new Date().toISOString());

        // Fetch roster count
        const {
          count: rosterCount
        } = await supabase.from('gw_tour_roster').select('*', {
          count: 'exact',
          head: true
        }).eq('status', 'confirmed');

        // Fetch pending contracts
        const {
          count: contractsCount
        } = await supabase.from('contracts_v2').select('*', {
          count: 'exact',
          head: true
        }).eq('status', 'pending');

        // Fetch booking requests as contacts proxy
        const {
          count: requestsCount
        } = await supabase.from('booking_requests').select('*', {
          count: 'exact',
          head: true
        });
        setStats({
          upcomingDates: datesCount || 0,
          activeRoutes: 1,
          contacts: requestsCount || 0,
          pendingContracts: contractsCount || 0,
          rosterCount: rosterCount || 0,
          pendingDocs: 3
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);
  const handleGenerateContract = (event: any) => {
    setContractEventData(event);
    setActiveSection('contracts');
  };
  const currentContent = contentConfig[activeSection] || contentConfig['overview'];
  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <TourManagerLanding onNavigate={setActiveSection} stats={stats} />;
      case 'logistics':
        return <TourLogisticsSection />;
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
      case 'hotels':
        return <HotelManagement />;
      case 'bus-buddies':
        return <BusBuddiesSection />;
      case 'bus-info':
        return <BusInfoSection />;
      case 'documents':
        return <TourDocumentsSection />;
      case 'wardrobe':
        return <WardrobeMistressHub />;
      case 'budget':
        return <TourBudgetManager />;
      default:
        return <TourManagerLanding onNavigate={setActiveSection} stats={stats} />;
    }
  };
  return <div className="min-h-screen bg-slate-200/70 dark:bg-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar - hidden on mobile, shown on desktop */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-56 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-[#003666]">
            <span className="text-base font-semibold text-white whitespace-nowrap">Tour Manager</span>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-white hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-3">
            <nav className="px-3 space-y-1">
              {navItems.map(item => <button key={item.value} onClick={() => {
              setActiveSection(item.value);
              setSidebarOpen(false);
            }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left", activeSection === item.value ? "bg-[#003666] text-white shadow-sm" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700")}>
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", activeSection === item.value ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                  <span>{item.label}</span>
                </button>)}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 lg:px-6 h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 flex-shrink-0 text-slate-700 dark:text-slate-300" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                  {currentContent.title}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">{currentContent.description}</p>
              </div>
            </div>
            <div className="relative w-56 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search..." className="pl-9 h-9 text-sm bg-slate-200/70 dark:bg-slate-700 border-slate-300 dark:border-slate-600" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-6 bg-slate-200/70 dark:bg-slate-900">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-100 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 lg:hidden z-30 safe-area-inset-bottom">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center h-16 px-2 min-w-max">
            {navItems.map(item => <button key={item.value} onClick={() => setActiveSection(item.value)} className={cn("flex flex-col items-center gap-1 px-4 py-2 rounded-md transition-colors flex-shrink-0", activeSection === item.value ? "text-[#003666]" : "text-slate-500")}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>)}
          </div>
        </div>
      </nav>
    </div>;
};