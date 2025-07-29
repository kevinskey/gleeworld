import React from 'react';

export const TestLandingPage = () => {
  console.log('TestLandingPage: Component rendering');
  
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Test Landing Page
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          This is a simple test page to verify the app is working.
        </p>
        <div className="bg-blue-100 p-4 rounded-lg">
          <p className="text-blue-800">
            If you can see this, the basic routing and React rendering is working.
          </p>
        </div>
      </div>
    </div>
  );
};