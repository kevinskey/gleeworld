import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { MySubmissions } from '@/components/student/MySubmissions';

const MySubmissionsPage: React.FC = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Journal Submissions</h1>
          <p className="text-muted-foreground">
            View all your journal entries, grades, and feedback in one place.
          </p>
        </div>
        <MySubmissions />
      </div>
    </UniversalLayout>
  );
};

export default MySubmissionsPage;