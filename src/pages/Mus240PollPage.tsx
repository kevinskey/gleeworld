import React from 'react';
import { Mus240PollSystem } from '@/components/mus240/Mus240PollSystem';
import { BarChart } from 'lucide-react';

export const Mus240PollPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900">MUS 240 Polling System</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Interactive polls for music theory learning and assessment
          </p>
        </div>

        <Mus240PollSystem />
      </div>
    </div>
  );
};