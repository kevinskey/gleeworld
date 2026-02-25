/**
 * ScrollToTop Component
 * 
 * Automatically scrolls to the top of the page on route changes.
 * This ensures users always see the header when navigating to a new page.
 */

import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, search, key } = useLocation();

  // Use useLayoutEffect to scroll before the browser paints
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search, key]);

  // Fallback with useEffect for any edge cases
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(timer);
  }, [pathname, search, key]);

  return null;
};
