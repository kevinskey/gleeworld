interface MusicStaffIconProps {
  className?: string;
  size?: number;
}

export const MusicStaffIcon = ({ className = "", size = 28 }: MusicStaffIconProps) => {
  const lineSpacing = size * 0.22; // 22% of icon size for even more spacing between lines
  const lineThickness = size * 0.09; // 9% of icon size for bolder lines
  const startY = size * 0.16; // Start 16% from top for better centering with increased spacing

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