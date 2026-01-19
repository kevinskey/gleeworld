import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Music, BookOpen, FileText, Loader2, Library, FileMusic, Headphones, ScrollText, ChevronDown } from 'lucide-react';
import { useLiturgicalWeeks, LiturgicalWeek } from '@/hooks/useLiturgicalWeeks';
import { useUSCCBSync } from '@/hooks/useUSCCBSync';
import { useAuth } from '@/contexts/AuthContext';
import { PlannerOverviewTab } from './PlannerOverviewTab';
import { PlannerMusicTab } from './PlannerMusicTab';
import { PlannerPsalmTab } from './PlannerPsalmTab';
import { PlannerMediaTab } from './PlannerMediaTab';
import { format, parseISO } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy load heavy library components
const SheetMusicLibrary = lazy(() => import('@/components/music-library/SheetMusicLibrary').then(m => ({ default: m.SheetMusicLibrary })));
const FinderMediaLibrary = lazy(() => import('@/components/media-library/FinderMediaLibrary').then(m => ({ default: m.FinderMediaLibrary })));
const MusicXMLLibrary = lazy(() => import('@/components/practice-studio/MusicXMLLibrary').then(m => ({ default: m.MusicXMLLibrary })));
const USCCBReadingsScroll = lazy(() => import('./USCCBReadingsScroll').then(m => ({ default: m.USCCBReadingsScroll })));

interface LiturgicalPlannerProps {
  isAdmin?: boolean;
}

