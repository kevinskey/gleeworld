import { useState, useEffect } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { ModuleProps } from '@/types/unified-modules';

interface ClassYear {
  year: number;
  count: number;
}

export function AlumniTimelineModule({ user, isFullPage }: ModuleProps) {
  const [classYears, setClassYears] = useState<ClassYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassYears();
  }, []);

  const fetchClassYears = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('graduation_year')
        .eq('role', 'alumna')
        .not('graduation_year', 'is', null);

      if (error) throw error;

      // Group by year and count
      const yearCounts = (data || []).reduce((acc: Record<number, number>, profile) => {
        const year = profile.graduation_year as number;
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {});

      const years = Object.entries(yearCounts)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => b.year - a.year);

      setClassYears(years);
    } catch (error) {
      console.error('Error fetching class years:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const decades = Array.from(
    new Set(classYears.map(cy => Math.floor(cy.year / 10) * 10))
  ).sort((a, b) => b - a);

  return (
    <ModuleWrapper
      title="Alumni Timeline"
      icon={Clock}
    >
      <div className="space-y-6">
        {/* Timeline visualization */}
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <div className="flex gap-2">
            {classYears.slice(0, 20).map((cy) => (
              <button
                key={cy.year}
                onClick={() => setSelectedYear(selectedYear === cy.year ? null : cy.year)}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                  selectedYear === cy.year
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-accent border-border'
                }`}
              >
                <span className="text-lg font-bold">{cy.year}</span>
                <Badge variant="secondary" className="mt-1">{cy.count}</Badge>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Decades breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {decades.map((decade) => {
            const decadeAlumni = classYears
              .filter(cy => Math.floor(cy.year / 10) * 10 === decade)
              .reduce((sum, cy) => sum + cy.count, 0);
            
            return (
              <Card key={decade} className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{decade}s</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{decadeAlumni}</p>
                  <p className="text-sm text-muted-foreground">Alumni</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedYear && (
          <Card>
            <CardHeader>
              <CardTitle>Class of {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {classYears.find(cy => cy.year === selectedYear)?.count || 0} alumni from this class
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleWrapper>
  );
}

export default AlumniTimelineModule;
