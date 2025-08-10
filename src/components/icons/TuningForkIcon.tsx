import React from 'react';

interface TuningForkIconProps {
  className?: string;
  size?: number;
}

// Simple tuning fork SVG icon (stroke-based). Matches currentColor.
export const TuningForkIcon: React.FC<TuningForkIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* prongs */}
      <path d="M7 3v6a5 5 0 0 0 10 0V3" />
      {/* handle */}
      <path d="M12 14v7" />
      {/* vibration waves (subtle) */}
      <path d="M4.5 5.5a4 4 0 0 0 0 5.7" />
      <path d="M19.5 5.5a4 4 0 0 1 0 5.7" />
    </svg>
  );
};
