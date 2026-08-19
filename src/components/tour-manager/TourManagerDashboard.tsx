import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, FileText, MapPin, Calendar, Users, Building2, Bed, Bus, ClipboardList, Shirt, DollarSign, UserCheck, ChevronLeft, Home, Clock, Hotel, CheckCircle2, LayoutGrid, MessageSquare, CloudSun, Receipt, FileCheck, CreditCard } from 'lucide-react';
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
import { RisersSection } from '@/components/tour/RisersSection';
import { TourNotesSection } from '@/components/tour/TourNotesSection';
import { TourRollCallSection } from './TourRollCallSection';
import { TourWeatherSection } from './TourWeatherSection';
import { BusDriverTipReceiptSection } from '@/components/tour/BusDriverTipReceiptSection';
import { PermissionSlipsTab } from '@/components/travel-manager/PermissionSlipsTab';
import { TenantSlipSearch } from '@/components/travel-manager/TenantSlipSearch';
import { K12SlipNotice } from '@/components/travel-manager/K12SlipNotice';
import { TripFeesTab } from './TripFeesTab';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { ActiveTripProvider } from './ActiveTripContext';
import { TripSwitcher } from './TripSwitcher';
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
// Hub groupings. 23 sections is far too many for a single tab strip — the old
// bottom bar scrolled most of them off-screen — so the landing presents them as
// labelled groups of cards and each one drills in, the same shape as Music
// Librarian. Every value here must exist in navItems/contentConfig; the hub is
// built from navItems so a section can never be listed without a destination.
const SECTION_GROUPS: { heading: string; values: string[] }[] = [
  { heading: 'Planning', values: ['tour-dates', 'logistics', 'route-planning', 'notes', 'documents', 'weather'] },
  { heading: 'People', values: ['roster', 'roll-call', 'risers', 'bus-buddies', 'wardrobe'] },
  { heading: 'Lodging & transport', values: ['hotels', 'rooming', 'bus-info', 'driver-tip'] },
  { heading: 'Business', values: ['contracts', 'hosts', 'booking-requests', 'budget', 'stipends', 'fees', 'permission-slips'] },
];

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
  'budget': {
    title: 'Budget',
    description: 'Travel expenses and revenue for the trip'
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
const TourManagerDashboardInner = ({
  user
}: TourManagerDashboardProps) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [contractEventData, setContractEventData] = useState<any>(null);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // DashboardShell's <main> is the scroll container, not the document, so
    // window.scrollTo(0,0) would do nothing here — drilling into a section
    // from halfway down the hub would land you halfway down that section.
    document.querySelector('main')?.scrollTo({ top: 0 });
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
        return <TourDocumentsSection showHeading={false} />;
      case 'wardrobe':
        return <WardrobeMistressHub showHeading={false} />;
      case 'stipends':
        return <TourStipends />;
      case 'budget':
        return <TourBudgetManager />;
      case 'notes':
        return <TourNotesSection />;
      case 'weather':
        return <TourWeatherSection showHeading={false} />;
      case 'permission-slips':
        return (
          <div className="space-y-8">
            <K12SlipNotice />
            <PermissionSlipsTab />
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                All slips in this workspace
              </h2>
              <TenantSlipSearch />
            </section>
          </div>
        );
      case 'fees':
        return <TripFeesTab />;
      default:
        return <TourManagerLanding onNavigate={setActiveSection} stats={stats} />;
    }
  };
  // Ordinary dashboard page, hub-and-spoke like Music Librarian.
  //
  // This add-on used to ship its own entire app shell: a dark bg-brand-900
  // title bar with a hamburger, a 224px in-page sidebar, and a bottom
  // horizontal scroll bar of all 23 sections. It duplicated DashboardShell's
  // sidebar and mobile nav, so the page read as a separate product bolted into
  // GleeWorld — nav inside nav, two headers, and a scroll bar that pushed most
  // sections off-screen. All of it is gone; the global shell is the only
  // chrome, and DashboardPageShell owns the title exactly as elsewhere.
  //
  // The old layout was also full-height self-scrolling to dodge DashboardShell's
  // overflow-x-hidden killing sticky. Nothing here is sticky any more, so the
  // page just flows and the shell's own <main> scrolls (its tour-route padding
  // exemption is removed alongside this).
  const activeItem = navItems.find(i => i.value === activeSection);

  if (activeSection === 'overview') {
    return (
      <DashboardPageShell
        title="Travel Manager"
        icon={MapPin}
        subtitle="Plan tours, move people, and keep the paperwork straight"
        actions={<TripSwitcher />}
      >
        <TourManagerLanding onNavigate={handleSectionChange} stats={stats} />

        {SECTION_GROUPS.map(group => (
          <section key={group.heading}>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {group.heading}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.values.map(value => {
                const item = navItems.find(i => i.value === value);
                if (!item) return null;
                const SectionIcon = item.icon;
                return (
                  <button
                    key={value}
                    onClick={() => handleSectionChange(value)}
                    className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all active:scale-[0.97] hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="rounded-lg bg-primary/10 text-primary p-2.5">
                      <SectionIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm leading-tight">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {contentConfig[value]?.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell
      eyebrow="Travel Manager"
      title={currentContent.title}
      subtitle={currentContent.description}
      icon={activeItem?.icon}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <TripSwitcher />
          <Button variant="outline" size="sm" onClick={() => handleSectionChange('overview')} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            All sections
          </Button>
        </div>
      }
    >
      {renderContent()}
    </DashboardPageShell>
  );
};

// The provider wraps the whole dashboard so the hub, every drilled-in section
// and the switcher itself all read one selection.
export const TourManagerDashboard = (props: TourManagerDashboardProps) => (
  <ActiveTripProvider>
    <TourManagerDashboardInner {...props} />
  </ActiveTripProvider>
);
