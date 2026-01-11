/**
 * ScrollToTop Component
 * 
 * Automatically scrolls to the top of the page on route changes.
 * This ensures users always see the header when navigating to a new page.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
