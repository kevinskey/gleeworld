interface MusicStaffIconProps {
  className?: string;
  size?: number;
}

export const MusicStaffIcon = ({ className = "", size = 24 }: MusicStaffIconProps) => {
  const lineSpacing = size * 0.15; // 15% of icon size for spacing between lines
  const lineThickness = size * 0.08; // 8% of icon size for line thickness
  const startY = size * 0.2; // Start 20% from top

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
          x={size * 0.1}
          y={startY + (i * lineSpacing)}
          width={size * 0.8}
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