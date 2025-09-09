import React from 'react';
import { AssignmentCreator } from '@/components/sight-singing/AssignmentCreator';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

const AssignmentCreatorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Assignment Creator
            </h1>
            <p className="text-muted-foreground">
              Create sight-singing assignments from your music library and distribute them to students
            </p>
          </div>
          <AssignmentCreator />
        </div>
      </div>
    </div>
  );
};

export default AssignmentCreatorPage;