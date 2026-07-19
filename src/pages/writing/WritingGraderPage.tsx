import React from 'react';
import { AIWritingGrader } from '@/components/writing/AIWritingGrader';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

export default function WritingGraderPage() {
  return (
    <DashboardPageShell
      title="AI Writing Grader"
      subtitle="Get instant AI-powered feedback and scoring for writing samples"
    >
      <AIWritingGrader />
    </DashboardPageShell>
  );
}