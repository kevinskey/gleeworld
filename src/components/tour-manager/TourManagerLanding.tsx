import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, FileText, ClipboardList, ChevronRight, MapPinned, UserCheck, Phone, Music, BookOpen, DollarSign, Mic2, UsersRound, CalendarDays, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { TourMilestones } from './TourMilestones';
import { TourRouteTimeline } from './TourRouteTimeline';
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
interface ContractTourDate {
  id: string;
  title: string;
  status: string;
  contract_metadata: {
    performance_date?: string;
    venue_name?: string;
    venue_city?: string;
    venue_state?: string;
    host_name?: string;
  } | null;
}
interface KeyPerson {
  role: string;
  name: string;
  email?: string;
  avatar?: string;
  icon: React.ElementType;
}
export const TourManagerLanding = ({
  onNavigate,
  stats
}: TourManagerLandingProps) => {
  const navigate = useNavigate();
  const [contractTourDates, setContractTourDates] = useState<ContractTourDate[]>([]);
  const [tourTitle, setTourTitle] = useState<string | null>(null);
  const [keyPersonnel, setKeyPersonnel] = useState<KeyPerson[]>([{
    role: 'Tour Manager',
    name: 'Aaliyah Deere',
    icon: Users
  }, {
    role: 'Tour Manager',
    name: 'Onnesty Peele',
    icon: Users
  }]);
  const [sectionLeaders, setSectionLeaders] = useState<KeyPerson[]>([]);
  const defaultStats = {
    upcomingDates: stats?.upcomingDates ?? 0,
    activeRoutes: stats?.activeRoutes ?? 0,
    contacts: stats?.contacts ?? 0,
    pendingContracts: stats?.pendingContracts ?? 0,
    rosterCount: stats?.rosterCount ?? 0,
    pendingDocs: stats?.pendingDocs ?? 0
  };
  useEffect(() => {
    const fetchContractTourDates = async () => {
      const today = new Date().toISOString().split('T')[0];
      const {
        data
      } = await supabase.from('contracts_v2').select('id, title, status, contract_metadata').not('contract_metadata->performance_date', 'is', null).gte('contract_metadata->performance_date', today).in('status', ['completed', 'pending', 'sent']).order('contract_metadata->performance_date', {
        ascending: true
      }).limit(5);
      if (data) {
        setContractTourDates(data as ContractTourDate[]);
      }
    };
    fetchContractTourDates();
  }, []);
  const sections = [{
    id: 'tour-dates',
    title: 'Dates',
    icon: Calendar,
    color: 'bg-blue-500',
    stat: defaultStats.upcomingDates,
    statLabel: 'upcoming'
  }, {
    id: 'route-planning',
    title: 'Routes',
    icon: MapPin,
    color: 'bg-emerald-500',
    stat: defaultStats.activeRoutes,
    statLabel: 'routes'
  }, {
    id: 'hosts',
    title: 'Contacts',
    icon: Phone,
    color: 'bg-purple-500',
    stat: defaultStats.contacts,
    statLabel: 'contacts'
  }, {
    id: 'contracts',
    title: 'Contracts',
    icon: FileText,
    color: 'bg-amber-500',
    stat: defaultStats.pendingContracts,
    statLabel: 'pending'
  }, {
    id: 'roster',
    title: 'Roster',
    icon: Users,
    color: 'bg-rose-500',
    stat: defaultStats.rosterCount,
    statLabel: 'members'
  }, {
    id: 'documents',
    title: 'Docs',
    icon: ClipboardList,
    color: 'bg-cyan-500',
    stat: defaultStats.pendingDocs,
    statLabel: 'pending'
  }];
  const handleViewCalendar = () => {
    navigate('/calendar');
  };
  return <div className="space-y-5">
      {/* Tour Title & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tourTitle || 'Tour Overview'}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {tourTitle ? 'Tour overview and key information' : 'No active tour configured'}
          </p>
        </div>
        <Button variant="outline" size="default" onClick={handleViewCalendar} className="gap-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
          <CalendarDays className="h-4 w-4" />
          View Calendar
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tour Milestones */}
      <TourMilestones />

      {/* Compact Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {sections.map(section => <button key={section.id} onClick={() => onNavigate(section.id)} className="text-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{section.stat}</div>
            <div className="text-xs capitalize text-slate-600 dark:text-slate-400 mt-1">{section.statLabel}</div>
          </button>)}
      </div>

      {/* Two Column Layout: Route & Upcoming Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tour Route Timeline */}
        <TourRouteTimeline onNavigate={onNavigate} limit={8} />
        {/* Key Personnel */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="h-5 w-5 text-[#003666]" />
              Key Personnel
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {keyPersonnel.length === 0 ? <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No personnel assigned</p>
                <p className="text-xs mt-1 text-slate-500">Configure tour personnel in settings</p>
              </div> : <div className="grid grid-cols-2 gap-3">
                {keyPersonnel.map(person => <div key={`${person.role}-${person.name}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-[#003666] text-white font-semibold">
                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">{person.name}</p>
                      <p className="text-xs truncate text-slate-600 dark:text-slate-400">{person.role}</p>
                    </div>
                  </div>)}
              </div>}
            
            {/* Section Leaders */}
            {sectionLeaders.length > 0 && <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">Section Leaders</p>
                <div className="grid grid-cols-2 gap-2">
                  {sectionLeaders.map(person => <div key={person.role} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="h-6 w-6 rounded-full bg-[#003666]/10 flex items-center justify-center">
                        <Music className="h-3.5 w-3.5 text-[#003666]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate text-slate-700 dark:text-slate-300">{person.role}: {person.name}</p>
                      </div>
                    </div>)}
                </div>
              </div>}
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="py-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                <Calendar className="h-5 w-5 text-[#003666]" />
                Upcoming Tour Dates
              </CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-sm border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300" onClick={() => onNavigate('tour-dates')}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {contractTourDates.length === 0 ? <div className="text-center py-8">
                <Calendar className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No upcoming dates</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => onNavigate('contracts')}>
                  View Contracts
                </Button>
              </div> : <div className="space-y-3">
                {contractTourDates.map(contract => {
              const meta = contract.contract_metadata;
              const performanceDate = meta?.performance_date ? new Date(meta.performance_date) : null;
              const location = [meta?.venue_city, meta?.venue_state].filter(Boolean).join(', ');
              return <div key={contract.id} className="flex items-start gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors" onClick={() => onNavigate('contracts')}>
                      <div className="flex-shrink-0 w-12 text-center bg-[#003666] rounded-lg py-2">
                        {performanceDate ? <>
                            <div className="text-lg font-bold leading-none text-white">
                              {format(performanceDate, 'd')}
                            </div>
                            <div className="text-[10px] uppercase text-blue-200">
                              {format(performanceDate, 'MMM')}
                            </div>
                          </> : <div className="text-xs text-white">TBD</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                          {meta?.host_name || contract.title}
                        </p>
                        {(meta?.venue_name || location) && <p className="text-sm flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-400 mt-1">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#003666]" />
                            {meta?.venue_name || location}
                          </p>}
                      </div>
                      <Badge variant={contract.status === 'completed' ? 'default' : 'secondary'} className="text-xs flex-shrink-0 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                        {contract.status === 'completed' ? 'Signed' : contract.status}
                      </Badge>
                    </div>;
            })}
              </div>}
            
            {/* Calendar Integration Note */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" />
                Tour dates from signed contracts
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      

      {/* Section Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {sections.map(section => <button key={section.id} onClick={() => onNavigate(section.id)} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left shadow-sm">
            <section.icon className={cn("h-6 w-6 mb-2", section.color.replace('bg-', 'text-'))} />
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{section.title}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{section.stat} {section.statLabel}</div>
          </button>)}
      </div>
    </div>;
};