import React from 'react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const EventPlannerModule = ({ user, isFullPage }: ModuleProps) => {
  const navigate = useNavigate();

  return (
    <ModuleWrapper
      id="event-planner"
      title="Event Planner"
      description="Plan rehearsals and concerts with scheduling and budgets"
      icon={CalendarIcon}
      iconColor="blue"
      fullPage={!!isFullPage}
      defaultOpen={!!isFullPage}
      headerActions={
        <Button size="sm" onClick={() => navigate('/event-planner')} aria-label="Open Event Planner">
          Open
        </Button>
      }
    >
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <p className="text-sm text-muted-foreground">Open the full Event Planner to create and manage events.</p>
        <Button onClick={() => navigate('/event-planner')} size="sm" aria-label="Open Event Planner">
          Open
        </Button>
      </div>
    </ModuleWrapper>
  );
};
