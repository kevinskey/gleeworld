
// Simple wrapper hook for basic unified modules access
import { UNIFIED_MODULES } from '@/config/unified-modules';

export const useUnifiedModulesSimple = () => {
  return {
    modules: UNIFIED_MODULES.filter(m => m.isActive !== false),
    loading: false,
    error: null
  };
};
