/**
 * ScrollToTop Component
 * 
 * Automatically scrolls to the top of the page on route changes.
 * This ensures users always see the header when navigating to a new page.
 */

import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname, key } = useLocation();

  // Use useLayoutEffect to scroll before the browser paints
  // This prevents any flash of content at the wrong scroll position
  useLayoutEffect(() => {
    // Scroll to top immediately on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, key]);

  // Fallback with useEffect for any edge cases
  useEffect(() => {
    // Ensure scroll is at top after render
    const timer = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(timer);
  }, [pathname, key]);

  return null;
};
