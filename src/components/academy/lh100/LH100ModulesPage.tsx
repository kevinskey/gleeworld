import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, BookOpen, Sparkles, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { WeekSidebar } from './WeekSidebar';
import { WeeklyModuleEditor, LH100Module } from './WeeklyModuleEditor';
import { AddModuleDialog, NewModuleData } from './AddModuleDialog';
import { addWeeks, format, parseISO, startOfWeek, nextSunday } from 'date-fns';

// Liturgical calendar data for Spring 2026 semester
const LITURGICAL_WEEKS_2026 = [
  { week: 1, title: 'Second Sunday in Ordinary Time', date: '2026-01-18', season: 'Ordinary Time' },
  { week: 2, title: 'Third Sunday in Ordinary Time', date: '2026-01-25', season: 'Ordinary Time' },
  { week: 3, title: 'Fourth Sunday in Ordinary Time', date: '2026-02-01', season: 'Ordinary Time' },
  { week: 4, title: 'Presentation of the Lord', date: '2026-02-02', season: 'Feast' },
  { week: 5, title: 'Fifth Sunday in Ordinary Time', date: '2026-02-08', season: 'Ordinary Time' },
  { week: 6, title: 'Sixth Sunday in Ordinary Time', date: '2026-02-15', season: 'Ordinary Time' },
  { week: 7, title: 'Ash Wednesday', date: '2026-02-18', season: 'Lent' },
  { week: 8, title: 'First Sunday of Lent', date: '2026-02-22', season: 'Lent' },
  { week: 9, title: 'Second Sunday of Lent', date: '2026-03-01', season: 'Lent' },
  { week: 10, title: 'Third Sunday of Lent', date: '2026-03-08', season: 'Lent' },
  { week: 11, title: 'Fourth Sunday of Lent (Laetare)', date: '2026-03-15', season: 'Lent' },
  { week: 12, title: 'Fifth Sunday of Lent', date: '2026-03-22', season: 'Lent' },
  { week: 13, title: 'Palm Sunday', date: '2026-03-29', season: 'Holy Week' },
  { week: 14, title: 'Holy Thursday / Good Friday', date: '2026-04-02', season: 'Triduum' },
  { week: 15, title: 'Easter Vigil / Easter Sunday', date: '2026-04-05', season: 'Easter' },
  { week: 16, title: 'Second Sunday of Easter (Divine Mercy)', date: '2026-04-12', season: 'Easter' },
  { week: 17, title: 'Third Sunday of Easter', date: '2026-04-19', season: 'Easter' },
  { week: 18, title: 'Fourth Sunday of Easter (Good Shepherd)', date: '2026-04-26', season: 'Easter' },
  { week: 19, title: 'Fifth Sunday of Easter', date: '2026-05-03', season: 'Easter' },
  { week: 20, title: 'Sixth Sunday of Easter', date: '2026-05-10', season: 'Easter' },
  { week: 21, title: 'Ascension of the Lord', date: '2026-05-17', season: 'Easter' },
  { week: 22, title: 'Seventh Sunday of Easter', date: '2026-05-24', season: 'Easter' },
  { week: 23, title: 'Pentecost Sunday', date: '2026-05-31', season: 'Pentecost' },
  { week: 24, title: 'Most Holy Trinity', date: '2026-06-07', season: 'Ordinary Time' },
];

const getSeasonObjectives = (season: string): string[] => {
  switch (season) {
    case 'Lent':
      return [
        'Enter into the penitential spirit of Lent',
        'Prepare readings focusing on conversion',
        'Plan appropriate Lenten music'
      ];
    case 'Holy Week':
      return [
        'Prepare for the most sacred week',
        'Coordinate Palm Sunday procession',
        'Plan music for the Passion narrative'
      ];
    case 'Triduum':
      return [
        'Prepare the Sacred Triduum liturgies',
        'Coordinate Holy Thursday foot washing',
        'Plan Good Friday veneration music'
      ];
    case 'Easter':
      return [
        'Celebrate the joy of the Resurrection',
        'Prepare Easter season readings',
        'Plan joyful Alleluia-filled music'
      ];
    case 'Pentecost':
      return [
        'Celebrate the coming of the Holy Spirit',
        'Prepare multilingual readings',
        'Plan Spirit-themed music'
      ];
    case 'Feast':
      return [
        'Prepare for the feast day celebration',
        'Understand the significance of this day',
        'Plan appropriate celebratory music'
      ];
    default:
      return [
        'Prepare readings and prayers for Sunday liturgy',
        'Reflect on the Gospel message',
        'Plan music ministry for the celebration'
      ];
  }
};

const getSeasonDescription = (season: string, title: string): string => {
  switch (season) {
    case 'Lent':
      return 'Lenten season preparation - Time of prayer, fasting, and almsgiving.';
    case 'Holy Week':
      return 'Sacred preparation for Holy Week - The most important week in the liturgical year.';
    case 'Triduum':
      return 'The Sacred Triduum - The three holiest days of the Church year.';
    case 'Easter':
      return 'Easter season celebration - 50 days of resurrection joy.';
    case 'Pentecost':
      return 'Pentecost celebration - Birthday of the Church.';
    case 'Feast':
      return 'Feast day celebration and liturgical preparation.';
    default:
      return 'Sunday liturgical preparation and reflection.';
  }
};

interface LH100ModulesPageProps {
  isEnrolled?: boolean;
  isAdmin?: boolean;
}

