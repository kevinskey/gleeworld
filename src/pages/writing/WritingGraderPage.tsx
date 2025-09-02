import React from 'react';
import { AIWritingGrader } from '@/components/writing/AIWritingGrader';

export default function WritingGraderPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">AI Writing Grader</h1>
          <p className="text-muted-foreground mt-2">
            Get instant AI-powered feedback and scoring for writing samples
          </p>
        </div>
        <AIWritingGrader />
      </div>
    </div>
  );
}