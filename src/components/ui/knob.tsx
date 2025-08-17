import React, { useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const Knob: React.FC<KnobProps> = ({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  size = 'md',
  label,
  className,
  disabled = false
}) => {
  const isDragging = useRef(false);
  const lastY = useRef(0);
  const knobRef = useRef<HTMLDivElement>(null);
  const currentValue = useRef(value);

  // Keep current value in sync
  useEffect(() => {
    currentValue.current = value;
  }, [value]);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Calculate rotation angle (-135deg to +135deg for 270 degree range)
  const percentage = (value - min) / (max - min);
  const rotation = -135 + (percentage * 270);

  const updateValue = useCallback((deltaY: number) => {
    // Sensitivity: adjust this value to change how fast the knob responds
    const sensitivity = (max - min) / 100;
    const deltaValue = deltaY * sensitivity;
    
    const newValue = Math.min(max, Math.max(min, currentValue.current + deltaValue));
    const steppedValue = Math.round(newValue / step) * step;
    
    if (steppedValue !== currentValue.current) {
      currentValue.current = steppedValue;
      onValueChange(steppedValue);
    }
  }, [min, max, step, onValueChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const deltaY = lastY.current - e.clientY; // Inverted for natural feel
    lastY.current = e.clientY;
    updateValue(deltaY);
  }, [updateValue]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    
    const deltaY = lastY.current - e.touches[0].clientY;
    lastY.current = e.touches[0].clientY;
    updateValue(deltaY);
  }, [updateValue]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('touchmove', handleTouchMove, { passive: false } as any);
    document.removeEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    isDragging.current = true;
    lastY.current = e.clientY;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, handleMouseMove, handleMouseUp]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    isDragging.current = true;
    lastY.current = e.touches[0].clientY;
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [disabled, handleTouchMove, handleTouchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isDragging.current) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {label && (
        <div className={cn("font-medium text-center", labelSizes[size])}>
          {value}
        </div>
      )}
      
      <div
        ref={knobRef}
        className={cn(
          "relative rounded-full cursor-pointer select-none",
          "bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/40",
          "border-2 border-muted-foreground/30",
          "shadow-lg hover:shadow-xl transition-shadow",
          "active:scale-95 transition-transform",
          sizeClasses[size],
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          background: `
            radial-gradient(circle at 30% 30%, hsl(var(--muted-foreground) / 0.4), hsl(var(--muted-foreground) / 0.1)),
            conic-gradient(from 0deg, hsl(var(--muted-foreground) / 0.3), hsl(var(--muted-foreground) / 0.1), hsl(var(--muted-foreground) / 0.3))
          `
        }}
      >
        {/* Center dot */}
        <div className="absolute inset-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-foreground rounded-full" />
        
        {/* Pointer line */}
        <div
          className="absolute inset-0 flex items-start justify-center pt-1"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="w-0.5 h-4 bg-primary rounded-full shadow-sm" />
        </div>
        
        {/* Tick marks */}
        <div className="absolute inset-0">
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
            const tickRotation = -135 + (tick * 270);
            return (
              <div
                key={i}
                className="absolute inset-0 flex items-start justify-center pt-0.5"
                style={{ transform: `rotate(${tickRotation}deg)` }}
              >
                <div className={cn(
                  "bg-muted-foreground rounded-full",
                  i === 0 || i === 4 ? "w-0.5 h-2" : "w-0.5 h-1"
                )} />
              </div>
            );
          })}
        </div>
      </div>
      
      {label && (
        <div className={cn("text-muted-foreground text-center", labelSizes[size])}>
          {label}
        </div>
      )}
    </div>
  );
};