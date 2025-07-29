import React, { useState } from 'react';
import { TourList } from '@/components/tour-planner/TourList';
import { TourEditor } from '@/components/tour-planner/TourEditor';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const TourPlanner: React.FC = () => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [isCreatingTour, setIsCreatingTour] = useState(false);

  const handleCreateNew = () => {
    setSelectedTourId(null);
    setIsCreatingTour(true);
  };

  const handleSelectTour = (tourId: string) => {
    setSelectedTourId(tourId);
    setIsCreatingTour(false);
  };

  const handleBackToList = () => {
    setSelectedTourId(null);
    setIsCreatingTour(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Tour Planner</h1>
            <p className="text-muted-foreground">
              Plan and manage multi-city tours for the Spelman College Glee Club
            </p>
          </div>
          {!selectedTourId && !isCreatingTour && (
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Tour
            </Button>
          )}
        </div>

        {selectedTourId || isCreatingTour ? (
          <TourEditor
            tourId={selectedTourId}
            onBack={handleBackToList}
            isCreating={isCreatingTour}
          />
        ) : (
          <TourList onSelectTour={handleSelectTour} />
        )}
      </div>
    </div>
  );
};

export default TourPlanner;