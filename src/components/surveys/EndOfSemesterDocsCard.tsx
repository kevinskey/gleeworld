import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { TreeLightingSurvey } from './TreeLightingSurvey';
import { CollapsibleMemberExitInterview } from './CollapsibleMemberExitInterview';
import { CollapsibleExecBoardExitInterview } from './CollapsibleExecBoardExitInterview';

export const EndOfSemesterDocsCard = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/80 backdrop-blur-sm border-2 border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-lg">End of Semester Docs</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Surveys and exit interviews for Fall 2025
                  </CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <TreeLightingSurvey />
            <CollapsibleMemberExitInterview />
            <CollapsibleExecBoardExitInterview />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
