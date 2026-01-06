/**
 * Utility functions for contract name formatting
 * Single source of truth for contract display logic
 */

/**
 * Strips the "Tour Contract - " or "TC - " prefix from contract titles for display
 */
export const formatContractDisplayName = (title: string): string => {
  return title.replace(/^(Tour Contract|TC)\s*-\s*/i, '');
};
