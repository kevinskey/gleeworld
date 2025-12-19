import React from 'react';

interface SM58MicIconProps {
  className?: string;
}

export const SM58MicIcon: React.FC<SM58MicIconProps> = ({ className = "h-6 w-6" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Mic grille/ball top */}
      <ellipse cx="12" cy="6" rx="5" ry="5.5" />
      {/* Grille lines */}
      <path d="M8.5 4.5c1.5 1 5.5 1 7 0" />
      <path d="M8 6.5c1.5 1 6 1 8 0" />
      <path d="M8.5 8.5c1.5 1 5.5 1 7 0" />
      {/* Body/handle */}
      <rect x="10" y="11" width="4" height="11" rx="1" />
      {/* Ring detail */}
      <line x1="10" y1="13" x2="14" y2="13" />
    </svg>
  );
};
