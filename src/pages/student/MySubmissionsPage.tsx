import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { MySubmissionsComprehensive } from '@/components/student/MySubmissionsComprehensive';

const MySubmissionsPage: React.FC = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Grades and Submissions</h1>
          <p className="text-muted-foreground">
            View your overall course grade, all assignments, group work, and upcoming deadlines.
          </p>
        </div>
        <MySubmissionsComprehensive />
      </div>
    </UniversalLayout>
  );
};

export default MySubmissionsPage;