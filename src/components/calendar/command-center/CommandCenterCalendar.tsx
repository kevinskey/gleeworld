import { useState, useMemo, useEffect } from "react";
import { format, isSameDay, addMonths, subMonths, addDays, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useGleeWorldEvents, GleeWorldEvent } from "@/hooks/useGleeWorldEvents";
import { useCalendars, CalendarInfo } from "@/hooks/useCalendars";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommandCenterHeader } from "./CommandCenterHeader";
import { CommandCenterFilterRail } from "./CommandCenterFilterRail";
import { CommandCenterGrid } from "./CommandCenterGrid";
import { DailyRunSheet } from "./DailyRunSheet";
import { AgendaView } from "./AgendaView";
import { CreateEventDialog } from "../CreateEventDialog";

// Eastern Time helpers
const isSameDayET = (date1: Date, date2: Date): boolean => {
  const tz = 'America/New_York';
  const d1 = toZonedTime(date1, tz);
  const d2 = toZonedTime(date2, tz);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export type ViewMode = 'month' | 'week' | 'agenda';
export type CategoryFilter = 'glee' | 'courses' | 'liturgy' | 'performances' | 'leadership' | 'tour' | 'personal' | 'academic';

export interface CategoryConfig {
  id: CategoryFilter;
  label: string;
  color: string;
  icon: string;
}

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'glee', label: 'Glee Club', color: '#003366', icon: 'music' },
  { id: 'courses', label: 'Courses', color: '#B8860B', icon: 'book-open' },
  { id: 'academic', label: 'Assignments & Tests', color: '#F59E0B', icon: 'clipboard' },
  { id: 'liturgy', label: 'Liturgy', color: '#6B4C9A', icon: 'church' },
  { id: 'performances', label: 'Performances', color: '#8B0000', icon: 'mic' },
  { id: 'leadership', label: 'Leadership', color: '#2F4F4F', icon: 'users' },
  { id: 'tour', label: 'Tour', color: '#CD853F', icon: 'plane' },
  { id: 'personal', label: 'Personal', color: '#708090', icon: 'user' },
];

// Map event types and calendar names to categories
const getCategoryForEvent = (event: GleeWorldEvent): CategoryFilter => {
  // Check source first for academic items
  if (event.source === 'assignment' || event.source === 'test') {
    return 'academic';
  }
  
  const title = event.title?.toLowerCase() || '';
  const calendarName = event.gw_calendars?.name?.toLowerCase() || '';
  const eventType = event.event_type?.toLowerCase() || '';
  
  // Check for academic event types
  if (['assignment', 'test', 'exam', 'quiz', 'project', 'paper'].includes(eventType)) {
    return 'academic';
  }
  
  // Check for specific keywords
  if (calendarName.includes('glee') || calendarName.includes('scgc') || title.includes('glee')) {
    return 'glee';
  }
  if (calendarName.includes('course') || calendarName.includes('mus ') || calendarName.includes('mus-') || eventType === 'class') {
    return 'courses';
  }
  if (calendarName.includes('liturgy') || calendarName.includes('chapel') || calendarName.includes('bowman') || title.includes('chapel')) {
    return 'liturgy';
  }
  if (eventType === 'performance' || eventType === 'concert' || title.includes('concert') || title.includes('performance')) {
    return 'performances';
  }
  if (calendarName.includes('executive') || calendarName.includes('leadership') || eventType === 'meeting') {
    return 'leadership';
  }
  if (calendarName.includes('tour') || title.includes('tour')) {
    return 'tour';
  }
  return 'personal';
};

