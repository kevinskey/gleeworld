/**
 * PREMIUM HERO COMPONENT
 * Dark gradient hero with badge, headline, CTAs, and stats row
 */

import React from 'react';
import { Sparkles, ArrowRight, Users, BookOpen, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface StatItem {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const stats: StatItem[] = [
  { value: '50K+', label: 'Active Members', icon: Users, color: 'text-orange-500' },
  { value: '200+', label: 'Masterclasses', icon: BookOpen, color: 'text-yellow-400' },
  { value: '98%', label: 'Satisfaction', icon: Star, color: 'text-green-400' },
];

export const PremiumHero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative w-full bg-[#0A0A0A] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-cyan-500/5" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1A] border border-[#333333] mb-6">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-orange-500 text-sm font-semibold tracking-wide">NEW PREMIUM FEATURES</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Elevate Your
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Musical Journey
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[#888888] text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Access exclusive masterclasses, connect with fellow musicians, and unlock your full potential with GleeWorld's premium platform.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              size="lg"
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-8 shadow-lg shadow-orange-500/25"
            >
              UPGRADE TO PREMIUM
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/features')}
              className="bg-transparent border-[#333333] text-white hover:bg-[#1A1A1A] hover:border-[#444444] px-8"
            >
              EXPLORE FEATURES
            </Button>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className={`text-3xl md:text-4xl font-bold ${stat.color}`}>
                    {stat.value}
                  </span>
                </div>
                <p className="text-[#666666] text-sm uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
