import React, { useState, lazy, Suspense } from 'react';
import { MessagesPanel } from './MessagesPanel';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityHubModule } from './modules/CommunityHubModule';
import DashboardHeroCarousel from '@/components/hero/DashboardHeroCarousel';
import DashboardFeaturesCarousel from '@/components/hero/DashboardFeaturesCarousel';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Users, Calendar as CalendarIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AuditionsModule } from '@/components/modules/AuditionsModule';
import { AttendanceModule } from '@/components/modules/AttendanceModule';
import { MusicLibraryModule } from '@/components/modules/MusicLibraryModule';
import { TourManagerModule } from '@/components/modules/TourManagerModule';
import { PRHubModule } from '@/components/modules/PRHubModule';
import { StudentConductorModule } from '@/components/modules/StudentConductorModule';
import { TreasurerModule } from '@/components/modules/TreasurerModule';
const CalendarViewsLazy = lazy(() => import("@/components/calendar/CalendarViews").then(m => ({ default: m.CalendarViews })));

export const UnifiedDashboard = () => {
  const { user } = useAuth();
  
  const [showMessages, setShowMessages] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [calendarCollapsed, setCalendarCollapsed] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const moduleId = params.get('module');
    setActiveModuleId(moduleId ? moduleId : null);
  }, [location.search]);

  // Debug logging
  console.log('🎯 UnifiedDashboard rendering:', {
    user: !!user,
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">

      {/* Row 1: Hero + Features side-by-side */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Left: Hero */}
          <DashboardHeroCarousel />
          <div className="self-center w-full"><DashboardFeaturesCarousel /></div>
        </div>
      </div>

      {/* Row 2: Community Hub full width (collapsible when a module is active) */}
      <div className="px-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" /> Community Hub
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-controls="community-hub"
            aria-expanded={!activeModuleId}
            onClick={() => setActiveModuleId((prev) => (prev ? null : 'collapsed-toggle'))}
          >
            {activeModuleId ? 'Expand' : 'Collapse'}
          </Button>
        </div>
        <div
          id="community-hub"
          className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden transition-[max-height,opacity] duration-300"
          style={{ maxHeight: activeModuleId ? 0 : '45vh', opacity: activeModuleId ? 0 : 1 }}
        >
          <CommunityHubModule />
        </div>
      </div>
      {/* Row 3: Unified Calendar visible to all logged-in users */}
      <div className="px-6 pb-6">
        <div className="mb-2">
          <div className="border-l-4 border-primary pl-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h2 className="font-sans font-semibold tracking-tight text-base sm:text-lg md:text-xl">Glee Calendar</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-controls="glee-calendar"
                aria-expanded={!calendarCollapsed}
                onClick={() => setCalendarCollapsed((v) => !v)}
              >
                {calendarCollapsed ? 'Expand' : 'Collapse'}
              </Button>
            </div>
          </div>
        </div>
        {!calendarCollapsed && (
          <Suspense fallback={
            <div className="border border-border rounded-xl bg-background/60 p-4">
              Loading calendar…
            </div>
          }>
            <div id="glee-calendar">
              <CalendarViewsLazy />
            </div>
          </Suspense>
        )}
      </div>

      {/* Row 4: Key Modules (stacked) */}
      <div className="px-6 pb-10 space-y-6">
        <AuditionsModule user={user} />
        <AttendanceModule user={user} />
        <MusicLibraryModule user={user} />
        <TourManagerModule user={user} />
        <PRHubModule user={user} />
        <TreasurerModule user={user} />
        <StudentConductorModule user={user} />
      </div>

      {/* Messages Panel Overlay */}
      {showMessages && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10">
          <MessagesPanel onClose={() => setShowMessages(false)} />
        </div>
      )}

    </div>
  );
};