export const CommandCenterCalendar = () => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'agenda' : 'month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<CategoryFilter[]>([
    'glee', 'courses', 'academic', 'liturgy', 'performances', 'leadership', 'tour', 'personal'
  ]);
  const [activeCalendarFilters, setActiveCalendarFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [isFilterRailCollapsed, setIsFilterRailCollapsed] = useState(isMobile);

  const { events, loading, fetchEvents } = useGleeWorldEvents();
  const { data: calendars, isLoading: calendarsLoading } = useCalendars();
  const { user } = useAuth();
  const { isAdmin, isExecutiveBoard, loading: roleLoading } = useUserRole();
  const canManageEvents = !roleLoading && (isAdmin() || isExecutiveBoard());

  // Initialize calendar filters when calendars load
  useEffect(() => {
    if (calendars && calendars.length > 0 && activeCalendarFilters.length === 0) {
      setActiveCalendarFilters(calendars.map(c => c.id));
    }
  }, [calendars]);

  // Update view mode when mobile status changes
  useEffect(() => {
    if (isMobile && viewMode !== 'agenda') {
      setViewMode('agenda');
    }
  }, [isMobile]);

  // Filter events by category AND calendar
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const category = getCategoryForEvent(event);
      const matchesCategoryFilter = activeCategoryFilters.includes(category);
      
      // For calendar filter, check if event's calendar_id is in active filters
      // If event has no calendar_id (like assignments), check if any calendar filter is active
      const matchesCalendarFilter = !event.calendar_id || 
        activeCalendarFilters.includes(event.calendar_id) ||
        activeCalendarFilters.length === 0;
      
      const matchesSearch = !searchQuery || 
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategoryFilter && matchesCalendarFilter && matchesSearch;
    });
  }, [events, activeCategoryFilters, activeCalendarFilters, searchQuery]);

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(event => 
      isSameDayET(new Date(event.start_date), selectedDate)
    );
  }, [filteredEvents, selectedDate]);

  // Navigation handlers
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1);
    setSelectedDate(newDate);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const toggleCategoryFilter = (filter: CategoryFilter) => {
    setActiveCategoryFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const toggleCalendarFilter = (calendarId: string) => {
    setActiveCalendarFilters(prev => 
      prev.includes(calendarId) 
        ? prev.filter(f => f !== calendarId)
        : [...prev, calendarId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#003366] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Header */}
      <CommandCenterHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigateMonth={navigateMonth}
        onNavigateDay={navigateDay}
        onToday={goToToday}
        onAddEvent={() => setShowCreateEvent(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        canManageEvents={canManageEvents}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Filter Rail - Hidden on mobile */}
        {!isMobile && (
          <CommandCenterFilterRail
            categories={CATEGORY_CONFIGS}
            calendars={calendars || []}
            activeCategoryFilters={activeCategoryFilters}
            activeCalendarFilters={activeCalendarFilters}
            onToggleCategoryFilter={toggleCategoryFilter}
            onToggleCalendarFilter={toggleCalendarFilter}
            isCollapsed={isFilterRailCollapsed}
            onToggleCollapse={() => setIsFilterRailCollapsed(!isFilterRailCollapsed)}
          />
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Calendar Grid or Agenda */}
          <div className="flex-1 min-h-0 overflow-hidden p-2 lg:p-4">
            {viewMode === 'agenda' || isMobile ? (
              <AgendaView
                events={filteredEvents}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onNavigateDay={navigateDay}
                getCategoryForEvent={getCategoryForEvent}
                categoryConfigs={CATEGORY_CONFIGS}
                onEventDeleted={fetchEvents}
              />
            ) : (
              <CommandCenterGrid
                events={filteredEvents}
                currentDate={currentDate}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                viewMode={viewMode}
                getCategoryForEvent={getCategoryForEvent}
                categoryConfigs={CATEGORY_CONFIGS}
                onEventDeleted={fetchEvents}
              />
            )}
          </div>

          {/* Daily Run Sheet - Right panel on desktop, bottom on tablet */}
          {!isMobile && (
            <div className="lg:w-96 xl:w-[420px] flex-shrink-0 border-l border-slate-300 bg-white">
              <DailyRunSheet
                selectedDate={selectedDate}
                events={selectedDateEvents}
                getCategoryForEvent={getCategoryForEvent}
                categoryConfigs={CATEGORY_CONFIGS}
                onEventDeleted={fetchEvents}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog 
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onEventCreated={() => {
          setShowCreateEvent(false);
          fetchEvents();
        }} 
        initialDate={selectedDate} 
      />
    </div>
  );
};
