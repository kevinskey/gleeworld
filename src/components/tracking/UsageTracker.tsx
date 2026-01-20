import { useUsageTracking } from '@/hooks/useUsageTracking';

/**
 * Component that initializes usage tracking for the entire app.
 * Should be placed inside the Router context but wrapping routes.
 */
export const UsageTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize tracking - this will track page views automatically
  useUsageTracking();
  
  return <>{children}</>;
};
