import { useState, useEffect, useCallback } from 'react';

interface UseScrollStickyOptions {
  threshold?: number;
  unstickThreshold?: number;
}

export const useScrollSticky = ({ 
  threshold = 100, 
  unstickThreshold = 150 
}: UseScrollStickyOptions = {}) => {
  const [isSticky, setIsSticky] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [stickyTriggerY, setStickyTriggerY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const direction = currentScrollY > lastScrollY ? 'down' : 'up';
    
    setScrollDirection(direction);

    // If scrolling down and past threshold, make sticky
    if (direction === 'down' && currentScrollY > threshold && !isSticky) {
      setIsSticky(true);
      setStickyTriggerY(currentScrollY);
    }
    
    // If scrolling up significantly from where it became sticky, unstick
    if (direction === 'up' && isSticky) {
      const scrolledUpFrom = stickyTriggerY - currentScrollY;
      if (scrolledUpFrom > unstickThreshold || currentScrollY <= threshold) {
        setIsSticky(false);
        setStickyTriggerY(0);
      }
    }

    setLastScrollY(currentScrollY);
  }, [lastScrollY, threshold, unstickThreshold, isSticky, stickyTriggerY]);

  useEffect(() => {
    let ticking = false;

    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [handleScroll]);

  return {
    isSticky,
    scrollDirection,
    currentScrollY: lastScrollY
  };
};