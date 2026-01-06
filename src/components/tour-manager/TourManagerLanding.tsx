import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, MapPin, Users, FileText, Building2, ClipboardList,
  ChevronRight, Clock, MapPinned, UserCheck, FileCheck, Phone
} from 'lucide-react';

interface TourManagerLandingProps {
  onNavigate: (section: string) => void;
  stats?: {
    upcomingDates: number;
    activeRoutes: number;
    contacts: number;
    pendingContracts: number;
    rosterCount: number;
    pendingDocs: number;
  };
}

export const TourManagerLanding = ({ onNavigate, stats }: TourManagerLandingProps) => {
  const defaultStats = {
    upcomingDates: stats?.upcomingDates ?? 0,
    activeRoutes: stats?.activeRoutes ?? 0,
    contacts: stats?.contacts ?? 0,
    pendingContracts: stats?.pendingContracts ?? 0,
    rosterCount: stats?.rosterCount ?? 0,
    pendingDocs: stats?.pendingDocs ?? 0,
  };

  const sections = [
    {
      id: 'tour-dates',
      title: 'Tour Dates',
      description: 'Manage performance dates, venues, and scheduling',
      icon: Calendar,
      color: 'bg-blue-500',
      stat: defaultStats.upcomingDates,
      statLabel: 'upcoming',
    },
    {
      id: 'route-planning',
      title: 'Routes',
      description: 'Plan and optimize tour routes and travel logistics',
      icon: MapPin,
      color: 'bg-emerald-500',
      stat: defaultStats.activeRoutes,
      statLabel: 'active routes',
    },
    {
      id: 'hosts',
      title: 'Contacts',
      description: 'Venue contacts, hosts, and key relationships',
      icon: Phone,
      color: 'bg-purple-500',
      stat: defaultStats.contacts,
      statLabel: 'contacts',
    },
    {
      id: 'contracts',
      title: 'Contracts',
      description: 'Performance agreements and legal documents',
      icon: FileText,
      color: 'bg-amber-500',
      stat: defaultStats.pendingContracts,
      statLabel: 'pending',
    },
    {
      id: 'roster',
      title: 'Roster',
      description: 'Tour members, confirmations, and assignments',
      icon: Users,
      color: 'bg-rose-500',
      stat: defaultStats.rosterCount,
      statLabel: 'members',
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Required forms, waivers, and tour materials',
      icon: ClipboardList,
      color: 'bg-cyan-500',
      stat: defaultStats.pendingDocs,
      statLabel: 'pending',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Compact Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onNavigate(section.id)}
            className="text-center p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="text-xl font-bold text-foreground">{section.stat}</div>
            <div className="text-[10px] text-muted-foreground capitalize">{section.statLabel}</div>
          </button>
        ))}
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <Card 
            key={section.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30"
            onClick={() => onNavigate(section.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${section.color} text-white`}>
                  <section.icon className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="text-sm">
                  {section.stat} {section.statLabel}
                </Badge>
              </div>
              <CardTitle className="text-xl mt-4 group-hover:text-primary transition-colors">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">
                {section.description}
              </p>
              <div className="flex items-center text-primary text-sm font-medium">
                <span>Open {section.title}</span>
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Bar */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground mr-2">Quick Actions:</span>
            <Button variant="outline" size="sm" onClick={() => onNavigate('tour-dates')}>
              <Calendar className="h-4 w-4 mr-2" />
              Add Tour Date
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('contracts')}>
              <FileText className="h-4 w-4 mr-2" />
              New Contract
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('roster')}>
              <UserCheck className="h-4 w-4 mr-2" />
              Manage Roster
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('route-planning')}>
              <MapPinned className="h-4 w-4 mr-2" />
              Plan Route
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
