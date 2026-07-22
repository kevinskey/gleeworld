import React from 'react';
import { GroupPollsPage } from '@/components/polls/GroupPollsPage';
import { BarChart } from 'lucide-react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export const Mus240PollPage = () => {
  return (
    <UniversalLayout containerized={false}>
      <div className="bg-gradient-to-br from-orange-800 to-amber-600 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/5 pointer-events-none"></div>
        <div className="relative z-10 p-4">
          <div className="max-w-4xl mx-auto mb-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <BarChart className="h-5 w-5 text-amber-300" />
                <span className="text-lg font-bold text-white">Group Polls</span>
              </div>
            </div>
          </div>
          <GroupPollsPage />
        </div>
      </div>
    </UniversalLayout>
  );
};
