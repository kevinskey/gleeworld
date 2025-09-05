import React from 'react';
import { Mus240PollSystem } from '@/components/mus240/Mus240PollSystem';
import { BarChart } from 'lucide-react';

export const Mus240PollPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-800 to-amber-600 relative">
      {/* Gradient overlay for consistency with landing page */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/5"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header with glass morphism */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <BarChart className="h-8 w-8 text-amber-300" />
            <span className="text-3xl font-bold text-white">MUS 240 Polling System</span>
          </div>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Interactive polls for music theory learning and assessment
          </p>
        </div>

        <Mus240PollSystem />
      </div>
    </div>
  );
};