import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Headphones, Wand2, ListChecks, BarChart3 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { SightSingingModule } from './SightSingingModule';
import { SightReadingGeneratorModule } from './SightReadingGeneratorModule';
import { MemberSightReadingModule } from './MemberSightReadingModule';
import { TheoryPollModule } from './TheoryPollModule';

/**
 * Sight Reading Hub — unified entry point for all sight reading / theory tools.
 *
 * Tabs (filtered by role):
 *   - Practice (members + admins)     — MemberSightReadingModule
 *   - Generator (admins)              — SightReadingGeneratorModule
 *   - Management (admins)             — SightSingingModule (progress tracking)
 *   - Theory Polls (admins)           — TheoryPollModule
 *
 * Replaces 4 separate module entries (sight-singing-management,
 * sight-reading-generator, member-sight-reading-studio, theory-poll).
 */
export const SightReadingHub = () => {
  const [tab, setTab] = useState('practice');
  const { isAdmin } = useUserRole();
  const showAdminTabs = isAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Sight Reading</h2>
        <p className="text-sm text-muted-foreground">
          Practice, generate exercises, track progress, and run theory polls.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="practice" className="gap-1.5">
            <Headphones className="h-4 w-4" />
            Practice
          </TabsTrigger>
          {showAdminTabs && (
            <>
              <TabsTrigger value="generator" className="gap-1.5">
                <Wand2 className="h-4 w-4" />
                Generator
              </TabsTrigger>
              <TabsTrigger value="management" className="gap-1.5">
                <ListChecks className="h-4 w-4" />
                Management
              </TabsTrigger>
              <TabsTrigger value="theory" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Theory Polls
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="practice" className="m-0">
          <MemberSightReadingModule />
        </TabsContent>
        {showAdminTabs && (
          <>
            <TabsContent value="generator" className="m-0">
              <SightReadingGeneratorModule />
            </TabsContent>
            <TabsContent value="management" className="m-0">
              <SightSingingModule />
            </TabsContent>
            <TabsContent value="theory" className="m-0">
              <TheoryPollModule />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default SightReadingHub;
