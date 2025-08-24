import React from 'react';
import { LibrarianDashboard } from '@/components/librarian/LibrarianDashboard';

const LibrarianDashboardPage = () => {
  console.log('🔍 LibrarianDashboardPage rendering');
  
  try {
    return <LibrarianDashboard />;
  } catch (error) {
    console.error('🚨 LibrarianDashboardPage error:', error);
    return (
      <div className="p-4">
        <h1>Error loading Librarian Dashboard</h1>
        <p>Please check the console for details.</p>
      </div>
    );
  }
};

export default LibrarianDashboardPage;