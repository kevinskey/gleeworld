import React from 'react';

interface SM58MicIconProps {
  className?: string;
}

export const SM58MicIcon: React.FC<SM58MicIconProps> = ({ className = "h-6 w-6" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
      className={className}
    >
      {/* Sound waves */}
      <path d="M6 2c0 0 2 1.5 6 1.5s6-1.5 6-1.5" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 4.5c0 0 3 2 8 2s8-2 8-2" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 7c0 0 4 2.5 10 2.5s10-2.5 10-2.5" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Microphone head */}
      <ellipse cx="12" cy="13" rx="4" ry="5" />
      
      {/* Yoke/bracket */}
      <path d="M8 13c0 0 -1.5 0.5 -1.5 3.5c0 1 0.5 1.5 1.5 1.5h8c1 0 1.5-0.5 1.5-1.5c0-3-1.5-3.5-1.5-3.5" fill="none" strokeWidth="1.2" />
      
      {/* Stand */}
      <rect x="11" y="18" width="2" height="3" rx="0.5" />
      
      {/* Base */}
      <path d="M8 21.5c0-0.5 0.5-0.5 1-0.5h6c0.5 0 1 0 1 0.5v1c0 0.5-0.5 0.5-1 0.5h-6c-0.5 0-1 0-1-0.5v-1z" />
    </svg>
  );
};
