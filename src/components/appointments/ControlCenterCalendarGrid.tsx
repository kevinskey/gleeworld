import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CalendarDays, CalendarRange, ListChecks, Clock,
  MapPin, QrCode, Users, CalendarPlus
} from 'lucide-react';

const calendarCards = [
  {
    key: 'monthly',
    label: 'Monthly View',
    description: 'Full month grid with events',
    icon: CalendarDays,
    gradient: 'from-cyan-500/30 to-blue-600/30',
    accent: 'text-cyan-300',
    badge: 'Core',
    route: '/calendar',
  },
  {
    key: 'weekly',
    label: 'Weekly View',
    description: 'Time grid & day columns',
    icon: CalendarRange,
    gradient: 'from-violet-500/30 to-purple-600/30',
    accent: 'text-violet-300',
    badge: 'Core',
    route: '/calendar',
  },
  {
    key: 'agenda',
    label: 'Agenda',
    description: 'Chronological event list',
    icon: ListChecks,
    gradient: 'from-amber-500/30 to-orange-600/30',
    accent: 'text-amber-300',
    badge: 'View',
    route: '/calendar',
  },
  {
    key: 'availability',
    label: 'Availability',
    description: 'Provider time slots',
    icon: Clock,
    gradient: 'from-emerald-500/30 to-green-600/30',
    accent: 'text-emerald-300',
    badge: 'Admin',
    route: '/control-center',
  },
  {
    key: 'venues',
    label: 'Venues',
    description: 'Location & room manager',
    icon: MapPin,
    gradient: 'from-rose-500/30 to-pink-600/30',
    accent: 'text-rose-300',
    badge: 'Admin',
    route: '/calendar',
  },
  {
    key: 'qr',
    label: 'QR Check-In',
    description: 'Generate attendance codes',
    icon: QrCode,
    gradient: 'from-sky-500/30 to-indigo-600/30',
    accent: 'text-sky-300',
    badge: 'Tool',
    route: '/calendar',
  },
  {
    key: 'rsvps',
    label: 'RSVPs',
    description: 'Registration tracking',
    icon: Users,
    gradient: 'from-teal-500/30 to-cyan-600/30',
    accent: 'text-teal-300',
    badge: 'Data',
    route: '/calendar',
  },
  {
    key: 'create',
    label: 'New Event',
    description: 'Quick event creation',
    icon: CalendarPlus,
    gradient: 'from-yellow-500/30 to-amber-600/30',
    accent: 'text-yellow-300',
    badge: 'Action',
    route: '/calendar',
  },
];

export const ControlCenterCalendarGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {calendarCards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => navigate(card.route)}
              className={cn(
                "group relative flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl",
                "bg-gradient-to-br border border-white/10 backdrop-blur-md",
                "hover:scale-[1.03] hover:border-white/25 hover:shadow-lg hover:shadow-white/5",
                "transition-all duration-300 text-center",
                card.gradient
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center",
                "bg-white/10 group-hover:bg-white/20 transition-colors border border-white/10"
              )}>
                <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", card.accent)} />
              </div>

              {/* Label */}
              <span className={cn("font-['Cinzel'] text-sm sm:text-base font-bold tracking-wide", card.accent)}>
                {card.label}
              </span>

              {/* Description */}
              <span className="text-white/70 text-[11px] sm:text-xs leading-tight line-clamp-2">
                {card.description}
              </span>

              {/* Badge */}
              <Badge className="bg-white/10 text-white/60 border-white/10 text-[9px] px-2">
                {card.badge}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        <button
          onClick={() => navigate('/calendar')}
          className="text-xs text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 border border-white/10"
        >
          Open Full Calendar →
        </button>
        <button
          onClick={() => navigate('/public-calendar')}
          className="text-xs text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 border border-white/10"
        >
          Public Calendar →
        </button>
      </div>
    </div>
  );
};
