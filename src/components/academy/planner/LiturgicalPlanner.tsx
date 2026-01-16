import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Music, BookOpen, FileText, Loader2 } from 'lucide-react';
import { useLiturgicalWeeks, LiturgicalWeek } from '@/hooks/useLiturgicalWeeks';
import { PlannerOverviewTab } from './PlannerOverviewTab';
import { PlannerMusicTab } from './PlannerMusicTab';
import { PlannerPsalmTab } from './PlannerPsalmTab';
import { PlannerMediaTab } from './PlannerMediaTab';
import { format, parseISO } from 'date-fns';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading Planner...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left Sidebar - Sunday List */}
      <Card className="lg:w-72 xl:w-80 flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Sundays
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)] min-h-[400px]">
            <div className="space-y-1 p-2">
              {weeks.map((week) => {
                const dateStr = week.sunday_date || week.week_of;
                const date = dateStr ? parseISO(dateStr) : null;
                const isSelected = selectedWeek?.id === week.id;
                
                return (
                  <button
                    key={week.id}
                    onClick={() => setSelectedWeek(week)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'hover:bg-muted/50 border border-transparent hover:border-border'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium text-sm ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                          {date ? format(date, 'MMM d, yyyy') : 'No date'}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] px-1.5 py-0 ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : getSeasonColor(week.season)}`}
                        >
                          {week.season || 'Unknown'}
                        </Badge>
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
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
                  <p>No Sundays configured</p>
                </div>
              )}
            </div>
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
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 p-0 h-auto">
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
                    Music Plan
                  </TabsTrigger>
                  <TabsTrigger 
                    value="psalm" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Psalm Planner
                  </TabsTrigger>
                  <TabsTrigger 
                    value="media" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Media
                  </TabsTrigger>
                </TabsList>

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
  );
};
