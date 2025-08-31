import React from 'react';

export const Mus240GradesPage: React.FC = () => {
  console.log('Mus240GradesPage - Component rendering!');
  
  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen bg-background text-foreground">
      <h1 className="text-3xl font-bold">MUS 240 - Grades & Progress</h1>
      <p className="text-muted-foreground">Track your performance and progress in Music Listening</p>
      <div className="bg-card p-6 rounded-lg border">
        <p>Grades page is working! This is a test render.</p>
      </div>
    </div>
  );
};