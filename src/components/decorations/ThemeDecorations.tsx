/**
 * THEME DECORATIONS COMPONENT
 * 
 * Renders optional floating decorative elements based on the current theme.
 * Includes music notes, equalizer bars, and watermark effects.
 */

import React from 'react';
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { Music2 } from 'lucide-react';

export function ThemeDecorations() {
  const { decorationType, hasAnimations } = useThemeStyles();

  if (!decorationType) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {decorationType === 'music-notes' && <MusicNotesDecoration animate={hasAnimations} />}
      {decorationType === 'equalizer' && <EqualizerDecoration animate={hasAnimations} />}
      {decorationType === 'watermark' && <WatermarkDecoration />}
    </div>
  );
}

function MusicNotesDecoration({ animate }: { animate: boolean }) {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className={`absolute ${animate ? 'animate-float' : ''}`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.5}s`,
            opacity: 0.1,
          }}
        >
          <Music2
            className="text-primary"
            size={32 + Math.random() * 32}
            style={{
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}
    </>
  );
}

function EqualizerDecoration({ animate }: { animate: boolean }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-32 px-4 opacity-20">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className={`w-2 bg-gradient-to-t from-primary to-accent rounded-t ${
            animate ? 'animate-equalizer' : ''
          }`}
          style={{
            height: `${30 + Math.random() * 70}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

function WatermarkDecoration() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center opacity-5"
      style={{
        fontSize: '20vw',
        fontWeight: 'bold',
        color: 'currentColor',
        transform: 'rotate(-45deg)',
        userSelect: 'none',
      }}
    >
      SPELMAN
    </div>
  );
}

// Add these animations to your index.css:
/*
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

@keyframes equalizer {
  0%, 100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-equalizer {
  animation: equalizer 0.8s ease-in-out infinite;
}
*/
