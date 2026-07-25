import type { CourseTheme } from '@/lib/academy/courseTheme';
import { courseBackground } from '@/lib/academy/courseTheme';
import type { ReactNode } from 'react';

interface CourseIdentityBackgroundProps {
  theme: CourseTheme;
  children: ReactNode;
  className?: string;
}

// Universal atmospheric background for every academy class page.
// Generalizes the MUS 070 "deep-sea" look so it's driven by the course's
// theme palette. Three glow orbs at rest positions + a very subtle
// fractal-noise grain, all pointer-events:none so they never intercept
// user input. Orbs live in a sibling absolute layer (not wrapping the
// children) so children remain direct descendants — required so the
// caller can pass `flex` in `className` and have sidebar + main content
// lay out as flex siblings.
export function CourseIdentityBackground({
  theme,
  children,
  className,
}: CourseIdentityBackgroundProps) {
  return (
    <div
      className={`relative ${className ?? ''}`}
      style={{ background: courseBackground(theme) }}
    >
      {/* Decorative layer — absolute, pointer-events:none, z-0. Sits
          behind flex children which paint later in DOM order. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.orbs[0]} 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.orbs[1] ?? theme.orbs[0]} 0%, transparent 70%)` }}
        />
        <div
          className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.orbs[2] ?? theme.orbs[0]} 0%, transparent 70%)` }}
        />
        {/* Fractal-noise grain, ~3% opacity. Inline SVG (no network). */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>
      {children}
    </div>
  );
}
