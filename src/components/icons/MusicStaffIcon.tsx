interface MusicStaffIconProps {
  className?: string;
  size?: number;
}

export const MusicStaffIcon = ({ className = "", size = 28 }: MusicStaffIconProps) => {
  const lineSpacing = size * 0.18; // 18% of icon size for more spacing between lines
  const lineThickness = size * 0.06; // 6% of icon size for slightly thinner lines
  const startY = size * 0.18; // Start 18% from top for better centering

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`} 
      className={`transition-all duration-200 ${className}`}
      aria-hidden="true"
    >
      {[...Array(5)].map((_, i) => (
        <rect
          key={i}
          x={size * 0.08}
          y={startY + (i * lineSpacing)}
          width={size * 0.84}
          height={lineThickness}
          fill="currentColor"
          rx={lineThickness / 2}
          className="transition-all duration-200 group-hover:opacity-80"
          style={{
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </svg>
  );
};