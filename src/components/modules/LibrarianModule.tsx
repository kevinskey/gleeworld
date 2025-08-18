import React from 'react';
import { BookOpen } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ModuleProps } from '@/types/unified-modules';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const LibrarianModule = ({ user, isFullPage = false }: ModuleProps) => {
  const navigate = useNavigate();
  
  return (
    <ModuleWrapper
      id="librarian"
      title="Music Librarian"
      description="Manage sheet music collection, PDFs, and hard copy scores"
      icon={BookOpen}
      iconColor="purple"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
      headerActions={
        <Button size="sm" onClick={() => navigate('/librarian-dashboard')} aria-label="Open Librarian Dashboard">
          Open Dashboard
        </Button>
      }
    >
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <p className="text-sm text-muted-foreground">
          Access the full librarian dashboard to manage PDFs, hard copy scores, and inventory.
        </p>
        <Button onClick={() => navigate('/librarian-dashboard')} size="sm" aria-label="Open Librarian Dashboard">
          Open Dashboard
        </Button>
      </div>
    </ModuleWrapper>
  );
};