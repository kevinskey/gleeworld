import React from 'react';
import { Mus240PollSystem } from '@/components/mus240/Mus240PollSystem';
import { BackNavigation } from '@/components/shared/BackNavigation';
import { BarChart } from 'lucide-react';

export const Mus240PollPage = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-orange-800 to-amber-600 relative overflow-hidden flex flex-col">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/5"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Compact Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <BackNavigation fallbackPath="/dashboard" className="mb-3" />
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <BarChart className="h-5 w-5 text-amber-300" />
              <span className="text-lg font-bold text-white">MUS 240 Polling</span>
            </div>
          </div>
        </div>

        {/* Main Content Area - Uses remaining viewport */}
        <div className="flex-1 overflow-hidden px-4 pb-4">
          <Mus240PollSystem />
        </div>
      </div>
    </div>
  );
};