export const LH100ModulesPage: React.FC<LH100ModulesPageProps> = ({
  isEnrolled = true,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<LH100Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [selectedModule, setSelectedModule] = useState<LH100Module | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch modules
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const { data, error } = await supabase
          .from('lh100_modules')
          .select('*')
          .order('week_number', { ascending: true });

        if (error) throw error;
        setModules(data || []);
        
        // Auto-select first module
        if (data && data.length > 0 && !selectedModule) {
          setSelectedModule(data[0]);
        }
      } catch (error) {
        console.error('Error fetching LH100 modules:', error);
        toast.error('Failed to load modules');
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  const handleUpdateModule = async (updatedModule: LH100Module) => {
    const { error } = await supabase
      .from('lh100_modules')
      .update({
        title: updatedModule.title,
        description: updatedModule.description,
        start_date: updatedModule.start_date,
        end_date: updatedModule.end_date,
        is_active: updatedModule.is_active,
        is_locked: updatedModule.is_locked,
        learning_objectives: updatedModule.learning_objectives,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedModule.id);

    if (error) throw error;

    setModules(prev => prev.map(m => 
      m.id === updatedModule.id ? updatedModule : m
    ));
    setSelectedModule(updatedModule);
  };

  const handleAddModule = async (data: NewModuleData) => {
    const newId = `lh-${Date.now()}`;
    const { data: newModule, error } = await supabase
      .from('lh100_modules')
      .insert({
        id: newId,
        week_number: data.week_number,
        title: data.title,
        description: data.description || null,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        end_date: data.end_date || data.start_date || new Date().toISOString().split('T')[0],
        is_active: false,
        is_locked: false,
        learning_objectives: data.learning_objectives
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add module');
      throw error;
    }

    const sortedModules = [...modules, newModule].sort((a, b) => a.week_number - b.week_number);
    setModules(sortedModules);
    setSelectedModule(newModule);
    toast.success('Week added');
  };

  const handleDeleteModule = async (id: string) => {
    const { error } = await supabase
      .from('lh100_modules')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete module');
      throw error;
    }

    const remaining = modules.filter(m => m.id !== id);
    setModules(remaining);
    setSelectedModule(remaining.length > 0 ? remaining[0] : null);
    toast.success('Module deleted');
  };

  // Auto-generate liturgical modules
  const handleAutoGenerate = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const existingWeeks = new Set(modules.map(m => m.week_number));
    const missingWeeks = LITURGICAL_WEEKS_2026.filter(w => !existingWeeks.has(w.week));

    if (missingWeeks.length === 0) {
      toast.info('All liturgical weeks are already created');
      return;
    }

    setGenerating(true);
    let created = 0;

    try {
      for (const week of missingWeeks) {
        const { error } = await supabase
          .from('lh100_modules')
          .insert({
            id: `lh-${week.week}`,
            week_number: week.week,
            title: week.title,
            description: getSeasonDescription(week.season, week.title),
            start_date: week.date,
            end_date: week.date,
            is_active: false,
            is_locked: false,
            learning_objectives: getSeasonObjectives(week.season)
          });

        if (error) {
          console.error(`Failed to create week ${week.week}:`, error);
        } else {
          created++;
        }
      }

      // Refresh modules
      const { data } = await supabase
        .from('lh100_modules')
        .select('*')
        .order('week_number', { ascending: true });

      if (data) {
        setModules(data);
        if (!selectedModule && data.length > 0) {
          setSelectedModule(data[0]);
        }
      }

      toast.success(`Created ${created} liturgical weeks`);
    } catch (error) {
      console.error('Error generating modules:', error);
      toast.error('Failed to generate modules');
    } finally {
      setGenerating(false);
    }
  };

  // Scrape USCCB readings
  const handleScrapeUSCCB = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setScraping(true);
    toast.info('Starting USCCB scrape for Year C... This may take a few minutes.');

    try {
      const { data, error } = await supabase.functions.invoke('scrape-usccb-readings', {
        body: { cycle: 'C', batchSize: 5 }
      });

      if (error) throw error;

      toast.success(`Scraped ${data?.scraped || 0} USCCB readings successfully!`);
    } catch (error) {
      console.error('Error scraping USCCB:', error);
      toast.error('Failed to scrape USCCB readings');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Admin Controls */}
      {user && (
        <div className="flex items-center justify-end gap-2 px-1 flex-wrap">
          {modules.length < 24 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoGenerate}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Auto-Generate Liturgical Weeks'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleScrapeUSCCB}
            disabled={scraping}
            className="gap-2"
          >
            {scraping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {scraping ? 'Scraping USCCB...' : 'Scrape USCCB Readings (Year C)'}
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-240px)] min-h-[600px]">
        {/* Left Sidebar */}
        <WeekSidebar
          modules={modules}
          selectedModuleId={selectedModule?.id || null}
          onSelectModule={setSelectedModule}
          onAddModule={() => setShowAddDialog(true)}
          loading={loading}
          canAdd={!!user}
        />

        {/* Main Editor */}
        <Card className="flex-1 overflow-hidden">
          {loading ? (
            <CardContent className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          ) : selectedModule ? (
            <CardContent className="p-4 sm:p-6 overflow-y-auto h-full">
              <WeeklyModuleEditor
                module={selectedModule}
                onUpdate={handleUpdateModule}
                onDelete={isAdmin ? handleDeleteModule : undefined}
                isAdmin={isAdmin}
              />
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
              <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a Week</h3>
              <p className="text-muted-foreground max-w-md">
                Choose a week from the sidebar to view and edit its content, learning objectives, and settings.
              </p>
              {user && modules.length === 0 && (
                <Button 
                  onClick={handleAutoGenerate} 
                  disabled={generating}
                  className="mt-4 gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Liturgical Calendar
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Add Module Dialog */}
        <AddModuleDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAdd={handleAddModule}
          nextWeekNumber={modules.length + 1}
        />
      </div>
    </div>
  );
};

export default LH100ModulesPage;
