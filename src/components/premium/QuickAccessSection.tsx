/**
 * QUICK ACCESS SECTION
 * 4-card grid with gradient icons matching Figma design
 */

import React from 'react';
import { BookOpen, Trophy, Users, Video, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAccessCard {
  id: string;
  title: string;
  description: string;
  stat: string;
  icon: React.ElementType;
  gradient: string;
  path: string;
}

const cards: QuickAccessCard[] = [
  {
    id: 'courses',
    title: 'My Courses',
    description: 'Continue your learning journey with personalized courses and tracks',
    stat: '12 ACTIVE COURSES',
    icon: BookOpen,
    gradient: 'from-orange-500 to-red-500',
    path: '/courses',
  },
  {
    id: 'achievements',
    title: 'Achievements',
    description: 'Track your progress and unlock badges as you master new skills',
    stat: '47 UNLOCKED',
    icon: Trophy,
    gradient: 'from-yellow-400 to-orange-500',
    path: '/achievements',
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Connect with fellow musicians, share insights, and grow together',
    stat: '2.5K MEMBERS',
    icon: Users,
    gradient: 'from-purple-500 to-pink-500',
    path: '/community',
  },
  {
    id: 'live-sessions',
    title: 'Live Sessions',
    description: 'Join live masterclasses and interactive workshops with experts',
    stat: '8 THIS WEEK',
    icon: Video,
    gradient: 'from-cyan-400 to-blue-500',
    path: '/live-sessions',
  },
];

export const QuickAccessSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="w-full bg-[#0A0A0A] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-orange-500 text-sm font-semibold tracking-wide">YOUR DASHBOARD</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Quick Access</h2>
          <p className="text-[#666666]">Everything you need at your fingertips</p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => navigate(card.path)}
              className="group bg-[#111111] rounded-2xl border border-[#1A1A1A] p-6 cursor-pointer hover:border-[#333333] transition-all"
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-7 h-7 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-orange-400 transition-colors">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-[#666666] text-sm mb-4 line-clamp-2">
                {card.description}
              </p>

              {/* Stat & Arrow */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1A1A1A]">
                <span className="text-[#888888] text-xs font-semibold tracking-wide">{card.stat}</span>
                <ArrowRight className="w-4 h-4 text-[#666666] group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
