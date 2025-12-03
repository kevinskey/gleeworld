import React from 'react';
import { GroupPollsPage } from '@/components/polls/GroupPollsPage';
import { BackNavigation } from '@/components/shared/BackNavigation';
import { BarChart } from 'lucide-react';

export const Mus240PollPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-800 to-amber-600 relative overflow-auto">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/5 pointer-events-none"></div>
      
      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-6">
          <BackNavigation fallbackPath="/dashboard" className="mb-3" />
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <BarChart className="h-5 w-5 text-amber-300" />
              <span className="text-lg font-bold text-white">Group Polls</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <GroupPollsPage />
      </div>
    </div>
  );
};