const getSeasonColor = (season: string | null): string => {
  switch (season?.toLowerCase()) {
    case 'ordinary time':
      return 'bg-green-600 text-white';
    case 'lent':
      return 'bg-purple-700 text-white';
    case 'holy week':
      return 'bg-red-800 text-white';
    case 'easter':
      return 'bg-amber-500 text-white';
    case 'advent':
      return 'bg-blue-700 text-white';
    case 'christmas':
      return 'bg-yellow-500 text-black';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const LiturgicalPlanner: React.FC<LiturgicalPlannerProps> = ({ isAdmin = false }) => {
  const { weeks, loading, updateWeek } = useLiturgicalWeeks();
  const [selectedWeek, setSelectedWeek] = useState<LiturgicalWeek | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { syncLiturgicalData, liturgicalData, isLoading: isSyncingLiturgical, clearData } = useUSCCBSync();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileWeekOpen, setMobileWeekOpen] = useState(false);

  // Sync liturgical data when week changes
  useEffect(() => {
    if (selectedWeek) {
      const dateStr = selectedWeek.sunday_date || selectedWeek.week_of;
      if (dateStr) {
        syncLiturgicalData(dateStr);
      }
    }
    return () => clearData();
  }, [selectedWeek?.id]);

  const handleSelectWeek = (week: LiturgicalWeek) => {
    setSelectedWeek(week);
    setMobileWeekOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 sm:p-12">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
        <span className="ml-2 text-base sm:text-lg">Loading Planner...</span>
      </div>
    );
  }

  // Reusable Sunday list component
  const SundayList = ({ compact = false, onSelect }: { compact?: boolean; onSelect?: (week: LiturgicalWeek) => void }) => (
    <div className={`space-y-1 ${compact ? 'p-1' : 'p-2'}`}>
      {weeks.map((week) => {
        const dateStr = week.sunday_date || week.week_of;
        const date = dateStr ? parseISO(dateStr) : null;
        const isSelected = selectedWeek?.id === week.id;
        
        return (
          <button
            key={week.id}
            onClick={() => onSelect ? onSelect(week) : setSelectedWeek(week)}
            className={`w-full text-left ${compact ? 'p-2' : 'p-3'} rounded-lg transition-all ${
              isSelected 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'hover:bg-muted/50 border border-transparent hover:border-border'
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'} ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {date ? format(date, 'MMM d, yyyy') : 'No date'}
                </span>
                <Badge 
                  variant="secondary" 
                  className={`text-[10px] px-1.5 py-0 shrink-0 ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : getSeasonColor(week.season)}`}
                >
                  {week.season || 'Unknown'}
                </Badge>
              </div>
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                {week.sunday_title || week.title || 'Untitled'}
              </span>
              {week.psalm && (
                <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {week.psalm}
                </span>
              )}
            </div>
          </button>
        );
      })}
      {weeks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No Sundays configured</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 sm:gap-4 px-2 sm:px-0">
      {/* Mobile Sunday Selector - Shows as button that opens sheet */}
      {isMobile && (
        <Sheet open={mobileWeekOpen} onOpenChange={setMobileWeekOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between h-auto py-3 px-4"
            >
              <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {selectedWeek?.sunday_title || selectedWeek?.title || 'Select a Sunday'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedWeek 
                      ? format(parseISO(selectedWeek.sunday_date || selectedWeek.week_of), 'MMM d, yyyy')
                      : `${weeks.length} Sundays available`
                    }
                  </p>
                </div>
                {selectedWeek?.season && (
                  <Badge className={`${getSeasonColor(selectedWeek.season)} text-[10px] shrink-0`}>
                    {selectedWeek.season}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
            <SheetHeader className="pb-2 border-b">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Sundays
              </SheetTitle>
              <p className="text-xs text-muted-foreground">
                {weeks.length} Sundays • Tap to select
              </p>
            </SheetHeader>
            <ScrollArea className="h-[calc(70vh-100px)] mt-2">
              <SundayList compact onSelect={handleSelectWeek} />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Layout - Stack on mobile, side by side on desktop */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 min-h-[60vh] lg:min-h-[600px] lg:h-[calc(100vh-200px)]">
        {/* Desktop Left Sidebar - Sunday List - Hidden on mobile */}
        <Card className="hidden lg:block lg:w-72 xl:w-80 shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Sundays
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)] min-h-[400px]">
              <SundayList />
            </ScrollArea>
          </CardContent>
        </Card>

      {/* Main Workspace */}
      <Card className="flex-1 overflow-hidden">
        {selectedWeek ? (
          <>
            <CardHeader className="pb-2 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-xl lg:text-2xl">
                    {selectedWeek.sunday_title || selectedWeek.title || 'Liturgical Sunday'}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {selectedWeek.sunday_date || selectedWeek.week_of 
                        ? format(parseISO(selectedWeek.sunday_date || selectedWeek.week_of), 'MMMM d, yyyy')
                        : 'No date'}
                    </span>
                    <Badge className={getSeasonColor(selectedWeek.season)}>
                      {selectedWeek.season || 'Unknown Season'}
                    </Badge>
                    {selectedWeek.lectionary_cycle && (
                      <Badge variant="outline">Year {selectedWeek.lectionary_cycle}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <ScrollArea className="w-full whitespace-nowrap">
                  <TabsList className="w-max min-w-full justify-start rounded-none border-b bg-muted/30 p-0 h-auto">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="music" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <Music className="h-4 w-4 mr-2" />
                    Service Music
                  </TabsTrigger>
                  <TabsTrigger 
                    value="psalm" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Psalm
                  </TabsTrigger>
                  <TabsTrigger 
                    value="media" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Media
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sheet-music" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <Library className="h-4 w-4 mr-2" />
                    Sheet Music
                  </TabsTrigger>
                  <TabsTrigger 
                    value="media-library" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <Headphones className="h-4 w-4 mr-2" />
                    Audio/Video
                  </TabsTrigger>
                  <TabsTrigger 
                    value="musicxml" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <FileMusic className="h-4 w-4 mr-2" />
                    MusicXML
                  </TabsTrigger>
                  <TabsTrigger 
                    value="usccb-readings" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <ScrollText className="h-4 w-4 mr-2" />
                    USCCB Readings
                  </TabsTrigger>
                </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <ScrollArea className="h-[calc(100vh-380px)] min-h-[350px]">
                  <TabsContent value="overview" className="m-0 p-4">
                    <PlannerOverviewTab 
                      week={selectedWeek} 
                      onUpdate={updateWeek}
                      isAdmin={isAdmin}
                    />
                  </TabsContent>
                  <TabsContent value="music" className="m-0 p-4">
                    <PlannerMusicTab 
                      weekId={selectedWeek.id}
                      isAdmin={isAdmin}
                      liturgicalData={liturgicalData}
                      sundayTitle={selectedWeek.sunday_title || selectedWeek.title}
                      season={selectedWeek.season}
                    />
                  </TabsContent>
                  <TabsContent value="psalm" className="m-0 p-4">
                    <PlannerPsalmTab 
                      week={selectedWeek}
                      onUpdate={updateWeek}
                      isAdmin={isAdmin}
                    />
                  </TabsContent>
                  <TabsContent value="media" className="m-0 p-4">
                    <PlannerMediaTab 
                      weekId={selectedWeek.id}
                      isAdmin={isAdmin}
                    />
                  </TabsContent>
                  <TabsContent value="sheet-music" className="m-0 p-4">
                    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Loading Sheet Music Library...</span></div>}>
                      <SheetMusicLibrary 
                        searchQuery=""
                        selectedCategory="all"
                        sortBy="title"
                        sortOrder="asc"
                        viewMode="grid"
                      />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="media-library" className="m-0">
                    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Loading Media Library...</span></div>}>
                      <FinderMediaLibrary />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="musicxml" className="m-0 p-4">
                    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Loading MusicXML Library...</span></div>}>
                      <MusicXMLLibrary user={user} />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="usccb-readings" className="m-0">
                    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Loading USCCB Readings...</span></div>}>
                      <USCCBReadingsScroll />
                    </Suspense>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Select a Sunday</h3>
            <p className="text-muted-foreground max-w-md">
              Choose a Sunday from the list on the left to view and edit its liturgical plan, music selections, and media.
            </p>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
};
