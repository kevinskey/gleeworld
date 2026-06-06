import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Newspaper, FileText } from 'lucide-react';
import { PRManagerModule } from './PRManagerModule';
import { PressKitsModule } from './PressKitsModule';

/**
 * PR Hub — unified entry point for public relations tooling.
 *
 * Tabs:
 *   - Operations  — PR campaigns, marketing coordination, outreach
 *   - Press Kits  — downloadable press materials for media / partners
 *
 * Replaces 2 separate module entries: pr-manager + press-kits.
 */
export const PRHub = () => {
  const [tab, setTab] = useState('operations');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Public Relations</h2>
        <p className="text-sm text-muted-foreground">
          PR operations and downloadable press kits.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="operations" className="gap-1.5">
            <Newspaper className="h-4 w-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="press-kits" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Press Kits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="m-0">
          <PRManagerModule />
        </TabsContent>
        <TabsContent value="press-kits" className="m-0">
          <PressKitsModule />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PRHub;
