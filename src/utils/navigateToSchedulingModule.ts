// Utility to navigate directly to the scheduling module in admin dashboard
export const navigateToSchedulingModule = () => {
  // This would be used to programmatically navigate to the scheduling module
  // For now, we'll create a simple function that can be called from components
  console.log('Navigating to Scheduling Module in Admin Dashboard Communications');
  
  // In a real implementation, this could:
  // 1. Update URL params to deep link to the module
  // 2. Set state in a global context
  // 3. Trigger navigation events
  
  return {
    categoryId: 'communications',
    moduleId: 'scheduling-module'
  };
};