import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Mail, FileText, MapPin, Calendar, Users, Building2, Bed, Bus, Package, ClipboardList, Shirt, DollarSign, UserCheck, Menu, Home, Clock, Hotel, CheckCircle2, LayoutGrid, MessageSquare, CloudSun, Receipt, FileCheck, CreditCard } from 'lucide-react';
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
import { TourMilestones } from './TourMilestones';
import { RisersSection } from '@/components/tour/RisersSection';
import { TourNotesSection } from '@/components/tour/TourNotesSection';
import { TourRollCallSection } from './TourRollCallSection';
import { TourWeatherSection } from './TourWeatherSection';
import { BusDriverTipReceiptSection } from '@/components/tour/BusDriverTipReceiptSection';
import { PermissionSlipsTab } from '@/components/travel-manager/PermissionSlipsTab';
import { TripFeesTab } from './TripFeesTab';
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
  value: 'notes',
  label: 'Notes',
  icon: MessageSquare
}, {
  value: 'logistics',
  label: 'Itinerary',
  icon: Clock
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
  value: 'roll-call',
  label: 'Roll Call',
  icon: CheckCircle2
}, {
  value: 'risers',
  label: 'Risers',
  icon: LayoutGrid
}, {
  value: 'route-planning',
  label: 'Routes',
  icon: MapPin
}, {
  value: 'hotels',
  label: 'Hotels',
  icon: Hotel
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
  value: 'driver-tip',
  label: 'Driver Tip',
  icon: Receipt
}, {
  value: 'documents',
  label: 'Docs',
  icon: ClipboardList
}, {
  value: 'wardrobe',
  label: 'Wardrobe',
  icon: Shirt
}, {
  value: 'stipends',
  label: 'Stipends',
  icon: DollarSign
}, {
  value: 'budget',
  label: 'Budget',
  icon: DollarSign
}, {
  value: 'booking-requests',
  label: 'Requests',
  icon: Mail
}, {
  value: 'weather',
  label: 'Weather',
  icon: CloudSun
}, {
  value: 'permission-slips',
  label: 'Permission Slips',
  icon: FileCheck
}, {
  value: 'fees',
  label: 'Fees',
  icon: CreditCard
}];
const contentConfig: Record<string, {
  title: string;
  description: string;
}> = {
  'overview': {
    title: 'Travel Management',
    description: 'Overview of all travel operations'
  },
  'logistics': {
    title: 'Itinerary',
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
  'roll-call': {
    title: 'Roll Call',
    description: 'Check-in sessions for tour attendance'
  },
  'risers': {
    title: 'Risers',
    description: 'Assign singer positions on the risers for performances'
  },
  'route-planning': {
    title: 'Routes',
    description: 'Optimize tour routes with intelligent planning'
  },
  'rooming': {
    title: 'Rooms',
    description: 'View and manage hotel room assignments'
  },
  'hotels': {
    title: 'Hotels',
    description: 'Manage hotels and link them to tour city itineraries'
  },
  'bus-buddies': {
    title: 'Bus Buddies',
    description: 'Assign bus buddies and seating arrangements'
  },
  'bus-info': {
    title: 'Bus Info',
    description: 'Bus details, rules, amenities, and important information'
  },
  'driver-tip': {
    title: 'Driver Tip',
    description: 'Collect the bus driver signature for the $300 tip receipt'
  },
  'documents': {
    title: 'Documents',
    description: 'Manage important tour documentation'
  },
  'wardrobe': {
    title: 'Wardrobe',
    description: 'Track uniforms, costumes, and wardrobe items'
  },
  'notes': {
    title: 'Notes',
    description: 'Real-time status updates from exec board and tour managers'
  },
  'stipends': {
    title: 'Stipends',
    description: 'Per diem directory and stipend calculator'
  },
  'weather': {
    title: 'Weather',
    description: 'Current weather for tour destination cities'
  },
  'permission-slips': {
    title: 'Permission Slips',
    description: 'Track parent permission slips for K–12 travel rosters'
  },
  'fees': {
    title: 'Fees',
    description: 'Manage trip fees and assign them to tour roster members'
  }
};
export const TourManagerDashboard = ({
  user
}: TourManagerDashboardProps) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [contractEventData, setContractEventData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false);
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  };
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
        const {
          count: datesCount
        } = await supabase.from('gw_tour_events').select('*', {
          count: 'exact',
          head: true
        }).gte('start_date', new Date().toISOString());
        const {
          count: rosterCount
        } = await supabase.from('gw_tour_roster').select('*', {
          count: 'exact',
          head: true
        }).eq('status', 'confirmed');
        const {
          count: contractsCount
        } = await supabase.from('contracts_v2').select('*', {
          count: 'exact',
          head: true
        }).eq('status', 'pending');
        const {
          count: requestsCount
        } = await supabase.from('booking_requests').select('*', {
          count: 'exact',
          head: true
        });
        const {
          count: routesCount
        } = await supabase.from('gw_tours').select('*', {
          count: 'exact',
          head: true
        });
        setStats({
          upcomingDates: datesCount || 0,
          activeRoutes: routesCount || 0,
          contacts: requestsCount || 0,
          pendingContracts: contractsCount || 0,
          rosterCount: rosterCount || 0,
          pendingDocs: 0
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
      case 'roll-call':
        return <TourRollCallSection />;
      case 'risers':
        return <RisersSection />;
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
      case 'driver-tip':
        return <BusDriverTipReceiptSection />;
      case 'documents':
        return <TourDocumentsSection />;
      case 'wardrobe':
        return <WardrobeMistressHub />;
      case 'stipends':
        return <TourStipends />;
      case 'budget':
        return <TourBudgetManager />;
      case 'notes':
        return <TourNotesSection />;
      case 'weather':
        return <TourWeatherSection />;
      case 'permission-slips':
        return <PermissionSlipsTab />;
      case 'fees':
        return <TripFeesTab />;
      default:
        return <TourManagerLanding onNavigate={setActiveSection} stats={stats} />;
    }
  };
  // The page renders inside DashboardShell, whose sticky topbar is h-14
  // (md:h-20) and z-30, offset by the demo banner via --gw-demo-bar-h.
  // The shell's <main> is overflow-x-hidden, which silently disables
  // viewport sticky for descendants — so, like Calendar, this is a
  // full-height self-scrolling layout: header and sidebar sit in flow and
  // only the content pane scrolls. Height fills the viewport minus demo
  // bar + topbar; DashboardShell zeroes its main padding for tour routes.
  return <div className="h-[calc(100dvh-var(--gw-demo-bar-h,0px)-3.5rem)] md:h-[calc(100dvh-var(--gw-demo-bar-h,0px)-5rem)] bg-background flex flex-col overflow-hidden">
      <header className="flex-shrink-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-between px-3 lg:px-4 h-12 bg-brand-900">
          <div className="flex items-center gap-2 min-w-0">
            {/* text-white, not text-primary-foreground: the bar is fixed
                bg-brand-900, and tenant themes may define
                --primary-foreground as a dark color (dark-on-dark). */}
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 flex-shrink-0 text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-6 h-6" />
            </Button>
            <h1 className="font-medium truncate text-white text-xl py-5 pl-5">
              {currentContent.title}
            </h1>
            <span className="text-xs hidden sm:inline text-white/70">—</span>
            <span className="text-xs hidden sm:inline truncate text-white/70">{currentContent.description}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-row min-h-0">
        <aside className={cn("fixed top-[calc(var(--gw-demo-bar-h,0px)+6.5rem)] md:top-[calc(var(--gw-demo-bar-h,0px)+8rem)] bottom-0 left-0 z-40 w-56 border-r border-border bg-background transform transition-transform duration-200 ease-in-out lg:static lg:h-full lg:translate-x-0 flex-shrink-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
          <div
            className="flex flex-col h-full px-0 pt-2 overflow-y-auto overscroll-contain touch-pan-y scrollbar-hide"
            style={{
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
              paddingTop: 'env(safe-area-inset-top, 0px)'
            }}
          >
            <nav className="flex flex-col space-y-1 px-2 w-full">
              {navItems.map(item => (
                <button
                  key={item.value}
                  onClick={() => handleSectionChange(item.value)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left min-h-[44px] touch-manipulation",
                    activeSection === item.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Bottom padding lives inside the scroll container so content can
              clear the fixed section bar + global nav pill on small screens. */}
          <div ref={mainContentRef} className="flex-1 overflow-auto p-4 pb-36 md:pb-20 lg:pb-4">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Tour section switcher for <lg. Below md it rides above the global
          MobileBottomNav bar (which now renders whenever the sidebar is
          hidden, i.e. <768); at md+ the bar doesn't render, so this sits
          flush at the bottom. z-20 keeps it under the bar (z-30), never
          burying the platform nav. */}
      <nav className="fixed bottom-[76px] md:bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="overflow-x-auto scrollbar-hide overscroll-x-contain touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex items-center h-14 px-2 min-w-max">
            {navItems.map(item => <button key={item.value} onClick={() => handleSectionChange(item.value)} className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors flex-shrink-0", activeSection === item.value ? "text-primary bg-primary/10" : "text-muted-foreground")}>
                <item.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>)}
          </div>
        </div>
      </nav>
    </div>;
};