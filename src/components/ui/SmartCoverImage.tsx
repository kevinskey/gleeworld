import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SmartCoverImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

interface FocalPoint {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

/**
 * Analyzes an image to find its focal point based on contrast/brightness hotspots.
 * Uses a weighted approach favoring upper-center (faces typically appear there).
 */
const analyzeFocalPoint = (img: HTMLImageElement): FocalPoint => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return { x: 50, y: 50 };
    
    // Use a small canvas for performance
    const analysisSize = 50;
    canvas.width = analysisSize;
    canvas.height = analysisSize;
    
    ctx.drawImage(img, 0, 0, analysisSize, analysisSize);
    
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, analysisSize, analysisSize);
    } catch {
      // CORS issue - return center with slight top bias (common for portraits)
      return { x: 50, y: 40 };
    }
    
    const data = imageData.data;
    
    // Calculate weighted center of visual interest
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    
    // Calculate average brightness first
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);
    
    // Find areas with high contrast from average
    for (let y = 0; y < analysisSize; y++) {
      for (let x = 0; x < analysisSize; x++) {
        const i = (y * analysisSize + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate local brightness
        const brightness = (r + g + b) / 3;
        
        // Weight by contrast from average (interesting areas have high contrast)
        const contrast = Math.abs(brightness - avgBrightness);
        
        // Detect skin tones (common in photos of people)
        const isSkinTone = r > 60 && g > 40 && b > 20 && 
                          r > g && g > b && 
                          (r - g) < 100 && (g - b) < 100;
        
        // Weight factor: contrast + skin tone bonus + position bias (favor upper-center)
        let weight = contrast;
        
        if (isSkinTone) {
          weight *= 2.5; // Strong bonus for skin tones
        }
        
        // Slight bias toward upper third (where faces usually are)
        if (y < analysisSize / 3) {
          weight *= 1.3;
        }
        
        // Slight bias toward center horizontally
        const centerDistance = Math.abs(x - analysisSize / 2) / (analysisSize / 2);
        weight *= (1 - centerDistance * 0.3);
        
        totalWeight += weight;
        weightedX += x * weight;
        weightedY += y * weight;
      }
    }
    
    if (totalWeight === 0) {
      return { x: 50, y: 40 }; // Default with slight top bias
    }
    
    // Convert to percentage
    const focalX = (weightedX / totalWeight / analysisSize) * 100;
    const focalY = (weightedY / totalWeight / analysisSize) * 100;
    
    // Clamp to reasonable range (don't go too extreme)
    return {
      x: Math.max(20, Math.min(80, focalX)),
      y: Math.max(15, Math.min(85, focalY))
    };
  } catch (error) {
    console.warn('Focal point analysis failed:', error);
    return { x: 50, y: 40 };
  }
};

export const SmartCoverImage: React.FC<SmartCoverImageProps> = ({
  src,
  alt,
  className,
  fallbackSrc,
  onError
}) => {
  const [focalPoint, setFocalPoint] = useState<FocalPoint>({ x: 50, y: 40 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const analysisRef = useRef<HTMLImageElement | null>(null);
  
  const analyzeImage = useCallback((imageUrl: string) => {
    // Create a separate image for analysis to avoid CORS issues
    const analysisImg = new Image();
    analysisImg.crossOrigin = 'anonymous';
    analysisRef.current = analysisImg;
    
    analysisImg.onload = () => {
      const focal = analyzeFocalPoint(analysisImg);
      setFocalPoint(focal);
    };
    
    analysisImg.onerror = () => {
      // If CORS fails, use default with top bias
      setFocalPoint({ x: 50, y: 40 });
    };
    
    analysisImg.src = imageUrl;
  }, []);
  
  useEffect(() => {
    setImageSrc(src);
    setIsLoaded(false);
    analyzeImage(src);
    
    return () => {
      if (analysisRef.current) {
        analysisRef.current.onload = null;
        analysisRef.current.onerror = null;
      }
    };
  }, [src, analyzeImage]);
  
  const handleLoad = () => {
    setIsLoaded(true);
  };
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      analyzeImage(fallbackSrc);
    }
    onError?.(e);
  };
  
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={cn(
        'object-cover transition-all duration-500',
        !isLoaded && 'opacity-0',
        isLoaded && 'opacity-100',
        className
      )}
      style={{
        objectPosition: `${focalPoint.x}% ${focalPoint.y}%`
      }}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};

export default SmartCoverImage;
