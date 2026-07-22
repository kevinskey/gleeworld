import React from 'react';
import { AIWritingGrader } from '@/components/writing/AIWritingGrader';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function WritingGraderPage() {
  return (
    <UniversalLayout>
      <DashboardPageShell
        title="AI Writing Grader"
        subtitle="Get instant AI-powered feedback and scoring for writing samples"
      >
        <AIWritingGrader />
      </DashboardPageShell>
    </UniversalLayout>
  );
}